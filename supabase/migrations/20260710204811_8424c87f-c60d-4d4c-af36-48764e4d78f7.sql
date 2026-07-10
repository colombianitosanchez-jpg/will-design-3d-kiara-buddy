
CREATE POLICY "product-images public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "product-images admin write"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
