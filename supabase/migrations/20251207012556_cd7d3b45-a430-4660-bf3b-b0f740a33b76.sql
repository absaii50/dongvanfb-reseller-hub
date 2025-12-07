-- Create popups table for geo-targeted notifications
CREATE TABLE public.popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  button_text TEXT DEFAULT 'OK',
  button_link TEXT,
  target_countries TEXT[] DEFAULT '{}', -- Empty array = Universal (all countries)
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = show first
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

-- Anyone can read active popups (public content)
CREATE POLICY "Anyone can read active popups" 
ON public.popups 
FOR SELECT 
USING (is_active = true);

-- Admins can manage all popups
CREATE POLICY "Admins can manage popups" 
ON public.popups 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_popups_updated_at
BEFORE UPDATE ON public.popups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();