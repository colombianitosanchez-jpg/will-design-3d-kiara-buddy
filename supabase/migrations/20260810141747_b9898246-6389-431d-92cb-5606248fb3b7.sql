ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'general';