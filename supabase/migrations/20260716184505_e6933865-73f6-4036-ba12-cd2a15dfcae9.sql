
-- Remove bootstrap RPC that allowed any signed-in user to claim admin.
DROP FUNCTION IF EXISTS public.claim_first_admin();

-- Restrict order_items and orders inserts to admin/staff only.
-- (No public checkout flow exists; anon insert allowed attaching items to any order.)
DROP POLICY IF EXISTS "order_items anyone create" ON public.order_items;
DROP POLICY IF EXISTS "orders anyone create" ON public.orders;

CREATE POLICY "orders staff create" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "order_items staff create" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
    AND quantity > 0 AND unit_price_cop >= 0
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id)
  );
