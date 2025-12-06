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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Running deposit expiry check...');
    
    // Find all waiting/pending deposits that have expired
    const { data: expiredDeposits, error: fetchError } = await supabase
      .from('deposits')
      .select('id, payment_id, user_id, amount, expires_at')
      .in('payment_status', ['waiting', 'pending'])
      .lt('expires_at', new Date().toISOString());
    
    if (fetchError) {
      console.error('Error fetching expired deposits:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!expiredDeposits || expiredDeposits.length === 0) {
      console.log('No expired deposits found');
      return new Response(JSON.stringify({ success: true, expired: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found ${expiredDeposits.length} expired deposits`);
    
    // Update all expired deposits
    const depositIds = expiredDeposits.map(d => d.id);
    const { error: updateError } = await supabase
      .from('deposits')
      .update({ 
        payment_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .in('id', depositIds);
    
    if (updateError) {
      console.error('Error updating deposits:', updateError);
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Successfully expired ${expiredDeposits.length} deposits`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      expired: expiredDeposits.length,
      deposit_ids: depositIds
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Expiry job error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
