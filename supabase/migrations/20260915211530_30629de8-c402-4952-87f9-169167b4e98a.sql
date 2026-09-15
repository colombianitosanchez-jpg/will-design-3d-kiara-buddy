-- 1) Solo el equipo aprobado puede ver productos inactivos/borradores.
DROP POLICY IF EXISTS "products auth read all" ON public.products;
CREATE POLICY "products team read all"
ON public.products
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "products auth read active"
ON public.products
FOR SELECT
TO authenticated
USING (active = true);

-- 2) Sacar las funciones SECURITY DEFINER del esquema expuesto por la API.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, app_role) SET SCHEMA private;
ALTER FUNCTION public.is_super_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.enqueue_order_notification() SET SCHEMA private;
ALTER FUNCTION public.enqueue_quote_notification() SET SCHEMA private;

ALTER FUNCTION private.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION private.is_super_admin(uuid) SET search_path = public;
ALTER FUNCTION private.enqueue_order_notification() SET search_path = public;
ALTER FUNCTION private.enqueue_quote_notification() SET search_path = public;

REVOKE ALL ON FUNCTION private.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_super_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.enqueue_order_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.enqueue_quote_notification() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO authenticated, service_role;