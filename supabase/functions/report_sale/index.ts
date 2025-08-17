import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { seller_id, tb_amount, id_units } = await req.json();
    
    console.log('📝 Report sale request:', { seller_id, tb_amount, id_units });

    // Validation
    if (!seller_id) {
      return new Response("seller_id krävs", { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check that at least one value is provided and > 0
    if (!(tb_amount > 0) && !(id_units > 0)) {
      return new Response("Ange TB-belopp och/eller ID-skydd (> 0)", { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate seller exists
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, name')
      .eq('id', seller_id)
      .single();

    if (sellerError || !seller) {
      console.error('Seller validation failed:', sellerError);
      return new Response("Säljare kunde inte hittas", { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine service type and values
    let serviceType = 'sstnet';
    let mainAmount = 0;
    let isIdSkydd = false;

    if (id_units > 0 && tb_amount > 0) {
      serviceType = 'combined';
      mainAmount = tb_amount;
      isIdSkydd = true;
    } else if (id_units > 0) {
      serviceType = 'id_bevakarna';
      mainAmount = 0;
      isIdSkydd = true;
    } else {
      serviceType = 'sstnet';
      mainAmount = tb_amount;
      isIdSkydd = false;
    }

    const { data, error } = await supabase
      .from("sales")
      .insert([{ 
        seller_id, 
        seller_name: seller.name,
        amount: mainAmount,
        tb_amount: tb_amount || null, 
        id_units: id_units || null,
        is_id_skydd: isIdSkydd,
        service_type: serviceType
      }])
      .select()
      .single();

    if (error) {
      console.error('Sale insert failed:', error);
      throw error;
    }

    console.log('✅ Sale created:', data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('Report sale error:', e);
    return new Response(String(e?.message ?? e), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});