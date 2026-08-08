-- 1) Categorías jerárquicas
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS image_url text;

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON public.categories(slug);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON public.categories(parent_id);

-- 2) Marcas
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 3) Atributos
CREATE TABLE IF NOT EXISTS public.attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  input_type text NOT NULL DEFAULT 'select',
  is_filterable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.attributes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attributes TO authenticated;
GRANT ALL ON public.attributes TO service_role;
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attributes public read" ON public.attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "attributes team write" ON public.attributes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));
CREATE TRIGGER attributes_updated_at BEFORE UPDATE ON public.attributes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  slug text NOT NULL,
  label text NOT NULL,
  color_hex text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attribute_id, slug)
);
GRANT SELECT ON public.attribute_values TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attribute_values TO authenticated;
GRANT ALL ON public.attribute_values TO service_role;
ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attribute_values public read" ON public.attribute_values FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "attribute_values team write" ON public.attribute_values FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));

CREATE TABLE IF NOT EXISTS public.category_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (category_id, attribute_id)
);
GRANT SELECT ON public.category_attributes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_attributes TO authenticated;
GRANT ALL ON public.category_attributes TO service_role;
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "category_attributes public read" ON public.category_attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "category_attributes team write" ON public.category_attributes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));

CREATE TABLE IF NOT EXISTS public.product_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  attribute_value_id uuid REFERENCES public.attribute_values(id) ON DELETE CASCADE,
  text_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, attribute_id, attribute_value_id)
);
GRANT SELECT ON public.product_attribute_values TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_attribute_values TO authenticated;
GRANT ALL ON public.product_attribute_values TO service_role;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pav public read" ON public.product_attribute_values FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pav team write" ON public.product_attribute_values FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));
CREATE INDEX IF NOT EXISTS pav_product_idx ON public.product_attribute_values(product_id);
CREATE INDEX IF NOT EXISTS pav_value_idx ON public.product_attribute_values(attribute_value_id);

-- 4) Menú por referencia
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS target_kind text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attribute_value_id uuid REFERENCES public.attribute_values(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_anchor text,
  ADD COLUMN IF NOT EXISTS custom_url text,
  ADD COLUMN IF NOT EXISTS site_page text;

-- 5) Rama completa de categorías
CREATE OR REPLACE FUNCTION public.category_descendants(_slug text)
RETURNS TABLE (id uuid, slug text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT c.id, c.slug FROM public.categories c WHERE c.slug = _slug
    UNION ALL
    SELECT c.id, c.slug FROM public.categories c JOIN tree t ON c.parent_id = t.id
  )
  SELECT id, slug FROM tree;
$$;
GRANT EXECUTE ON FUNCTION public.category_descendants(text) TO anon, authenticated, service_role;