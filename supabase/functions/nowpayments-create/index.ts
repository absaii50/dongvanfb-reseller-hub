import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!apiKey) {
      throw new Error('NOWPayments API key not configured');
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
    
    const { amount, currency = 'usd' } = await req.json();
    
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Creating payment for user ${user.id}: $${amount}`);
    
    // Create payment with NOWPayments
    const paymentResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: currency,
        order_id: `deposit_${user.id}_${Date.now()}`,
        order_description: `CryptoMails Deposit - $${amount}`,
        ipn_callback_url: `${supabaseUrl}/functions/v1/nowpayments-webhook`,
        success_url: `${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/dashboard`,
        cancel_url: `${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/deposit`,
      }),
    });
    
    const paymentData = await paymentResponse.json();
    
    console.log('NOWPayments response:', paymentData);
    
    if (!paymentResponse.ok) {
      throw new Error(paymentData.message || 'Failed to create payment');
    }
    
    // Store deposit in database
    const { data: deposit, error: insertError } = await supabase
      .from('deposits')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: currency.toUpperCase(),
        payment_id: paymentData.id?.toString(),
        payment_status: 'waiting',
        pay_address: paymentData.pay_address || null,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error storing deposit:', insertError);
      throw new Error('Failed to store deposit');
    }
    
    return new Response(JSON.stringify({
      success: true,
      invoice_url: paymentData.invoice_url,
      payment_id: paymentData.id,
      deposit_id: deposit.id,
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
