REVOKE ALL ON FUNCTION public.enqueue_quote_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_quote_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_order_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;