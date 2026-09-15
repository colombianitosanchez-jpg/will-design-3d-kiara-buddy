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
