import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DONGVAN_API_BASE = 'https://api.dongvanfb.net';
const ALLOWED_PRODUCT_IDS = [1, 2, 3, 5, 6, 59, 60];

// Default markup percentage (admin can adjust prices later)
const DEFAULT_MARKUP = 1.15; // 15% markup

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DONGVANFB_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!apiKey) {
      throw new Error('DongVanFB API key not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Starting product sync...');
    
    // Fetch products from DongVanFB
    const response = await fetch(`${DONGVAN_API_BASE}/api/products?apikey=${apiKey}`);
    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Failed to fetch products from DongVanFB');
    }
    
    console.log(`Fetched ${data.data.length} products from DongVanFB`);
    
    // Filter to allowed products
    const allowedProducts = data.data.filter((p: { id: number }) => 
      ALLOWED_PRODUCT_IDS.includes(p.id)
    );
    
    console.log(`${allowedProducts.length} products match allowed IDs`);
    
    let synced = 0;
    let created = 0;
    let updated = 0;
    
    for (const dongvanProduct of allowedProducts) {
      // Check if product exists
      const { data: existing } = await supabase
        .from('products')
        .select('id, price')
        .eq('dongvan_id', dongvanProduct.id)
        .maybeSingle();
      
      const productData = {
        dongvan_id: dongvanProduct.id,
        name: dongvanProduct.name,
        description: dongvanProduct.description || null,
        stock: dongvanProduct.quantity || 0,
        is_active: (dongvanProduct.quantity || 0) > 0,
        updated_at: new Date().toISOString(),
      };
      
      if (existing) {
        // Update existing product (keep admin's custom price)
        const { error } = await supabase
          .from('products')
          .update({
            ...productData,
            // Only update stock and active status, keep admin's price
          })
          .eq('id', existing.id);
        
        if (!error) {
          updated++;
        } else {
          console.error(`Failed to update product ${dongvanProduct.id}:`, error);
        }
      } else {
        // Create new product with default markup
        const price = (dongvanProduct.price || 0) * DEFAULT_MARKUP;
        
        const { error } = await supabase
          .from('products')
          .insert({
            ...productData,
            price: Math.round(price * 100) / 100, // Round to 2 decimals
          });
        
        if (!error) {
          created++;
        } else {
          console.error(`Failed to create product ${dongvanProduct.id}:`, error);
        }
      }
      
      synced++;
    }
    
    console.log(`Sync complete: ${synced} total, ${created} created, ${updated} updated`);
    
    return new Response(JSON.stringify({
      success: true,
      synced,
      created,
      updated,
      message: `Successfully synced ${synced} products (${created} new, ${updated} updated)`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Sync products error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
