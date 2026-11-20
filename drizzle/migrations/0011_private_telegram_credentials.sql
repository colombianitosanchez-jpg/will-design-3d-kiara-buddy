CREATE TABLE public.integration_secrets (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_secrets TO service_role;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.integration_secrets(key, value)
SELECT k, templates->>('_' || k) FROM public.notification_settings, unnest(array['telegram_bot_token','telegram_chat_id']) k
WHERE coalesce(templates->>('_' || k),'') <> ''
ON CONFLICT (key) DO NOTHING;

UPDATE public.notification_settings SET templates = templates - '_telegram_bot_token' - '_telegram_chat_id';