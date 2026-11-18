DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories public read active" ON public.categories FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "categories team read" ON public.categories FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "brands public read" ON public.brands;
CREATE POLICY "brands public read active" ON public.brands FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "brands team read" ON public.brands FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "site_content public read" ON public.site_content;
CREATE POLICY "site_content public read" ON public.site_content FOR SELECT TO anon, authenticated USING (key NOT IN ('kiara_prompt_public','kiara_prompt_internal'));
CREATE POLICY "site_content team read" ON public.site_content FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "category_attributes public read" ON public.category_attributes;
CREATE POLICY "category_attributes public read" ON public.category_attributes FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id));

DROP POLICY IF EXISTS "pav public read" ON public.product_attribute_values;
CREATE POLICY "pav public read" ON public.product_attribute_values FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id));

DROP POLICY IF EXISTS "attributes public read" ON public.attributes;
CREATE POLICY "attributes public read" ON public.attributes FOR SELECT TO anon, authenticated USING (is_filterable = true OR EXISTS (SELECT 1 FROM public.category_attributes ca WHERE ca.attribute_id = id));
CREATE POLICY "attributes team read" ON public.attributes FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "attribute_values public read" ON public.attribute_values;
CREATE POLICY "attribute_values public read" ON public.attribute_values FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.attributes a WHERE a.id = attribute_id));