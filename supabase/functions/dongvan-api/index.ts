import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DONGVAN_API_BASE = 'https://api.dongvanfb.net';
const DONGVAN_TOOLS_BASE = 'https://tools.dongvanfb.net';
const ALLOWED_PRODUCT_IDS = [1, 2, 3, 5, 6, 59, 60];

// Input validation helpers
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidEmail = (str: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) && str.length <= 255;
};

const isPositiveInteger = (val: unknown): val is number => {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
};

const isPositiveNumber = (val: unknown): val is number => {
  return typeof val === 'number' && val > 0 && isFinite(val);
};

const sanitizeString = (str: unknown, maxLength = 500): string => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
};

// Helper to fetch with retry for transient network errors
const fetchWithRetry = async (url: string, options?: RequestInit, maxRetries = 3): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Fetch attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      // Only retry on network errors (connection reset, timeout, etc.)
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed after retries');
};

// Helper to safely parse JSON responses from external APIs
const safeJsonParse = async (response: Response, context: string): Promise<any> => {
  const text = await response.text();
  
  // Check if response looks like HTML (error page)
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    console.error(`${context}: Received HTML instead of JSON (status: ${response.status})`);
    throw new Error(`External API returned HTML error page (status: ${response.status})`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`${context}: Failed to parse JSON:`, text.slice(0, 200));
    throw new Error(`Failed to parse API response: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
  }
};

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
        // SECURITY: Require admin authentication for balance endpoint
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
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
        
        // Verify admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        if (!roleData) {
          return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const response = await fetchWithRetry(`${DONGVAN_API_BASE}/user/balance?apikey=${apiKey}`);
        const data = await safeJsonParse(response, 'DongVan balance');
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
        // Public endpoint - products info is meant to be visible
        const response = await fetchWithRetry(`${DONGVAN_API_BASE}/user/account_type?apikey=${apiKey}`);
        const data = await safeJsonParse(response, 'DongVan products');
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
        
        // SECURITY: Validate input parameters
        if (!product_id || !isValidUUID(product_id)) {
          return new Response(JSON.stringify({ error: 'Invalid product_id format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (!isPositiveInteger(quantity) || quantity > 100) {
          return new Response(JSON.stringify({ error: 'Quantity must be a positive integer (max 100)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (!isPositiveNumber(total_price) || total_price > 10000) {
          return new Response(JSON.stringify({ error: 'Invalid total_price (max $10,000)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
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
          .select('dongvan_id, price')
          .eq('id', product_id)
          .single();
        
        if (productError || !product) {
          return new Response(JSON.stringify({ error: 'Product not found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // SECURITY: Verify total_price matches product price * quantity
        const expectedPrice = product.price * quantity;
        if (Math.abs(total_price - expectedPrice) > 0.01) {
          console.error(`Price mismatch: expected ${expectedPrice}, got ${total_price}`);
          return new Response(JSON.stringify({ error: 'Price mismatch - please refresh and try again' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Buy from DongVanFB - correct endpoint: /user/buy
        const buyUrl = `${DONGVAN_API_BASE}/user/buy?apikey=${apiKey}&account_type=${product.dongvan_id}&quality=${quantity}&type=full`;
        console.log('Buying from DongVan:', buyUrl);
        
        const response = await fetchWithRetry(buyUrl);
        const data = await safeJsonParse(response, 'DongVan buy');
        
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
        
        // SECURITY: Validate email format
        const sanitizedEmail = sanitizeString(email, 255);
        if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
          return new Response(JSON.stringify({ error: 'Invalid email format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Sanitize other inputs
        const sanitizedPassword = sanitizeString(password, 500);
        const sanitizedRefreshToken = sanitizeString(refresh_token, 2000);
        const sanitizedClientId = sanitizeString(client_id, 100);
        
        // For Graph API mails with OAuth2 tokens - use graph_messages endpoint
        if (sanitizedRefreshToken && sanitizedClientId) {
          console.log('Using OAuth2 Graph API for reading messages...');
          const response = await fetchWithRetry(`${DONGVAN_TOOLS_BASE}/api/graph_messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: sanitizedEmail,
              refresh_token: sanitizedRefreshToken,
              client_id: sanitizedClientId
            })
          });
          const data = await safeJsonParse(response, 'DongVan graph_messages');
          console.log('DongVan graph_messages response:', JSON.stringify(data).slice(0, 500));
          
          return new Response(JSON.stringify({
            success: data.status === true,
            data: data.messages || [],
            message: data.status ? 'Messages retrieved successfully' : (data.message || 'Failed to read mailbox')
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // For IMAP/password-based mails - try get_code_oauth2 with type=all
        if (sanitizedPassword) {
          console.log('Using password-based auth for reading messages...');
          const response = await fetchWithRetry(`${DONGVAN_TOOLS_BASE}/api/get_code_oauth2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: sanitizedEmail,
              refresh_token: sanitizedPassword,
              client_id: '',
              type: 'all'
            })
          });
          const data = await safeJsonParse(response, 'DongVan password-based');
          console.log('DongVan password-based response:', JSON.stringify(data).slice(0, 500));
          
          return new Response(JSON.stringify({
            success: data.status === true,
            data: data.messages || [],
            code: data.code,
            message: data.status ? 'Messages retrieved' : (data.message || 'Failed to read mailbox')
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ 
          error: 'Either password or refresh_token+client_id required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'get_code': {
        const { email, password, sender, refresh_token, client_id } = params;
        
        // SECURITY: Validate email format
        const sanitizedEmail = sanitizeString(email, 255);
        if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
          return new Response(JSON.stringify({ error: 'Invalid email format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Sanitize other inputs
        const sanitizedRefreshToken = sanitizeString(refresh_token, 2000);
        const sanitizedClientId = sanitizeString(client_id, 100);
        const sanitizedSender = sanitizeString(sender, 50);
        
        // Determine the type based on sender (whitelist allowed values)
        const allowedTypes = ['facebook', 'google', 'microsoft', 'all'];
        const type = allowedTypes.includes(sanitizedSender) ? sanitizedSender : 'facebook';
        
        // For Graph API mails with OAuth2
        if (sanitizedRefreshToken && sanitizedClientId) {
          const response = await fetchWithRetry(`${DONGVAN_TOOLS_BASE}/api/get_code_oauth2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: sanitizedEmail,
              refresh_token: sanitizedRefreshToken,
              client_id: sanitizedClientId,
              type
            })
          });
          const data = await safeJsonParse(response, 'DongVan getcode OAuth2');
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
        const response = await fetchWithRetry(
          `${DONGVAN_API_BASE}/user/get_code_facebook?apikey=${apiKey}&email=${encodeURIComponent(sanitizedEmail)}`
        );
        const data = await safeJsonParse(response, 'DongVan getcode Facebook');
        
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