import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DONGVAN_API_BASE = 'https://api.dongvanfb.net';
const ALLOWED_PRODUCT_IDS = [1, 2, 3, 5, 6, 59, 60];

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
    
    const { action, ...params } = await req.json();
    
    console.log(`DongVan API action: ${action}`, params);
    
    switch (action) {
      case 'get_balance': {
        const response = await fetch(`${DONGVAN_API_BASE}/api/balance?apikey=${apiKey}`);
        const data = await response.json();
        console.log('DongVan balance response:', data);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'get_products': {
        const response = await fetch(`${DONGVAN_API_BASE}/api/products?apikey=${apiKey}`);
        const data = await response.json();
        console.log('DongVan products response:', data);
        
        // Filter to only allowed products (exclude PVA)
        if (data.success && Array.isArray(data.data)) {
          data.data = data.data.filter((p: { id: number }) => ALLOWED_PRODUCT_IDS.includes(p.id));
        }
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'buy_mail': {
        // Verify user authentication
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
        
        const { product_id, quantity, total_price } = params;
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        if (profileError || !profile) {
          return new Response(JSON.stringify({ error: 'Profile not found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (profile.balance < total_price) {
          return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Get product from our database to get dongvan_id
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('dongvan_id')
          .eq('id', product_id)
          .single();
        
        if (productError || !product) {
          return new Response(JSON.stringify({ error: 'Product not found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Buy from DongVanFB
        const buyUrl = `${DONGVAN_API_BASE}/api/buy?apikey=${apiKey}&id=${product.dongvan_id}&quantity=${quantity}`;
        console.log('Buying from DongVan:', buyUrl);
        
        const response = await fetch(buyUrl);
        const data = await response.json();
        
        console.log('DongVan buy response:', data);
        
        if (!data.success) {
          return new Response(JSON.stringify({ 
            error: data.message || 'Purchase failed',
            details: data 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Deduct balance
        const newBalance = profile.balance - total_price;
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('user_id', user.id);
        
        // Create order with mail data
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            product_id: product_id,
            quantity: quantity,
            total_price: total_price,
            status: 'completed',
            mail_data: data.data || [],
          })
          .select()
          .single();
        
        if (orderError) {
          console.error('Order creation error:', orderError);
        }
        
        return new Response(JSON.stringify({
          success: true,
          order_id: order?.id,
          mail_data: data.data,
          new_balance: newBalance,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'read_mailbox': {
        const { email, password } = params;
        
        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'Email and password required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const response = await fetch(
          `${DONGVAN_API_BASE}/api/mailbox?apikey=${apiKey}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
        );
        const data = await response.json();
        
        console.log('DongVan mailbox response:', data);
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'get_code': {
        const { email, password, sender } = params;
        
        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'Email and password required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        let url = `${DONGVAN_API_BASE}/api/getcode?apikey=${apiKey}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        if (sender) {
          url += `&sender=${encodeURIComponent(sender)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('DongVan getcode response:', data);
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
  } catch (error) {
    console.error('DongVan API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
