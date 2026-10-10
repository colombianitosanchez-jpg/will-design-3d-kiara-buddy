GRANT SELECT (allowed_payment_method_ids) ON public.products TO anon, authenticated;
GRANT INSERT (allowed_payment_method_ids), UPDATE (allowed_payment_method_ids) ON public.products TO authenticated;