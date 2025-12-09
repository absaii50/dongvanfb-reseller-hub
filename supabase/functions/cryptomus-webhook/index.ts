import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, sign',
};

// Verify Cryptomus signature
async function verifySignature(data: Record<string, unknown>, signature: string, apiKey: string): Promise<boolean> {
  try {
    // Remove sign from data if present
    const dataToSign = { ...data };
    delete dataToSign.sign;
    
    const jsonData = JSON.stringify(dataToSign);
    const base64Data = btoa(jsonData);
    const signString = base64Data + apiKey;
    
    // Create MD5 hash
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(signString);
    const hashBuffer = await crypto.subtle.digest('MD5', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return signature.toLowerCase() === expectedSignature.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('CRYPTOMUS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body = await req.text();
    const payload = JSON.parse(body);
    
    console.log('Cryptomus webhook received:', payload);
    
    // Verify signature if API key is set
    if (apiKey) {
      const signature = req.headers.get('sign') || payload.sign;
      if (signature) {
        const isValid = await verifySignature(payload, signature, apiKey);
        if (!isValid) {
          console.error('Invalid signature');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.log('Signature verified successfully');
      }
    }
    
    const { uuid, order_id, status, amount, currency } = payload;
    const paymentId = uuid || order_id;
    
    console.log(`Payment ${paymentId} status: ${status}, amount: ${amount} ${currency}`);
    
    // Map Cryptomus status to our status
    const statusMapping: Record<string, string> = {
      'paid': 'confirmed',
      'paid_over': 'confirmed',
      'confirm_check': 'waiting',
      'wrong_amount': 'waiting',
      'process': 'waiting',
      'check': 'waiting',
      'fail': 'expired',
      'cancel': 'expired',
      'system_fail': 'expired',
      'refund_process': 'expired',
      'refund_fail': 'expired',
      'refund_paid': 'expired',
    };
    
    const mappedStatus = statusMapping[status] || status;
    
    // Find the deposit by payment_id (uuid)
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching deposit:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!deposit) {
      console.log('Deposit not found for payment_id:', paymentId);
      return new Response(JSON.stringify({ message: 'Deposit not found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Update deposit status
    const { error: updateDepositError } = await supabase
      .from('deposits')
      .update({ 
        payment_status: mappedStatus,
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
    
    // If payment is confirmed, update user balance
    if (status === 'paid' || status === 'paid_over') {
      // Use the original deposit amount in USD
      const amountToAdd = deposit.amount;
      
      console.log(`Adding $${amountToAdd} to user ${deposit.user_id} balance`);
      
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
      
      console.log(`Balance updated successfully. New balance: $${newBalance}`);
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
