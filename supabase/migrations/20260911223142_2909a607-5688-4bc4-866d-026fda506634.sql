CREATE TABLE public.hero_carousel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hero_carousel TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_carousel TO authenticated;
GRANT ALL ON public.hero_carousel TO service_role;

ALTER TABLE public.hero_carousel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hero_carousel_public_read_active" ON public.hero_carousel
  FOR SELECT TO anon, authenticated USING (is_active);

CREATE POLICY "hero_carousel_staff_read_all" ON public.hero_carousel
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "hero_carousel_staff_insert" ON public.hero_carousel
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "hero_carousel_staff_update" ON public.hero_carousel
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "hero_carousel_staff_delete" ON public.hero_carousel
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER hero_carousel_updated_at BEFORE UPDATE ON public.hero_carousel
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "site_media_staff_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "site_media_staff_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "site_media_staff_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'staff'))
  WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "site_media_staff_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'staff'));