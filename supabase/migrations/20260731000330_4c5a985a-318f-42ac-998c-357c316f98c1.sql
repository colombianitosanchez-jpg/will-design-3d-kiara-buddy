ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.brands
SET slug = trim(both '-' from regexp_replace(lower(translate(name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiounAEIOUN')), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_key ON public.brands (slug);