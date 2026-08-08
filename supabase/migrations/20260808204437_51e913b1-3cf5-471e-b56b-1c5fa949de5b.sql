-- =============== PRICING RULES ===============
CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Reglas principales',
  base_price_per_gram_cop numeric NOT NULL DEFAULT 120,
  machine_hour_cop numeric NOT NULL DEFAULT 6000,
  setup_fee_cop numeric NOT NULL DEFAULT 15000,
  margin_percent numeric NOT NULL DEFAULT 25,
  min_price_cop numeric NOT NULL DEFAULT 20000,
  material_multipliers jsonb NOT NULL DEFAULT '{"PLA":1,"PETG":1.2,"ABS":1.25,"TPU":1.6,"Resina":1.8}'::jsonb,
  finish_multipliers jsonb NOT NULL DEFAULT '{"Ninguno":1,"Basico":1.15,"Premium":1.4}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;
GRANT ALL ON public.pricing_rules TO service_role;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_rules team read" ON public.pricing_rules FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
CREATE POLICY "pricing_rules admin write" ON public.pricing_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER pricing_rules_updated_at BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.pricing_rules (name) VALUES ('Reglas principales');

-- =============== NOTIFICATION SETTINGS ===============
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  working_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  work_start_hour smallint NOT NULL DEFAULT 8,
  work_end_hour smallint NOT NULL DEFAULT 18,
  timezone text NOT NULL DEFAULT 'America/Bogota',
  events jsonb NOT NULL DEFAULT '{"pendiente":true,"empacando":true,"enviado":true,"entregado":false,"cancelado":false}'::jsonb,
  templates jsonb NOT NULL DEFAULT '{"pendiente":"¡Hola {{cliente}}! Recibimos tu pedido en Will Design 3D 🐾 Te avisamos cuando entre a impresión.","empacando":"¡Hola {{cliente}}! Tu pedido ya está en impresión/empaque en Will Design 3D.","enviado":"¡Hola {{cliente}}! Tu pedido fue enviado. Gracias por confiar en Will Design 3D.","entregado":"¡Hola {{cliente}}! Tu pedido fue entregado. ¡Gracias!","cancelado":"Hola {{cliente}}, tu pedido fue cancelado. Escríbenos si necesitas ayuda."}'::jsonb,
  whatsapp_api_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif settings team read" ON public.notification_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
CREATE POLICY "notif settings admin write" ON public.notification_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER notification_settings_updated_at BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.notification_settings (is_enabled) VALUES (true);

-- =============== NOTIFICATIONS QUEUE ===============
CREATE TABLE public.notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_phone text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  event text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_queue_pending_idx ON public.notifications_queue (status, scheduled_for);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications_queue TO authenticated;
GRANT ALL ON public.notifications_queue TO service_role;
ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif queue team read" ON public.notifications_queue FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
CREATE POLICY "notif queue team write" ON public.notifications_queue FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
CREATE TRIGGER notifications_queue_updated_at BEFORE UPDATE ON public.notifications_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== SCHEDULING HELPER ===============
CREATE OR REPLACE FUNCTION public.next_working_slot(
  _from timestamptz,
  _days smallint[],
  _start_hour smallint,
  _end_hour smallint,
  _tz text
) RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  local_ts timestamp;
  dow smallint;
  i int := 0;
BEGIN
  local_ts := (_from AT TIME ZONE _tz);
  LOOP
    dow := EXTRACT(ISODOW FROM local_ts)::smallint;
    IF dow = ANY(_days) THEN
      IF EXTRACT(HOUR FROM local_ts) < _start_hour THEN
        local_ts := date_trunc('day', local_ts) + make_interval(hours => _start_hour);
        EXIT;
      ELSIF EXTRACT(HOUR FROM local_ts) < _end_hour THEN
        EXIT;
      END IF;
    END IF;
    local_ts := date_trunc('day', local_ts) + interval '1 day' + make_interval(hours => _start_hour);
    i := i + 1;
    EXIT WHEN i > 14;
  END LOOP;
  RETURN local_ts AT TIME ZONE _tz;
END;
$$;

-- =============== ORDER STATUS -> QUEUE TRIGGER ===============
CREATE OR REPLACE FUNCTION public.enqueue_order_notification()
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
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO cfg FROM public.notification_settings ORDER BY created_at LIMIT 1;
  IF cfg.id IS NULL OR cfg.is_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  ev := NEW.status::text;
  IF COALESCE((cfg.events ->> ev)::boolean, false) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  tpl := COALESCE(cfg.templates ->> ev, 'Hola {{cliente}}, tu pedido cambió de estado a ' || ev || '.');
  msg := replace(replace(tpl, '{{cliente}}', COALESCE(NEW.customer_name, 'cliente')), '{{estado}}', ev);

  slot := public.next_working_slot(now(), cfg.working_days, cfg.work_start_hour, cfg.work_end_hour, cfg.timezone);

  INSERT INTO public.notifications_queue (order_id, customer_phone, message, event, status, scheduled_for)
  VALUES (NEW.id, COALESCE(NEW.customer_phone, ''), msg, ev, 'pending', slot);

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_notify_on_status
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enqueue_order_notification();