import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nowpayments-sig',
};

async function verifySignature(payload: Record<string, unknown>, signature: string, secret: string): Promise<boolean> {
  const sortedPayload = Object.keys(payload)
    .sort()
    .reduce((acc: Record<string, unknown>, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(JSON.stringify(sortedPayload));
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ipnSecret = Deno.env.get('NOWPAYMENTS_IPN_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body = await req.text();
    const payload = JSON.parse(body);
    
    console.log('NOWPayments webhook received:', payload);
    
    // Verify signature if IPN secret is set
    if (ipnSecret) {
      const signature = req.headers.get('x-nowpayments-sig');
      if (signature) {
        const isValid = await verifySignature(payload, signature, ipnSecret);
        if (!isValid) {
          console.error('Invalid signature');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    const { payment_id, payment_status, pay_amount, actually_paid } = payload;
    
    console.log(`Payment ${payment_id} status: ${payment_status}, amount: ${pay_amount}`);
    
    // Find the deposit by payment_id
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('payment_id', payment_id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching deposit:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!deposit) {
      console.log('Deposit not found for payment_id:', payment_id);
      return new Response(JSON.stringify({ message: 'Deposit not found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Update deposit status
    const { error: updateDepositError } = await supabase
      .from('deposits')
      .update({ 
        payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', deposit.id);
    
    if (updateDepositError) {
      console.error('Error updating deposit:', updateDepositError);
    }
    
    // Check if deposit is already expired (don't process expired payments)
    if (deposit.payment_status === 'expired') {
      console.log(`Deposit ${deposit.id} is already expired, ignoring payment update`);
      return new Response(JSON.stringify({ success: true, message: 'Deposit expired' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // If payment is finished/confirmed, update user balance
    if (payment_status === 'finished' || payment_status === 'confirmed') {
      const amountToAdd = actually_paid || pay_amount || deposit.amount;
      
      console.log(`Adding ${amountToAdd} to user ${deposit.user_id} balance`);
      
      // Get current profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', deposit.user_id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const newBalance = (profile.balance || 0) + parseFloat(amountToAdd);
      
      // Update balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', deposit.user_id);
      
      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        return new Response(JSON.stringify({ error: 'Balance update failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`Balance updated successfully. New balance: ${newBalance}`);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
