ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variant_label text NOT NULL DEFAULT 'Color';