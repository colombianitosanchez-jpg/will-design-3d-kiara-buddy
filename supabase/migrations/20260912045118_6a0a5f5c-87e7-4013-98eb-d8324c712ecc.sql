ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS custom_buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hide_default_cta boolean NOT NULL DEFAULT false;