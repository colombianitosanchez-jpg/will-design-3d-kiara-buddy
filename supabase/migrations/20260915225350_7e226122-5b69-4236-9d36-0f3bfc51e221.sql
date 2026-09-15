ALTER TABLE public.payment_methods ADD COLUMN qr_image_url text;
GRANT SELECT (qr_image_url) ON public.payment_methods TO anon, authenticated;