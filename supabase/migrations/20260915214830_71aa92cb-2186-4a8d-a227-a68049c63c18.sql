CREATE TYPE public.payment_method_type AS ENUM ('manual_transfer', 'gateway');
CREATE TYPE public.payment_status AS ENUM ('esperando_pago', 'comprobante_enviado', 'pagado', 'rechazado');

CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.payment_method_type NOT NULL DEFAULT 'manual_transfer',
  instructions text NOT NULL DEFAULT '',
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT (id, name, type, instructions, display_order, is_active) ON public.payment_methods TO anon;
GRANT SELECT (id, name, type, instructions, display_order, is_active) ON public.payment_methods TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment methods public read active" ON public.payment_methods
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "payment methods super admin all" ON public.payment_methods
  FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));

CREATE TRIGGER payment_methods_set_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders
  ADD COLUMN payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN payment_method_name text,
  ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'esperando_pago',
  ADD COLUMN payment_reference text,
  ADD COLUMN payment_reported_at timestamptz,
  ADD COLUMN payment_confirmed_at timestamptz,
  ADD COLUMN payment_note text,
  ADD COLUMN public_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX orders_public_token_key ON public.orders (public_token);

CREATE OR REPLACE FUNCTION private.orders_payment_autostatus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'pagado' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'pagado') THEN
    IF NEW.payment_confirmed_at IS NULL THEN
      NEW.payment_confirmed_at := now();
    END IF;
    IF NEW.status = 'pendiente' THEN
      NEW.status := 'empacando';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_payment_autostatus
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION private.orders_payment_autostatus();