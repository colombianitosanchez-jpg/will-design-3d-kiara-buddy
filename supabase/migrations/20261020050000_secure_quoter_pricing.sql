-- Los servicios y campos del cotizador incluyen costes, multiplicadores y fórmulas internas.
-- El sitio público ahora los consulta mediante funciones del servidor que devuelven solo campos sanitizados.
DROP POLICY IF EXISTS "quoter_services_public_read" ON public.quoter_services;
DROP POLICY IF EXISTS "quoter_fields_public_read" ON public.quoter_fields;

REVOKE SELECT ON public.quoter_services FROM anon;
REVOKE SELECT ON public.quoter_fields FROM anon;

-- El coste global del taller ya no se entrega directamente a navegadores anónimos.
-- getQuotingVars() lo lee desde una función del servidor con service_role.
DROP POLICY IF EXISTS "Cualquiera puede leer las variables de cotizacion" ON public.admin_settings;
REVOKE SELECT (id, quoting_vars) ON public.admin_settings FROM anon;
