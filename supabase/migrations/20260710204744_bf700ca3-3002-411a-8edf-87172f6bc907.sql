
-- fix search_path on trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Restrict SECURITY DEFINER function execution to intended callers only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- Tighten anon-INSERT policies: require basic sanity (email + address non-empty).
DROP POLICY IF EXISTS "orders anyone create" ON public.orders;
CREATE POLICY "orders anyone create" ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(customer_name) > 0
    AND length(customer_email) > 3
    AND length(shipping_address) > 0
    AND status = 'pendiente'
  );

DROP POLICY IF EXISTS "order_items anyone create" ON public.order_items;
CREATE POLICY "order_items anyone create" ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (quantity > 0 AND unit_price_cop >= 0);
