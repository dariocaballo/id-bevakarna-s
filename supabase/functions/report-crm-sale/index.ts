import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
const pool = databaseUrl ? new Pool(databaseUrl, 2, true) : null;

let schemaReady = false;
async function ensureSchema(client: any) {
  if (schemaReady) return;
  await client.queryObject`
    ALTER TABLE public.sales
      ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS crm_contract_id uuid NULL,
      ADD COLUMN IF NOT EXISTS customer_id uuid NULL,
      ADD COLUMN IF NOT EXISTS order_id uuid NULL,
      ADD COLUMN IF NOT EXISTS product_name text NULL,
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS crm_status text NULL,
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS removed_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS removed_reason text NULL,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `;
  // Drop legacy unique index if present (it didn't scope to CRM rows)
  await client.queryObject`DROP INDEX IF EXISTS public.sales_crm_contract_id_unique`;
  await client.queryObject`
    CREATE UNIQUE INDEX IF NOT EXISTS sales_crm_contract_id_unique
      ON public.sales (crm_contract_id)
      WHERE crm_contract_id IS NOT NULL AND source = 'crm'
  `;
  await client.queryObject`
    CREATE UNIQUE INDEX IF NOT EXISTS sales_crm_order_id_unique
      ON public.sales (order_id)
      WHERE order_id IS NOT NULL AND source = 'crm' AND crm_contract_id IS NULL
  `;
  schemaReady = true;
}

const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Seller alias mapping: email or original name → dashboard display name
type Alias = { emails?: string[]; names?: string[]; display: string };
const SELLER_ALIASES: Alias[] = [
  { emails: ["info@maxoenergy.se"], names: ["mashal norzai", "mashal"], display: "Mashal" },
  { emails: ["tomasnordh5238@gmail.com"], names: ["tomas nordh", "tomas"], display: "Tomas" },
  { emails: ["info@idbevakarna.se"], names: ["robin pettersson", "robin"], display: "Robin" },
];

function resolveDisplayName(rawName: string, rawEmail: string | null): { display: string; matchedBy: string } {
  const email = (rawEmail || "").trim().toLowerCase();
  const name = (rawName || "").trim().toLowerCase();
  for (const a of SELLER_ALIASES) {
    if (email && a.emails?.some((e) => e.toLowerCase() === email)) {
      return { display: a.display, matchedBy: "alias_email" };
    }
  }
  for (const a of SELLER_ALIASES) {
    if (name && a.names?.some((n) => n.toLowerCase() === name)) {
      return { display: a.display, matchedBy: "alias_name" };
    }
  }
  // No alias: use first name from raw seller_name (or raw value)
  const first = (rawName || "").trim().split(/\s+/)[0] || rawName.trim();
  return { display: first, matchedBy: "first_name" };
}

