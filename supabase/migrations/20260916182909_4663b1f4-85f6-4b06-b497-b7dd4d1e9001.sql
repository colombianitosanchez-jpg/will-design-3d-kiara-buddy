ALTER TYPE public.payment_method_type ADD VALUE IF NOT EXISTS 'gateway_redirect';
ALTER TYPE public.payment_method_type ADD VALUE IF NOT EXISTS 'cash_on_delivery';
ALTER TYPE public.payment_method_type ADD VALUE IF NOT EXISTS 'cash_point';
ALTER TYPE public.payment_method_type ADD VALUE IF NOT EXISTS 'crypto';

ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;
GRANT SELECT (config) ON public.payment_methods TO anon, authenticated;