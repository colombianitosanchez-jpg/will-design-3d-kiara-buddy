CREATE TABLE public.llm_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL,
  model text NOT NULL,
  api_key text,
  priority integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.llm_providers TO authenticated;
GRANT ALL ON public.llm_providers TO service_role;

ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "llm_providers admin read" ON public.llm_providers
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "llm_providers admin write" ON public.llm_providers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER llm_providers_updated_at
  BEFORE UPDATE ON public.llm_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX llm_providers_priority_idx ON public.llm_providers (priority, created_at);