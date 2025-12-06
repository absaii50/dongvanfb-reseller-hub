import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DONGVAN_API_BASE = 'https://api.dongvanfb.net';
const DONGVAN_TOOLS_BASE = 'https://tools.dongvanfb.net';
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
        const response = await fetch(`${DONGVAN_API_BASE}/user/balance?apikey=${apiKey}`);
        const data = await response.json();
        console.log('DongVan balance response:', data);
        return new Response(JSON.stringify({
          success: data.status,
          data: { balance: data.balance },
          message: data.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'get_products': {
        const response = await fetch(`${DONGVAN_API_BASE}/user/account_type?apikey=${apiKey}`);
        const data = await response.json();
        console.log('DongVan products response:', data);
        
        // Filter to only allowed products (exclude PVA)
        if (data.status && Array.isArray(data.data)) {
          data.data = data.data.filter((p: { id: number }) => ALLOWED_PRODUCT_IDS.includes(p.id));
        }
        
        return new Response(JSON.stringify({
          success: data.status,
          data: data.data,
          message: data.message
        }), {
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
        
        // Buy from DongVanFB - correct endpoint: /user/buy
        const buyUrl = `${DONGVAN_API_BASE}/user/buy?apikey=${apiKey}&account_type=${product.dongvan_id}&quality=${quantity}&type=full`;
        console.log('Buying from DongVan:', buyUrl);
        
        const response = await fetch(buyUrl);
        const data = await response.json();
        
        console.log('DongVan buy response:', data);
        
        if (!data.status || data.error_code !== 200) {
          return new Response(JSON.stringify({ 
            error: data.message || 'Purchase failed',
            details: data 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Parse mail data from list_data
        const mailData = (data.data?.list_data || []).map((item: string) => {
          const parts = item.split('|');
          return {
            email: parts[0] || '',
            password: parts[1] || '',
            refresh_token: parts[2] || '',
            client_id: parts[3] || ''
          };
        });
        
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
            mail_data: mailData,
          })
          .select()
          .single();
        
        if (orderError) {
          console.error('Order creation error:', orderError);
        }
        
        // Note: Stock will be synced from DongVanFB during next product sync
        
        return new Response(JSON.stringify({
          success: true,
          order_id: order?.id,
          mail_data: mailData,
          new_balance: newBalance,
          order_code: data.data?.order_code
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'read_mailbox': {
        const { email, password, refresh_token, client_id } = params;
        
        // For Graph API mails, use OAuth2 endpoint
        if (refresh_token && client_id) {
          const response = await fetch(`${DONGVAN_TOOLS_BASE}/api/get_code_oauth2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              refresh_token,
              client_id,
              type: 'all'
            })
          });
          const data = await response.json();
          console.log('DongVan mailbox (OAuth2) response:', data);
          
          return new Response(JSON.stringify({
            success: data.status,
            data: data.messages || [],
            message: data.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // For IMAP mails, use password-based endpoint
        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'Email and password/token required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Try the Graph API endpoint with password as refresh_token
        const response = await fetch(`${DONGVAN_TOOLS_BASE}/api/graph_code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            refresh_token: password,
            client_id: params.client_id || '',
            type: 'all'
          })
        });
        const data = await response.json();
        
        console.log('DongVan mailbox response:', data);
        
        return new Response(JSON.stringify({
          success: data.status,
          data: data.messages || [],
          code: data.code,
          message: data.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'get_code': {
        const { email, password, sender, refresh_token, client_id } = params;
        
        if (!email) {
          return new Response(JSON.stringify({ error: 'Email required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Determine the type based on sender
        const type = sender || 'facebook';
        
        // For Graph API mails with OAuth2
        if (refresh_token && client_id) {
          const response = await fetch(`${DONGVAN_TOOLS_BASE}/api/get_code_oauth2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              refresh_token,
              client_id,
              type
            })
          });
          const data = await response.json();
          console.log('DongVan getcode (OAuth2) response:', data);
          
          return new Response(JSON.stringify({
            success: data.status,
            data: { code: data.code },
            message: data.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // For simple Facebook code retrieval
        const response = await fetch(
          `${DONGVAN_API_BASE}/user/get_code_facebook?apikey=${apiKey}&email=${encodeURIComponent(email)}`
        );
        const data = await response.json();
        
        console.log('DongVan getcode response:', data);
        
        return new Response(JSON.stringify({
          success: data.status,
          data: { code: data.code },
          message: data.message
        }), {
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
