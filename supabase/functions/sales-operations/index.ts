import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      'https://duoypfodaqaqsiixulkn.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, ...data } = await req.json();

    if (action === 'create_sale') {
      const { seller_id, seller_name, amount, tb_amount, units, is_id_skydd, service_type } = data;

      // Validate seller exists and is active
      const { data: seller, error: sellerError } = await supabaseAdmin
        .from('sellers')
        .select('id, name')
        .eq('id', seller_id)
        .single();

      if (sellerError || !seller) {
        console.error('Seller validation failed:', sellerError);
        return new Response(
          JSON.stringify({ error: 'Säljare kunde inte hittas eller är inte aktiv' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate amounts
      if (amount < 0 || tb_amount < 0 || units < 0) {
        return new Response(
          JSON.stringify({ error: 'Negativa värden är inte tillåtna' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert sale
      const { data: sale, error: insertError } = await supabaseAdmin
        .from('sales')
        .insert({
          seller_id,
          seller_name,
          amount: amount || 0,
          tb_amount: tb_amount || 0,
          units: units || 0,
          is_id_skydd: is_id_skydd || false,
          service_type: service_type || 'sstnet'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Sale insert failed:', insertError);
        return new Response(
          JSON.stringify({ error: 'Kunde inte spara försäljningen' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, sale }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_sale') {
      const { sale_id } = data;

      // Get sale to validate it's from current month
      const { data: sale, error: fetchError } = await supabaseAdmin
        .from('sales')
        .select('id, created_at')
        .eq('id', sale_id)
        .single();

      if (fetchError || !sale) {
        return new Response(
          JSON.stringify({ error: 'Försäljning kunde inte hittas' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if sale is from current month
      const saleDate = new Date(sale.created_at);
      const now = new Date();
      const isCurrentMonth = saleDate.getFullYear() === now.getFullYear() && 
                            saleDate.getMonth() === now.getMonth();

      if (!isCurrentMonth) {
        return new Response(
          JSON.stringify({ error: 'Kan endast ta bort försäljningar från innevarande månad' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete sale
      const { error: deleteError } = await supabaseAdmin
        .from('sales')
        .delete()
        .eq('id', sale_id);

      if (deleteError) {
        console.error('Sale delete failed:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Kunde inte ta bort försäljningen' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ogiltig åtgärd' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sales operation error:', error);
    return new Response(
      JSON.stringify({ error: 'Serverfel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});