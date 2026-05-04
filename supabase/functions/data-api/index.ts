import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
const pool = databaseUrl ? new Pool(databaseUrl, 3, true) : null;

type SellerRow = {
  id: string;
  name: string;
  profile_image_url: string | null;
  sound_file_url: string | null;
  updated_at: Date | string;
  created_at: Date | string;
};

type SaleRow = {
  id: string;
  seller_name: string;
  seller_id: string | null;
  amount_tb: string | number;
  timestamp: Date | string;
  created_at?: Date | string;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const rowToSeller = (row: SellerRow) => ({
  id: row.id,
  name: row.name,
  profile_image_url: row.profile_image_url ?? undefined,
  sound_file_url: row.sound_file_url ?? undefined,
  updated_at: new Date(row.updated_at).toISOString(),
});

const rowToSale = (row: SaleRow) => ({
  id: row.id,
  seller_name: row.seller_name,
  seller_id: row.seller_id ?? undefined,
  amount_tb: Number(row.amount_tb),
  timestamp: new Date(row.timestamp).toISOString(),
  created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
});

const getStockholmDayBounds = () => {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date()).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    start: `${day}T00:00:00+01:00`,
    end: `${day}T23:59:59.999+01:00`,
  };
};

const getMonthBounds = () => {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
};

