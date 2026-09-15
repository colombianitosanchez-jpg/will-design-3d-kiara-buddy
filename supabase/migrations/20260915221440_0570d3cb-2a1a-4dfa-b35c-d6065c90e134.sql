-- 1) Restringir la lectura pública a columnas seguras (sin credentials)
REVOKE SELECT ON public.payment_methods FROM anon, authenticated;
GRANT SELECT (id, name, type, instructions, display_order, is_active, created_at, updated_at)
  ON public.payment_methods TO anon, authenticated;
GRANT ALL ON public.payment_methods TO service_role;

-- 2) Avisos por cambio de estado de pago
CREATE OR REPLACE FUNCTION private.enqueue_payment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.notification_settings;
  ev text;
  tpl text;
  msg text;
  slot timestamptz;
BEGIN
  IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
    RETURN NEW;
  END IF;

  ev := CASE NEW.payment_status::text
          WHEN 'comprobante_enviado' THEN 'comprobante_enviado'
          WHEN 'pagado' THEN 'pago_confirmado'
          WHEN 'rechazado' THEN 'pago_rechazado'
          ELSE NULL
        END;
  IF ev IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si en la misma operación el pedido avanzó de estado, ese aviso ya se encoló.
  IF ev = 'pago_confirmado' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO cfg FROM public.notification_settings ORDER BY created_at LIMIT 1;
  IF cfg.id IS NULL OR cfg.is_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF COALESCE((cfg.events ->> ev)::boolean, false) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  tpl := COALESCE(cfg.templates ->> ev,
    CASE ev
      WHEN 'comprobante_enviado' THEN 'Hola {{cliente}}, recibimos tu comprobante. Estamos verificando el pago.'
      WHEN 'pago_confirmado' THEN 'Hola {{cliente}}, confirmamos tu pago. ¡Empezamos a preparar tu pedido!'
      ELSE 'Hola {{cliente}}, no pudimos verificar tu comprobante. {{nota}}'
    END);
  msg := replace(tpl, '{{cliente}}', COALESCE(NEW.customer_name, 'cliente'));
  msg := replace(msg, '{{estado}}', ev);
  msg := replace(msg, '{{nota}}', COALESCE(NEW.payment_note, ''));

  slot := public.next_working_slot(now(), cfg.working_days, cfg.work_start_hour, cfg.work_end_hour, cfg.timezone);

  INSERT INTO public.notifications_queue (order_id, customer_phone, message, event, status, scheduled_for)
  VALUES (NEW.id, COALESCE(NEW.customer_phone, ''), msg, ev, 'pending', slot);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_notify_on_payment ON public.orders;
CREATE TRIGGER orders_notify_on_payment
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.enqueue_payment_notification();

-- 3) Nuevos eventos/plantillas por defecto
ALTER TABLE public.notification_settings
  ALTER COLUMN events SET DEFAULT '{"pendiente":true,"empacando":true,"enviado":true,"entregado":false,"cancelado":false,"comprobante_enviado":true,"pago_confirmado":true,"pago_rechazado":true}'::jsonb;
