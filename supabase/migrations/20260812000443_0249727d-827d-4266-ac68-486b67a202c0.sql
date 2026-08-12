ALTER TABLE public.llm_providers
  ADD COLUMN IF NOT EXISTS temperature numeric NOT NULL DEFAULT 0.2,
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS max_tokens integer;