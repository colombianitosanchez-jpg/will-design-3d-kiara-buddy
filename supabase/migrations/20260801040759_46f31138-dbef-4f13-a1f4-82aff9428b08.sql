CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  design_state text NOT NULL DEFAULT '',
  size_label text NOT NULL DEFAULT '',
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  material text NOT NULL DEFAULT '',
  finish text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  file_name text,
  file_path text,
  status text NOT NULL DEFAULT 'nueva',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes staff read" ON public.quotes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "quotes staff update" ON public.quotes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "quotes admin delete" ON public.quotes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER quotes_set_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "quote files public upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'quote-files');
CREATE POLICY "quote files staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quote-files' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));
CREATE POLICY "quote files admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'quote-files' AND has_role(auth.uid(), 'admin'::app_role));