-- Add notification preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{
  "order_confirmations": true,
  "deposit_confirmations": true,
  "low_balance_alerts": true,
  "promotional_emails": false
}'::jsonb;