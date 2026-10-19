-- Decoupled Quoter/Calculator & Media Attributes Migration
ALTER TABLE public.quoter_services
  ADD COLUMN IF NOT EXISTS has_calculator boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_custom_message text,
  ADD COLUMN IF NOT EXISTS volume_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.quoter_fields
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image';
