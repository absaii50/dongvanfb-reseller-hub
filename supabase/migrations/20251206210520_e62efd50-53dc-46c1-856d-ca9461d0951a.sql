-- Add expires_at column to deposits table
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Update existing deposits to have expiry 1 hour from creation
UPDATE public.deposits SET expires_at = created_at + INTERVAL '1 hour' WHERE expires_at IS NULL;

-- Create trigger function to auto-set expiry on new deposits
CREATE OR REPLACE FUNCTION public.set_deposit_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NEW.created_at + INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-setting expiry
DROP TRIGGER IF EXISTS deposits_set_expiry ON public.deposits;
CREATE TRIGGER deposits_set_expiry
  BEFORE INSERT ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.set_deposit_expiry();

-- Enable realtime for deposits table
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;