async function withClient<T>(fn: (client: any) => Promise<T>): Promise<T> {
  if (!pool) throw new Error("SUPABASE_DB_URL saknas");
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Endast POST stöds" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    const result = await withClient(async (client) => {
      if (action === "list_sellers") {
        const rows = await client.queryObject<SellerRow>`select id, name, profile_image_url, sound_file_url, updated_at, created_at from public.sellers order by name asc`;
        return { sellers: rows.rows.map(rowToSeller) };
      }

      if (action === "add_seller") {
        const name = String(body.name || "").trim();
        if (!name) return { error: "Ange ett namn för säljaren", status: 400 };
        const rows = await client.queryObject<SellerRow>`insert into public.sellers (name) values (${name}) returning id, name, profile_image_url, sound_file_url, updated_at, created_at`;
        return { seller: rowToSeller(rows.rows[0]) };
      }

      if (action === "update_seller_media") {
        const sellerId = String(body.sellerId || "");
        if (!sellerId) return { error: "sellerId saknas", status: 400 };
        const hasProfile = Object.prototype.hasOwnProperty.call(body, "profile_image_url");
        const hasSound = Object.prototype.hasOwnProperty.call(body, "sound_file_url");
        const current = await client.queryObject<SellerRow>`select id, name, profile_image_url, sound_file_url, updated_at, created_at from public.sellers where id = ${sellerId}`;
        if (current.rows.length === 0) return { error: "Säljare hittades inte", status: 404 };
        const profileUrl = hasProfile ? body.profile_image_url : current.rows[0].profile_image_url;
        const soundUrl = hasSound ? body.sound_file_url : current.rows[0].sound_file_url;
        const updated = await client.queryObject<SellerRow>`update public.sellers set profile_image_url = ${profileUrl}, sound_file_url = ${soundUrl}, updated_at = now() where id = ${sellerId} returning id, name, profile_image_url, sound_file_url, updated_at, created_at`;
        return { seller: rowToSeller(updated.rows[0]) };
      }

      if (action === "delete_seller") {
        const sellerId = String(body.sellerId || "");
        if (!sellerId) return { error: "sellerId saknas", status: 400 };
        await client.queryObject`begin`;
        try {
          await client.queryObject`update public.sales set seller_id = null where seller_id = ${sellerId}`;
          const deleted = await client.queryObject<SellerRow>`delete from public.sellers where id = ${sellerId} returning id, name, profile_image_url, sound_file_url, updated_at, created_at`;
          await client.queryObject`commit`;
          if (deleted.rows.length === 0) return { error: "Säljare hittades inte", status: 404 };
          return { seller: rowToSeller(deleted.rows[0]) };
        } catch (error) {
          await client.queryObject`rollback`;
          throw error;
        }
      }

      if (action === "report_sale") {
        const sellerId = String(body.sellerId || "");
        const sellerName = String(body.sellerName || "").trim();
        const tb = Number(body.tb);
        if (!sellerName) return { error: "Säljare saknas", status: 400 };
        if (!Number.isFinite(tb) || tb <= 0) return { error: "TB-belopp måste vara större än 0", status: 400 };

        let seller: SellerRow | undefined;
        if (sellerId) {
          const sellerRows = await client.queryObject<SellerRow>`select id, name, profile_image_url, sound_file_url, updated_at, created_at from public.sellers where id = ${sellerId}`;
          seller = sellerRows.rows[0];
          if (!seller) return { error: "Säljare hittades inte", status: 404 };
        } else {
          const sellerRows = await client.queryObject<SellerRow>`select id, name, profile_image_url, sound_file_url, updated_at, created_at from public.sellers where lower(name) = lower(${sellerName}) limit 1`;
          seller = sellerRows.rows[0];
          if (!seller) {
            const created = await client.queryObject<SellerRow>`insert into public.sellers (name) values (${sellerName}) returning id, name, profile_image_url, sound_file_url, updated_at, created_at`;
            seller = created.rows[0];
          }
        }

        const saleRows = await client.queryObject<SaleRow>`insert into public.sales (seller_name, seller_id, amount_tb, timestamp) values (${seller.name}, ${seller.id}, ${tb}, now()) returning id, seller_name, seller_id, amount_tb, timestamp, created_at`;
        return { sale: rowToSale(saleRows.rows[0]), seller: rowToSeller(seller) };
      }

      if (action === "dashboard_data") {
        const sellersResult = await client.queryObject<SellerRow>`select id, name, profile_image_url, sound_file_url, updated_at, created_at from public.sellers order by name asc`;
        const sellers = sellersResult.rows.map(rowToSeller);
        const sellerMap = new Map(sellers.map((seller) => [seller.id, seller]));
        const day = getStockholmDayBounds();
        const month = getMonthBounds();

        const dailyTotals = await client.queryObject<{ total_today: string | number }>`select coalesce(sum(amount_tb), 0) as total_today from public.sales where timestamp >= ${day.start}::timestamptz and timestamp <= ${day.end}::timestamptz`;
        const monthlyTotals = await client.queryObject<{ total_month: string | number }>`select coalesce(sum(amount_tb), 0) as total_month from public.sales where timestamp >= ${month.start}::timestamptz and timestamp < ${month.end}::timestamptz`;
        const todayRows = await client.queryObject<{ seller_name: string; seller_id: string | null; amount: string | number }>`select seller_name, seller_id, sum(amount_tb) as amount from public.sales where timestamp >= ${day.start}::timestamptz and timestamp <= ${day.end}::timestamptz group by seller_name, seller_id order by amount desc`;
        const monthRows = await client.queryObject<{ seller_name: string; seller_id: string | null; amount: string | number }>`select seller_name, seller_id, sum(amount_tb) as amount from public.sales where timestamp >= ${month.start}::timestamptz and timestamp < ${month.end}::timestamptz group by seller_name, seller_id order by amount desc limit 10`;

        const enrich = (row: { seller_name: string; seller_id: string | null; amount: string | number }) => {
          const seller = row.seller_id ? sellerMap.get(row.seller_id) : sellers.find((s) => s.name.toLowerCase() === row.seller_name.toLowerCase());
          return {
            name: row.seller_name,
            seller_id: row.seller_id ?? undefined,
            amount: Number(row.amount),
            imageUrl: seller?.profile_image_url || undefined,
          };
        };

        return {
          sellers,
          totalToday: Number(dailyTotals.rows[0]?.total_today || 0),
          totalMonth: Number(monthlyTotals.rows[0]?.total_month || 0),
          todaysSellers: todayRows.rows.map(enrich),
          topSellers: monthRows.rows.map(enrich),
        };
      }

      if (action === "todays_sales") {
        const day = getStockholmDayBounds();
        const rows = await client.queryObject<SaleRow>`select id, seller_name, seller_id, amount_tb, timestamp, created_at from public.sales where timestamp >= ${day.start}::timestamptz and timestamp <= ${day.end}::timestamptz order by timestamp desc`;
        return { sales: rows.rows.map(rowToSale) };
      }

      if (action === "monthly_sales") {
        const sellerName = String(body.sellerName || "").trim();
        if (!sellerName) return { error: "sellerName saknas", status: 400 };
        const month = getMonthBounds();
        const rows = await client.queryObject<SaleRow>`select id, seller_name, seller_id, amount_tb, timestamp, created_at from public.sales where seller_name = ${sellerName} and timestamp >= ${month.start}::timestamptz and timestamp < ${month.end}::timestamptz order by timestamp desc`;
        return { sales: rows.rows.map(rowToSale) };
      }

      if (action === "delete_sale") {
        const saleId = String(body.saleId || "");
        if (!saleId) return { error: "saleId saknas", status: 400 };
        const deleted = await client.queryObject<SaleRow>`delete from public.sales where id = ${saleId} returning id, seller_name, seller_id, amount_tb, timestamp, created_at`;
        if (deleted.rows.length === 0) return { error: "Försäljning hittades inte", status: 404 };
        return { sale: rowToSale(deleted.rows[0]) };
      }

      return { error: "Ogiltig åtgärd", status: 400 };
    });

    if (result && typeof result === "object" && "error" in result) {
      return json({ error: result.error }, Number((result as any).status || 500));
    }

    return json(result);
  } catch (error) {
    console.error("data-api error", error);
    return json({ error: error instanceof Error ? error.message : "Serverfel" }, 500);
  }
});
