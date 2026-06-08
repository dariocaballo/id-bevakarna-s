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
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  `;
  await client.queryObject`
    CREATE UNIQUE INDEX IF NOT EXISTS sales_crm_contract_id_unique
      ON public.sales (crm_contract_id) WHERE crm_contract_id IS NOT NULL
  `;
  schemaReady = true;
}

const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

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
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig JSON" }, 400);
  }

  const sellerName = typeof body.seller_name === "string" ? body.seller_name.trim() : "";
  const amount = Number(body.amount);
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "crm";
  const crmContractId = body.crm_contract_id ?? null;
  const orderId = body.order_id ?? null;
  const customerId = body.customer_id ?? null;
  const productName = typeof body.product_name === "string" ? body.product_name : null;
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

  if (!sellerName) return json({ error: "seller_name krävs" }, 400);
  if (!Number.isFinite(amount) || amount <= 0) return json({ error: "amount måste vara ett positivt nummer" }, 400);
  if (crmContractId !== null && !isUuid(crmContractId)) return json({ error: "crm_contract_id måste vara en uuid" }, 400);
  if (orderId !== null && !isUuid(orderId)) return json({ error: "order_id måste vara en uuid" }, 400);
  if (customerId !== null && !isUuid(customerId)) return json({ error: "customer_id måste vara en uuid" }, 400);
  if (source === "crm" && !crmContractId) return json({ error: "crm_contract_id krävs för CRM-rapportering" }, 400);

  const client = await pool.connect();
  try {
    await ensureSchema(client);

    // Duplicate check
    if (crmContractId) {
      const existing = await client.queryObject<{ id: string }>`
        SELECT id FROM public.sales WHERE crm_contract_id = ${crmContractId} LIMIT 1
      `;
      if (existing.rows.length > 0) {
        return json({ success: true, duplicate: true, message: "Sale already reported", sale_id: existing.rows[0].id });
      }
    }

    // Resolve seller (case-insensitive); create if missing
    let sellerId: string | null = null;
    const sellerRows = await client.queryObject<{ id: string; name: string }>`
      SELECT id, name FROM public.sellers WHERE lower(name) = lower(${sellerName}) LIMIT 1
    `;
    let resolvedName = sellerName;
    if (sellerRows.rows.length > 0) {
      sellerId = sellerRows.rows[0].id;
      resolvedName = sellerRows.rows[0].name;
    } else {
      const created = await client.queryObject<{ id: string; name: string }>`
        INSERT INTO public.sellers (name) VALUES (${sellerName}) RETURNING id, name
      `;
      sellerId = created.rows[0].id;
      resolvedName = created.rows[0].name;
    }

    const inserted = await client.queryObject<{ id: string }>`
      INSERT INTO public.sales
        (seller_name, seller_id, amount_tb, timestamp, source, crm_contract_id, customer_id, order_id, product_name, metadata)
      VALUES
        (${resolvedName}, ${sellerId}, ${amount}, now(), ${source}, ${crmContractId}, ${customerId}, ${orderId}, ${productName}, ${JSON.stringify(metadata)}::jsonb)
      RETURNING id
    `;

    return json({ success: true, duplicate: false, sale_id: inserted.rows[0].id });
  } catch (error) {
    // Race-condition safety: unique violation on crm_contract_id
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("sales_crm_contract_id_unique")) {
      try {
        const existing = await client.queryObject<{ id: string }>`
          SELECT id FROM public.sales WHERE crm_contract_id = ${crmContractId} LIMIT 1
        `;
        if (existing.rows.length > 0) {
          return json({ success: true, duplicate: true, message: "Sale already reported", sale_id: existing.rows[0].id });
        }
      } catch (_) {}
    }
    console.error("report-crm-sale error", error);
    return json({ error: msg || "Serverfel" }, 500);
  } finally {
    client.release();
  }
});
