CREATE TABLE public.site_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  lead text NOT NULL DEFAULT '',
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  color text NOT NULL DEFAULT 'orange',
  icon text NOT NULL DEFAULT 'boxes',
  kiara_tip text NOT NULL DEFAULT '',
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_services TO anon, authenticated;
GRANT ALL ON public.site_services TO service_role;

ALTER TABLE public.site_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_services public read active"
  ON public.site_services FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "site_services super admin all"
  ON public.site_services FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER site_services_set_updated_at
  BEFORE UPDATE ON public.site_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_services (slug, title, lead, bullets, color, icon, kiara_tip, sort_order) VALUES
('impresion-3d', 'Impresión 3D a Pedido', 'Producimos tus piezas en FDM y resina, con especialidad en gran formato (50×50 cm o más).', '["FDM: PLA, PETG, ABS, TPU, PA, PC","Resina MSLA hasta 12K para alto detalle","Volumen de producción y prototipos únicos","Cotización por WhatsApp con archivo o boceto"]'::jsonb, 'orange', 'boxes', 'Si tu archivo aún no está optimizado, avísanos: revisamos huecos y grosores gratis.', 1),
('modelado-3d', 'Diseño 3D Personalizado', 'Modelamos desde cero usando tus referencias, planos o fotografías. Ideal si no tienes archivo.', '["Modelado paramétrico e ingeniería inversa","Escultura orgánica para figuras y arte","Optimización de piezas para impresión","Entregamos STL/OBJ/STEP"]'::jsonb, 'teal', 'pen-tool', 'Cuéntanos función y tamaño primero — un buen diseño ahorra horas de impresión.', 2),
('servicio-tecnico', 'Mantenimiento y Reparación', 'Servicio técnico especializado para impresoras FDM y de resina de cualquier marca.', '["Diagnóstico y calibración completa","Cambio de hotend, boquillas, correas y termistores","Nivelación automática y firmware","Servicio en taller o a domicilio en Bogotá"]'::jsonb, 'wine', 'wrench', 'Un mantenimiento cada 500 h de impresión evita el 80 % de las fallas comunes.', 3),
('escaneo-3d', 'Escaneo 3D', 'Digitalizamos objetos, espacios y piezas reales para obtener modelos 3D listos para editar o imprimir.', '["Escaneo de objetos pequeños con alta precisión","Escaneo de espacios y ambientes (tours 3D)","Limpieza y reparación de malla","Entrega en STL/OBJ y ingeniería inversa"]'::jsonb, 'teal', 'scan-line', 'Si la pieza es brillante u oscura, la tratamos con spray mate para que el escáner la lea mejor.', 4),
('upgrades', 'Upgrades y Modding', 'Lleva tu impresora al siguiente nivel: velocidad, calidad y confiabilidad.', '["Klipper y placas silenciosas","Cambio a extrusor directo","Boquillas de acero endurecido y bimetálicas","Cámara y sensores de filamento"]'::jsonb, 'orange', 'sparkles', 'Antes de comprar una impresora nueva, pregúntanos por un upgrade — a veces basta.', 5),
('postprocesado', 'Post-procesado y Acabados', 'Convertimos una pieza recién impresa en un producto terminado profesional.', '["Lijado y masillado","Aplicación de primer y pintura","Acabados metalizados, mate o brillo","Ensamble y montaje final"]'::jsonb, 'teal', 'ruler', 'El acabado Premium multiplica el impacto visual — pídelo si vas a exhibir la pieza.', 6),
('prototipado', 'Prototipado Industrial', 'De la idea al prototipo funcional para validar diseño, ergonomía y mercado.', '["Iteraciones rápidas de diseño","Prototipos funcionales y estéticos","Materiales técnicos según requerimiento","Asesoría para producción a escala"]'::jsonb, 'wine', 'shopping-bag', 'Comienza con un prototipo pequeño en PLA — validas la forma antes de invertir más.', 7);