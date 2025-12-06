-- Add live_duration column to products table
ALTER TABLE public.products ADD COLUMN live_duration text DEFAULT NULL;