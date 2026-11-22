DROP POLICY IF EXISTS "quoter_services_staff_all" ON public.quoter_services;
DROP POLICY IF EXISTS "quoter_fields_staff_all" ON public.quoter_fields;
CREATE POLICY "quoter_services_staff_read" ON public.quoter_services FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "quoter_services_super_admin_write" ON public.quoter_services FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));
CREATE POLICY "quoter_fields_staff_read" ON public.quoter_fields FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "quoter_fields_super_admin_write" ON public.quoter_fields FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));