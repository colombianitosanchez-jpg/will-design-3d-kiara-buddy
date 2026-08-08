-- 1) Vínculo entre servicios del cotizador y secciones de /servicios
ALTER TABLE public.quoter_services
  ADD COLUMN IF NOT EXISTS site_anchor text NOT NULL DEFAULT '';

UPDATE public.quoter_services SET site_anchor = 'impresion-3d' WHERE slug IN ('impresion-fdm','impresion-3d-fdm','fdm') AND site_anchor = '';
UPDATE public.quoter_services SET site_anchor = 'impresion-3d' WHERE slug LIKE '%resina%' AND site_anchor = '';
UPDATE public.quoter_services SET site_anchor = 'impresion-3d' WHERE slug LIKE '%gran-formato%' AND site_anchor = '';
UPDATE public.quoter_services SET site_anchor = 'modelado-3d' WHERE slug LIKE '%diseno%' AND site_anchor = '';
UPDATE public.quoter_services SET site_anchor = 'escaneo-3d' WHERE slug LIKE '%escaneo%' AND site_anchor = '';
UPDATE public.quoter_services SET site_anchor = 'post-procesado' WHERE slug LIKE '%post%' AND site_anchor = '';
UPDATE public.quoter_services SET site_anchor = 'venta-equipos' WHERE slug LIKE '%filamento%' OR slug LIKE '%insumo%' AND site_anchor = '';
UPDATE public.quoter_services SET site_anchor = 'cursos-3d' WHERE slug LIKE '%curso%' AND site_anchor = '';

-- 2) Estado de cotizaciones con valores controlados (via trigger, no CHECK)
ALTER TABLE public.quotes ALTER COLUMN status SET DEFAULT 'nueva';

CREATE OR REPLACE FUNCTION public.validate_quote_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status = '' THEN
    NEW.status := 'nueva';
  END IF;
  IF NEW.status NOT IN ('nueva','cotizada','aprobada','rechazada') THEN
    RAISE EXCEPTION 'Estado de cotización no válido: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quotes_validate_status ON public.quotes;
CREATE TRIGGER quotes_validate_status
BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.validate_quote_status();

-- 3) Lectura y actualización para el equipo
GRANT SELECT, UPDATE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

DROP POLICY IF EXISTS "Staff can read quotes" ON public.quotes;
CREATE POLICY "Staff can read quotes" ON public.quotes
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff can update quotes" ON public.quotes;
CREATE POLICY "Staff can update quotes" ON public.quotes
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 4) Notificación de WhatsApp para cotizaciones nuevas
CREATE OR REPLACE FUNCTION public.enqueue_quote_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.notification_settings;
  msg text;
  slot timestamptz;
BEGIN
  SELECT * INTO cfg FROM public.notification_settings ORDER BY created_at LIMIT 1;
  IF cfg.id IS NULL OR cfg.is_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  msg := 'Hola ' || COALESCE(NULLIF(NEW.customer_name, ''), 'cliente')
      || ', recibimos tu solicitud de cotización'
      || CASE WHEN COALESCE(NEW.service_name, '') <> '' THEN ' de ' || NEW.service_name ELSE '' END
      || '. Estimado en la web: $' || to_char(COALESCE(NEW.estimated_total_cop, 0), 'FM999,999,999')
      || ' COP. Te confirmamos el valor final muy pronto.';

  slot := public.next_working_slot(now(), cfg.working_days, cfg.work_start_hour, cfg.work_end_hour, cfg.timezone);

  INSERT INTO public.notifications_queue (customer_phone, message, event, status, scheduled_for)
  VALUES (COALESCE(NEW.customer_phone, ''), msg, 'cotizacion_nueva', 'pending', slot);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quotes_notify_new ON public.quotes;
CREATE TRIGGER quotes_notify_new
AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.enqueue_quote_notification();