const REMOVE_STATUSES = new Set(
  [
    "ånger", "anger", "annullerad", "avbruten", "borttagen",
    "ej signerad", "ej_signerad", "not_signed", "cancelled", "canceled",
    "removed", "withdrawn", "regret", "inaktiv", "inactive",
  ].map((s) => s.toLowerCase())
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Endast POST stöds" }, 405);

  const expectedKey = Deno.env.get("CRM_DASHBOARD_API_KEY");
  const providedKey = req.headers.get("x-api-key");
  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!pool) return json({ error: "Databasanslutning saknas" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Ogiltig JSON" }, 400); }

  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "crm";
  const crmContractId = body.crm_contract_id ?? null;
  const orderId = body.order_id ?? null;
  const customerId = body.customer_id ?? null;
  const sellerNameRaw = typeof body.seller_name === "string" ? body.seller_name.trim() : "";
  const sellerEmailRaw = typeof body.seller_email === "string" ? body.seller_email.trim() : "";
  const productName = typeof body.product_name === "string" ? body.product_name : null;
  const crmStatus = typeof body.crm_status === "string" ? body.crm_status : null;
  const metadataIn = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
  const removedReasonIn = typeof body.removed_reason === "string" ? body.removed_reason : null;
  const crmUserName = typeof body.crm_user_name === "string" ? body.crm_user_name : null;
  const crmUserEmail = typeof body.crm_user_email === "string" ? body.crm_user_email : null;

  let action: "upsert" | "remove" | "sync" =
    body.action === "remove" ? "remove" : body.action === "sync" ? "sync" : "upsert";

  // If status indicates removal, force remove
  if (crmStatus && REMOVE_STATUSES.has(crmStatus.trim().toLowerCase())) {
    action = "remove";
  }

  // Validate UUIDs
  if (crmContractId !== null && !isUuid(crmContractId)) return json({ error: "crm_contract_id måste vara en uuid" }, 400);
  if (orderId !== null && !isUuid(orderId)) return json({ error: "order_id måste vara en uuid" }, 400);
  if (customerId !== null && !isUuid(customerId)) return json({ error: "customer_id måste vara en uuid" }, 400);
  if (!crmContractId && !orderId) return json({ error: "crm_contract_id eller order_id krävs" }, 400);

  const client = await pool.connect();
  try {
    await ensureSchema(client);

    // Find existing CRM row
    const findExisting = async () => {
      if (crmContractId) {
        const r = await client.queryObject<{ id: string }>`
          SELECT id FROM public.sales
          WHERE source = 'crm' AND crm_contract_id = ${crmContractId}
          LIMIT 1
        `;
        if (r.rows[0]) return r.rows[0].id;
      }
      if (orderId) {
        const r = await client.queryObject<{ id: string }>`
          SELECT id FROM public.sales
          WHERE source = 'crm' AND order_id = ${orderId}
          LIMIT 1
        `;
        if (r.rows[0]) return r.rows[0].id;
      }
      return null;
    };

    // ============ REMOVE ============
    if (action === "remove") {
      const existingId = await findExisting();
      if (!existingId) {
        return json({ success: true, action: "remove", active: false, not_found: true });
      }
      const reason = removedReasonIn || crmStatus || "removed";
      await client.queryObject`
        UPDATE public.sales
        SET is_active = false,
            removed_at = now(),
            removed_reason = ${reason},
            crm_status = COALESCE(${crmStatus}, crm_status),
            updated_at = now()
        WHERE id = ${existingId}
      `;
      return json({ success: true, action: "remove", active: false, sale_id: existingId });
    }

    // ============ UPSERT / SYNC ============
    const amount = Number(body.amount);
    if (!sellerNameRaw && !sellerEmailRaw) return json({ error: "seller_name eller seller_email krävs" }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "amount måste vara ett positivt nummer" }, 400);

    const { display, matchedBy } = resolveDisplayName(sellerNameRaw, sellerEmailRaw);

    // Resolve / create seller (case-insensitive on display name)
    let sellerId: string | null = null;
    let resolvedName = display;
    const sellerRows = await client.queryObject<{ id: string; name: string }>`
      SELECT id, name FROM public.sellers WHERE lower(name) = lower(${display}) LIMIT 1
    `;
    if (sellerRows.rows[0]) {
      sellerId = sellerRows.rows[0].id;
      resolvedName = sellerRows.rows[0].name;
    } else {
      const created = await client.queryObject<{ id: string; name: string }>`
        INSERT INTO public.sellers (name) VALUES (${display}) RETURNING id, name
      `;
      sellerId = created.rows[0].id;
      resolvedName = created.rows[0].name;
    }

    const metadata = {
      ...metadataIn,
      original_seller_name: sellerNameRaw || null,
      original_seller_email: sellerEmailRaw || null,
      matched_by: matchedBy,
      crm_user_name: crmUserName,
      crm_user_email: crmUserEmail,
    };

    const existingId = await findExisting();
    if (existingId) {
      const updated = await client.queryObject<{ id: string }>`
        UPDATE public.sales
        SET seller_name = ${resolvedName},
            seller_id = ${sellerId},
            amount_tb = ${amount},
            source = ${source},
            crm_contract_id = ${crmContractId},
            order_id = ${orderId},
            customer_id = ${customerId},
            product_name = ${productName},
            crm_status = ${crmStatus},
            metadata = ${JSON.stringify(metadata)}::jsonb,
            is_active = true,
            removed_at = NULL,
            removed_reason = NULL,
            updated_at = now()
        WHERE id = ${existingId}
        RETURNING id
      `;
      return json({ success: true, action, active: true, sale_id: updated.rows[0].id, duplicate: true });
    }

    try {
      const inserted = await client.queryObject<{ id: string }>`
        INSERT INTO public.sales
          (seller_name, seller_id, amount_tb, timestamp, source, crm_contract_id, customer_id, order_id, product_name, metadata, crm_status, is_active)
        VALUES
          (${resolvedName}, ${sellerId}, ${amount}, now(), ${source}, ${crmContractId}, ${customerId}, ${orderId}, ${productName}, ${JSON.stringify(metadata)}::jsonb, ${crmStatus}, true)
        RETURNING id
      `;
      return json({ success: true, action, active: true, sale_id: inserted.rows[0].id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("sales_crm_contract_id_unique") || msg.includes("sales_crm_order_id_unique")) {
        const existing = await findExisting();
        if (existing) {
          await client.queryObject`
            UPDATE public.sales
            SET seller_name = ${resolvedName}, seller_id = ${sellerId}, amount_tb = ${amount},
                source = ${source}, crm_contract_id = ${crmContractId}, order_id = ${orderId},
                customer_id = ${customerId}, product_name = ${productName}, crm_status = ${crmStatus},
                metadata = ${JSON.stringify(metadata)}::jsonb,
                is_active = true, removed_at = NULL, removed_reason = NULL, updated_at = now()
            WHERE id = ${existing}
          `;
          return json({ success: true, action, active: true, sale_id: existing, duplicate: true });
        }
      }
      throw e;
    }
  } catch (error) {
    console.error("report-crm-sale error", error);
    return json({ error: error instanceof Error ? error.message : "Serverfel" }, 500);
  } finally {
    client.release();
  }
});
