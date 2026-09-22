-- 1) admin_settings: el público solo puede leer las variables de cotización
REVOKE SELECT ON public.admin_settings FROM anon;
REVOKE INSERT, UPDATE ON public.admin_settings FROM anon;
GRANT SELECT (id, quoting_vars) ON public.admin_settings TO anon;

-- 2) payment_methods: credenciales nunca legibles desde el navegador
REVOKE SELECT ON public.payment_methods FROM anon, authenticated;
GRANT SELECT (id, name, type, instructions, display_order, is_active, qr_image_url, config, created_at, updated_at)
  ON public.payment_methods TO anon, authenticated;

-- 3) saved_quotes: no se pueden enumerar desde el navegador; solo el servidor las lee
DROP POLICY IF EXISTS "Cualquiera con el enlace puede ver la cotizacion" ON public.saved_quotes;
REVOKE SELECT ON public.saved_quotes FROM anon, authenticated;