import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto as stdCrypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation constants
const MIN_DEPOSIT_AMOUNT = 10;
const MAX_DEPOSIT_AMOUNT = 10000;
const ALLOWED_CURRENCIES = ['usd', 'eur', 'gbp'];

// Validation helpers
const isValidAmount = (val: unknown): val is number => {
  return typeof val === 'number' && 
         isFinite(val) && 
         val >= MIN_DEPOSIT_AMOUNT && 
         val <= MAX_DEPOSIT_AMOUNT;
};

const isValidCurrency = (val: unknown): val is string => {
  return typeof val === 'string' && ALLOWED_CURRENCIES.includes(val.toLowerCase());
};

// Cryptomus signature generation using MD5
async function generateSignature(data: Record<string, unknown>, apiKey: string): Promise<string> {
  const jsonData = JSON.stringify(data);
  const base64Data = btoa(jsonData);
  const signString = base64Data + apiKey;
  
  // Create MD5 hash using Deno std library (supports MD5 unlike native Web Crypto)
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(signString);
  const hashBuffer = await stdCrypto.subtle.digest("MD5", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('CRYPTOMUS_API_KEY');
    const merchantId = Deno.env.get('CRYPTOMUS_MERCHANT_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!apiKey || !merchantId) {
      throw new Error('Cryptomus API credentials not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header
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
    
    const body = await req.json();
    const { amount, currency = 'usd' } = body;
    
    // SECURITY: Validate amount with min/max limits
    if (!isValidAmount(amount)) {
      return new Response(JSON.stringify({ 
        error: `Invalid amount. Must be between $${MIN_DEPOSIT_AMOUNT} and $${MAX_DEPOSIT_AMOUNT.toLocaleString()}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // SECURITY: Validate currency
    if (!isValidCurrency(currency)) {
      return new Response(JSON.stringify({ 
        error: `Invalid currency. Allowed: ${ALLOWED_CURRENCIES.join(', ').toUpperCase()}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Creating Cryptomus payment for user ${user.id}: $${amount}`);
    
    const orderId = `deposit_${user.id}_${Date.now()}`;
    
    // Prepare payment data for Cryptomus
    const paymentData: Record<string, unknown> = {
      amount: amount.toString(),
      currency: currency.toUpperCase(),
      order_id: orderId,
      url_return: 'https://cryptomails.world/dashboard',
      url_callback: `${supabaseUrl}/functions/v1/cryptomus-webhook`,
      lifetime: 3600, // 1 hour in seconds
    };
    
    // Generate signature
    const sign = await generateSignature(paymentData, apiKey);
    
    console.log('Sending request to Cryptomus API...');
    
    // Create payment with Cryptomus
    const paymentResponse = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: {
        'merchant': merchantId,
        'sign': sign,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    
    const paymentResult = await paymentResponse.json();
    
    console.log('Cryptomus response:', paymentResult);
    
    if (!paymentResponse.ok || !paymentResult.result) {
      const errorMessage = paymentResult.message || paymentResult.error || 'Failed to create payment';
      throw new Error(errorMessage);
    }
    
    const paymentInfo = paymentResult.result;
    
    // Store deposit in database
    const { data: deposit, error: insertError } = await supabase
      .from('deposits')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: currency.toUpperCase(),
        payment_id: paymentInfo.uuid || paymentInfo.order_id,
        payment_status: 'waiting',
        pay_address: paymentInfo.address || null,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error storing deposit:', insertError);
      throw new Error('Failed to store deposit');
    }
    
    return new Response(JSON.stringify({
      success: true,
      invoice_url: paymentInfo.url,
      payment_id: paymentInfo.uuid,
      deposit_id: deposit.id,
      deposit: deposit,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Create payment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
