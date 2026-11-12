DROP POLICY IF EXISTS "quote files public upload" ON storage.objects;
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
CREATE POLICY "product-images staff read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role)));