import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReportSaleRequest {
  sellerName: string;
  tb: number;
}

Deno.serve(async (req) => {
  console.log('🌟 Report sale function called:', req.method);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: ReportSaleRequest = await req.json();
    console.log('📥 Request body:', body);

    const { sellerName, tb } = body;

    // Validation
    if (!sellerName || typeof sellerName !== 'string' || sellerName.trim() === '') {
      console.log('❌ Invalid seller name');
      return new Response(JSON.stringify({ 
        error: "sellerName måste vara en icke-tom sträng" 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!tb || typeof tb !== 'number' || tb <= 0) {
      console.log('❌ Invalid TB amount');
      return new Response(JSON.stringify({ 
        error: "tb måste vara ett tal större än 0" 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }


    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing environment variables');
      return new Response(JSON.stringify({ 
        error: "Server configuration error" 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔑 Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find or create seller
    console.log('👤 Looking for seller:', sellerName);
    let { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('name', sellerName.trim())
      .single();

    let sellerId = null;
    
    if (sellerError || !seller) {
      console.log('➕ Creating new seller:', sellerName);
      const { data: newSeller, error: createError } = await supabase
        .from('sellers')
        .insert([{ name: sellerName.trim() }])
        .select('id')
        .single();
      
      if (createError) {
        console.error('❌ Failed to create seller:', createError);
        return new Response(JSON.stringify({ 
          error: "Kunde inte skapa säljare" 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      sellerId = newSeller.id;
    } else {
      sellerId = seller.id;
    }

    // Insert sale
    console.log('💾 Inserting sale...');
    const saleData = {
      seller_name: sellerName.trim(),
      amount_tb: tb,
      seller_id: sellerId,
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Sale data:', saleData);

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([saleData])
      .select()
      .single();

    if (saleError) {
      console.error('❌ Failed to insert sale:', saleError);
      return new Response(JSON.stringify({ 
        error: "Kunde inte spara försäljning: " + saleError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Sale created successfully:', sale);

    return new Response(JSON.stringify(sale), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: "Oväntat serverfel: " + String(error) 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});