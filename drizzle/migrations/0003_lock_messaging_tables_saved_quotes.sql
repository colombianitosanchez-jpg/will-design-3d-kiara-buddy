ALTER TABLE public.messaging_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.messaging_settings FROM anon;
REVOKE ALL ON public.message_templates FROM anon;
GRANT ALL ON public.messaging_settings TO service_role;
GRANT ALL ON public.message_templates TO service_role;
CREATE POLICY "Super admins manage messaging settings" ON public.messaging_settings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active AND ur.role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active AND ur.role = 'super_admin'));
CREATE POLICY "Super admins manage message templates" ON public.message_templates FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active AND ur.role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active AND ur.role = 'super_admin'));
DROP POLICY IF EXISTS "Cualquiera puede guardar una cotizacion" ON public.saved_quotes;
REVOKE INSERT ON public.saved_quotes FROM anon, authenticated;
GRANT ALL ON public.saved_quotes TO service_role;