CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  slug text NOT NULL,
  link_type text CHECK (link_type IN ('tienda_categoria','tienda_categoria_marca','servicio_anchor','personalizado')),
  link_value text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX menu_items_parent_idx ON public.menu_items(parent_id, display_order);

GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items public read active" ON public.menu_items
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "menu_items admin read all" ON public.menu_items
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "menu_items admin insert" ON public.menu_items
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "menu_items admin update" ON public.menu_items
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "menu_items admin delete" ON public.menu_items
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed data
WITH lvl1 AS (
  INSERT INTO public.menu_items (label, slug, display_order) VALUES
    ('Suministros','suministros',1),
    ('Impresoras 3D','impresoras-3d',2),
    ('Servicios 3D','servicios-3d',3)
  RETURNING id, slug
),
lvl2 AS (
  INSERT INTO public.menu_items (parent_id, label, slug, link_type, link_value, display_order)
  SELECT l.id, v.label, v.slug, v.link_type, v.link_value, v.display_order
  FROM (VALUES
    ('suministros','Materiales 3D','materiales-3d',NULL,NULL,1),
    ('suministros','Escáner 3D','escaner-3d','tienda_categoria','escaner-3d',2),
    ('suministros','Lápices 3D','lapices-3d','tienda_categoria','lapices-3d',3),
    ('impresoras-3d','Impresoras 3D Filamento','impresoras-filamento',NULL,NULL,1),
    ('impresoras-3d','Impresoras 3D Resina','impresoras-resina',NULL,NULL,2),
    ('servicios-3d','Impresión 3D','impresion-3d','servicio_anchor','impresion-3d',1),
    ('servicios-3d','Escaneo 3D','escaneo-3d','servicio_anchor','escaneo-3d',2),
    ('servicios-3d','Modelado 3D','modelado-3d','servicio_anchor','modelado-3d',3),
    ('servicios-3d','Servicio Técnico','servicio-tecnico','servicio_anchor','servicio-tecnico',4),
    ('servicios-3d','Cursos 3D','cursos-3d',NULL,NULL,5)
  ) AS v(parent_slug,label,slug,link_type,link_value,display_order)
  JOIN lvl1 l ON l.slug = v.parent_slug
  RETURNING id, slug
)
INSERT INTO public.menu_items (parent_id, label, slug, link_type, link_value, display_order)
SELECT p.id, v.label, v.slug, v.link_type, v.link_value, v.display_order
FROM (VALUES
  ('materiales-3d','Filamentos','filamentos','tienda_categoria','filamentos',1),
  ('materiales-3d','Resinas','resinas','tienda_categoria','resinas',2),
  ('impresoras-filamento','Creality','creality','tienda_categoria_marca','impresoras-filamento::creality',1),
  ('impresoras-filamento','Anycubic','anycubic','tienda_categoria_marca','impresoras-filamento::anycubic',2),
  ('impresoras-filamento','Bambu Lab','bambu-lab','tienda_categoria_marca','impresoras-filamento::bambu-lab',3),
  ('impresoras-filamento','Voxelab','voxelab','tienda_categoria_marca','impresoras-filamento::voxelab',4),
  ('impresoras-filamento','Flashforge','flashforge','tienda_categoria_marca','impresoras-filamento::flashforge',5),
  ('impresoras-resina','Anycubic','anycubic','tienda_categoria_marca','impresoras-resina::anycubic',1),
  ('impresoras-resina','Elegoo','elegoo','tienda_categoria_marca','impresoras-resina::elegoo',2),
  ('impresoras-resina','Phrozen','phrozen','tienda_categoria_marca','impresoras-resina::phrozen',3),
  ('impresoras-resina','Creality','creality','tienda_categoria_marca','impresoras-resina::creality',4),
  ('cursos-3d','Modelado 3D','cursos-3d-modelado','servicio_anchor','cursos-3d-modelado',1),
  ('cursos-3d','Impresión 3D','cursos-3d-impresion','servicio_anchor','cursos-3d-impresion',2),
  ('cursos-3d','Mantenimiento de impresoras','cursos-3d-mantenimiento','servicio_anchor','cursos-3d-mantenimiento',3)
) AS v(parent_slug,label,slug,link_type,link_value,display_order)
JOIN lvl2 p ON p.slug = v.parent_slug;