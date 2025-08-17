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

    const { seller_id, tb_amount, id_units } = await req.json();

    console.log('📝 Report sale request:', { seller_id, tb_amount, id_units });

    // Validation
    if (!seller_id) {
      return new Response(
        JSON.stringify({ error: 'Säljare krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert and validate amounts
    const numericTB = tb_amount ? parseFloat(tb_amount) : 0;
    const numericUnits = id_units ? parseInt(id_units) : 0;

    // At least one must be provided and > 0
    if ((numericTB <= 0 || isNaN(numericTB)) && (numericUnits <= 0 || isNaN(numericUnits))) {
      return new Response(
        JSON.stringify({ error: 'Minst ett av TB-belopp eller ID-skydd måste anges och vara större än 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate seller exists
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .select('id, name')
      .eq('id', seller_id)
      .single();

    if (sellerError || !seller) {
      console.error('Seller validation failed:', sellerError);
      return new Response(
        JSON.stringify({ error: 'Säljare kunde inte hittas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine service type and main amount
    let serviceType = 'sstnet';
    let mainAmount = 0;
    let isIdSkydd = false;

    if (numericUnits > 0 && numericTB > 0) {
      serviceType = 'combined';
      mainAmount = numericTB;
      isIdSkydd = true;
    } else if (numericUnits > 0) {
      serviceType = 'id_bevakarna';
      mainAmount = 0;
      isIdSkydd = true;
    } else {
      serviceType = 'sstnet';
      mainAmount = 0;
      isIdSkydd = false;
    }

    // Insert sale
    const { data: sale, error: insertError } = await supabaseAdmin
      .from('sales')
      .insert({
        seller_id,
        seller_name: seller.name,
        amount: mainAmount,
        tb_amount: numericTB,
        units: numericUnits,
        is_id_skydd: isIdSkydd,
        service_type: serviceType
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

    console.log('✅ Sale created:', sale);

    // Publish realtime event
    try {
      const channel = supabaseAdmin.channel('sales');
      await channel.send({
        type: 'broadcast',
        event: 'new_sale',
        payload: sale
      });
      console.log('📡 Realtime event sent');
    } catch (broadcastError) {
      console.error('❌ Broadcast error (non-critical):', broadcastError);
      // Don't fail the request for broadcast issues
    }

    return new Response(
      JSON.stringify({ success: true, sale }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Report sale error:', error);
    return new Response(
      JSON.stringify({ error: 'Serverfel: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});