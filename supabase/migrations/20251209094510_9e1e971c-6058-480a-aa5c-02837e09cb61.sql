-- Create popup_analytics table for tracking views, clicks, and dismissals
CREATE TABLE public.popup_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id uuid NOT NULL REFERENCES public.popups(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'dismiss')),
  country_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.popup_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (public tracking)
CREATE POLICY "Anyone can insert popup analytics"
ON public.popup_analytics
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view popup analytics"
ON public.popup_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster aggregation queries
CREATE INDEX idx_popup_analytics_popup_id ON public.popup_analytics(popup_id);
CREATE INDEX idx_popup_analytics_event_type ON public.popup_analytics(event_type);