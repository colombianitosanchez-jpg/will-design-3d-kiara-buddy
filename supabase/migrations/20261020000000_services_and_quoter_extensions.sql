-- Add extended columns to site_services and quoter_services for decoupled pricing & rich services
ALTER TABLE public.site_services
  ADD COLUMN IF NOT EXISTS quoter_service_id uuid REFERENCES public.quoter_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_template text,
  ADD COLUMN IF NOT EXISTS requires_file boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS custom_buttons jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.quoter_services
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'formula',
  ADD COLUMN IF NOT EXISTS uses_global_vars boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_display text NOT NULL DEFAULT 'final',
  ADD COLUMN IF NOT EXISTS volume_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;
