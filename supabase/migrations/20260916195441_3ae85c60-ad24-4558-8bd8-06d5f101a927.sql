-- 1) Variables globales de cotización en la fila única de ajustes del panel
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS quoting_vars jsonb NOT NULL DEFAULT '{"fdm_gram_cost":80,"resin_ml_cost":150,"machine_hour_rate":2000,"labor_hour_rate":15000,"default_margin":1.5,"failure_rate_percentage":15}'::jsonb;

-- Lectura pública SOLO de las variables (columna) para que la web calcule precios
GRANT SELECT (id, quoting_vars) ON public.admin_settings TO anon;

CREATE POLICY "Cualquiera puede leer las variables de cotizacion"
ON public.admin_settings
FOR SELECT
TO anon
USING (true);

-- 2) Origen del precio de cada campo del cotizador
ALTER TABLE public.quoter_fields
  ADD COLUMN IF NOT EXISTS price_source text NOT NULL DEFAULT 'fixed';

CREATE OR REPLACE FUNCTION public.validate_quoter_price_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.price_source IS NULL OR NEW.price_source = '' THEN
    NEW.price_source := 'fixed';
  END IF;
  IF NEW.price_source NOT IN ('fixed','fdm_gram_cost','resin_ml_cost','machine_hour_rate','labor_hour_rate') THEN
    RAISE EXCEPTION 'Origen de precio no válido: %', NEW.price_source;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quoter_fields_validate_price_source
BEFORE INSERT OR UPDATE ON public.quoter_fields
FOR EACH ROW EXECUTE FUNCTION public.validate_quoter_price_source();

-- 3) Cotizaciones guardadas y compartibles
CREATE TABLE public.saved_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.saved_quotes TO anon, authenticated;
GRANT ALL ON public.saved_quotes TO service_role;

ALTER TABLE public.saved_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede guardar una cotizacion"
ON public.saved_quotes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Cualquiera con el enlace puede ver la cotizacion"
ON public.saved_quotes
FOR SELECT
TO anon, authenticated
USING (true);