DROP POLICY IF EXISTS "Cualquiera puede leer las variables de cotizacion" ON public.admin_settings;
REVOKE SELECT ON public.admin_settings FROM anon;
GRANT ALL ON public.admin_settings TO service_role;