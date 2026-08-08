-- Servicios del cotizador
CREATE TABLE public.quoter_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'printer',
  base_price_cop numeric NOT NULL DEFAULT 0,
  min_price_cop numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 0,
  allow_quantity boolean NOT NULL DEFAULT true,
  allow_file boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quoter_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quoter_services TO authenticated;
GRANT ALL ON public.quoter_services TO service_role;
ALTER TABLE public.quoter_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quoter_services_public_read" ON public.quoter_services FOR SELECT USING (is_active = true);
CREATE POLICY "quoter_services_staff_all" ON public.quoter_services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE TRIGGER quoter_services_updated_at BEFORE UPDATE ON public.quoter_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campos (preguntas) por servicio
CREATE TABLE public.quoter_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.quoter_services(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  help text NOT NULL DEFAULT '',
  input_type text NOT NULL DEFAULT 'slider',
  min_value numeric NOT NULL DEFAULT 0,
  max_value numeric NOT NULL DEFAULT 100,
  step_value numeric NOT NULL DEFAULT 1,
  default_value text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  price_per_unit_cop numeric NOT NULL DEFAULT 0,
  multiplier numeric NOT NULL DEFAULT 1,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, key)
);
GRANT SELECT ON public.quoter_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quoter_fields TO authenticated;
GRANT ALL ON public.quoter_fields TO service_role;
ALTER TABLE public.quoter_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quoter_fields_public_read" ON public.quoter_fields FOR SELECT USING (is_active = true);
CREATE POLICY "quoter_fields_staff_all" ON public.quoter_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE TRIGGER quoter_fields_updated_at BEFORE UPDATE ON public.quoter_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cotizaciones: servicio, respuestas y total estimado
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.quoter_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS estimated_total_cop numeric NOT NULL DEFAULT 0;

-- Semilla de servicios
INSERT INTO public.quoter_services (slug,name,tagline,description,icon,base_price_cop,min_price_cop,margin_percent,allow_quantity,allow_file,sort_order) VALUES
('impresion-fdm','Impresión 3D FDM','Piezas en filamento','Impresión por filamento: prototipos, repuestos y piezas funcionales.','printer',15000,25000,25,true,true,1),
('impresion-resina','Impresión 3D en resina','Máximo detalle','Resina SLA para miniaturas, joyería y piezas de alta definición.','sparkles',18000,35000,25,true,true,2),
('gran-formato','Gran formato','50x50 cm o más','Nuestra especialidad: piezas grandes, publicidad y props.','package',40000,120000,20,true,true,3),
('diseno-3d','Diseño y modelado 3D','Creamos el archivo','Modelado desde cero o a partir de tu idea, foto o plano.','pencil-ruler',30000,60000,20,true,true,4),
('escaneo-3d','Escaneo 3D','Digitaliza tu objeto','Escaneo de objetos reales y entrega de archivo listo para imprimir.','scan',35000,70000,20,true,true,5),
('post-procesado','Post-procesado y pintura','Acabado profesional','Lijado, imprimación, pintura y acabados premium.','paintbrush',12000,25000,25,true,true,6),
('filamentos','Filamentos e insumos','Cotiza tu pedido','Cotización por rollos de filamento, resinas y repuestos.','boxes',0,0,0,true,false,7),
('cursos','Cursos y capacitación','Aprende 3D','Clases personalizadas de modelado e impresión 3D.','graduation-cap',0,80000,15,true,false,8);

-- Semilla de campos
WITH s AS (SELECT id, slug FROM public.quoter_services)
INSERT INTO public.quoter_fields (service_id,key,label,help,input_type,min_value,max_value,step_value,default_value,unit,price_per_unit_cop,multiplier,options,sort_order)
SELECT s.id, f.key, f.label, f.help, f.input_type, f.min_value, f.max_value, f.step_value, f.default_value, f.unit, f.ppu, 1, f.options, f.sort_order
FROM s JOIN (VALUES
  ('impresion-fdm','peso','Peso aproximado de la pieza','Si no lo sabes, deja el valor sugerido; lo ajustamos al revisar tu archivo.','slider',10,3000,10,'150','g',140,'[]'::jsonb,1),
  ('impresion-fdm','alto','Altura aproximada','Nos ayuda a estimar el tiempo de impresión.','slider',1,50,1,'12','cm',1500,'[]'::jsonb,2),
  ('impresion-fdm','material','Material','Cada material cambia resistencia, flexibilidad y precio.','select',0,0,1,'PLA','',0,'[{"label":"PLA (uso general)","value":"PLA","multiplier":1,"add_cop":0},{"label":"PETG (resistente)","value":"PETG","multiplier":1.2,"add_cop":0},{"label":"ABS (técnico)","value":"ABS","multiplier":1.25,"add_cop":0},{"label":"TPU (flexible)","value":"TPU","multiplier":1.6,"add_cop":0}]'::jsonb,3),
  ('impresion-fdm','calidad','Calidad / detalle','Más detalle = más tiempo de máquina.','select',0,0,1,'estandar','',0,'[{"label":"Borrador (rápido)","value":"borrador","multiplier":0.85,"add_cop":0},{"label":"Estándar","value":"estandar","multiplier":1,"add_cop":0},{"label":"Alta definición","value":"alta","multiplier":1.35,"add_cop":0}]'::jsonb,4),
  ('impresion-fdm','acabado','Acabado','Desde limpieza básica hasta pintura completa.','select',0,0,1,'estandar','',0,'[{"label":"Estándar (limpieza)","value":"estandar","multiplier":1,"add_cop":0},{"label":"Preparado (lijado + primer)","value":"preparado","multiplier":1.15,"add_cop":8000},{"label":"Premium (pintado)","value":"premium","multiplier":1.4,"add_cop":25000}]'::jsonb,5),
  ('impresion-fdm','urgencia','¿Lo necesitas urgente?','Producción prioritaria en 24-48 h.','toggle',0,0,1,'no','',0,'[{"label":"Sí, urgente","value":"si","multiplier":1.3,"add_cop":0}]'::jsonb,6),

  ('impresion-resina','peso','Peso aproximado','Las piezas en resina suelen ser pequeñas.','slider',5,800,5,'60','g',420,'[]'::jsonb,1),
  ('impresion-resina','detalle','Nivel de detalle','Capas más finas dan mejor acabado.','select',0,0,1,'50','micras',0,'[{"label":"50 micras (estándar)","value":"50","multiplier":1,"add_cop":0},{"label":"35 micras (fino)","value":"35","multiplier":1.2,"add_cop":0},{"label":"25 micras (ultra)","value":"25","multiplier":1.45,"add_cop":0}]'::jsonb,2),
  ('impresion-resina','pintura','Pintura y acabado','Ideal para miniaturas y coleccionables.','select',0,0,1,'no','',0,'[{"label":"Sin pintar","value":"no","multiplier":1,"add_cop":0},{"label":"Pintura básica","value":"basica","multiplier":1,"add_cop":30000},{"label":"Pintura de colección","value":"pro","multiplier":1,"add_cop":90000}]'::jsonb,3),

  ('gran-formato','largo','Largo','Medida aproximada de la pieza terminada.','slider',30,300,5,'60','cm',2200,'[]'::jsonb,1),
  ('gran-formato','ancho','Ancho','','slider',10,200,5,'50','cm',1800,'[]'::jsonb,2),
  ('gran-formato','alto','Alto','','slider',10,250,5,'50','cm',1800,'[]'::jsonb,3),
  ('gran-formato','relleno','Resistencia / relleno','Más relleno = pieza más fuerte y más material.','select',0,0,1,'medio','',0,'[{"label":"Liviano (decorativo)","value":"liviano","multiplier":0.9,"add_cop":0},{"label":"Medio","value":"medio","multiplier":1,"add_cop":0},{"label":"Reforzado (estructural)","value":"reforzado","multiplier":1.3,"add_cop":0}]'::jsonb,4),
  ('gran-formato','acabado','Acabado final','','select',0,0,1,'estandar','',0,'[{"label":"Estándar","value":"estandar","multiplier":1,"add_cop":0},{"label":"Lijado + primer","value":"preparado","multiplier":1.15,"add_cop":40000},{"label":"Pintado profesional","value":"premium","multiplier":1.35,"add_cop":150000}]'::jsonb,5),

  ('diseno-3d','horas','Horas de diseño estimadas','Si no sabes cuántas, deja el valor sugerido.','slider',1,60,1,'4','h',45000,'[]'::jsonb,1),
  ('diseno-3d','punto_partida','¿Con qué empezamos?','','select',0,0,1,'idea','',0,'[{"label":"Solo una idea","value":"idea","multiplier":1.2,"add_cop":0},{"label":"Fotos o bocetos","value":"fotos","multiplier":1,"add_cop":0},{"label":"Plano o medidas exactas","value":"plano","multiplier":0.85,"add_cop":0}]'::jsonb,2),
  ('diseno-3d','complejidad','Complejidad','','slider',1,5,1,'3','/5',0,'[]'::jsonb,3),

  ('escaneo-3d','tamano','Tamaño del objeto','','select',0,0,1,'mediano','',0,'[{"label":"Pequeño (hasta 20 cm)","value":"pequeno","multiplier":1,"add_cop":0},{"label":"Mediano (hasta 60 cm)","value":"mediano","multiplier":1.4,"add_cop":0},{"label":"Grande (más de 60 cm)","value":"grande","multiplier":2,"add_cop":0}]'::jsonb,1),
  ('escaneo-3d','piezas','Cantidad de objetos a escanear','','slider',1,20,1,'1','objetos',25000,'[]'::jsonb,2),
  ('escaneo-3d','limpieza','Optimización del archivo','Reparamos y dejamos el modelo listo para imprimir.','toggle',0,0,1,'si','',0,'[{"label":"Sí, optimizar","value":"si","multiplier":1,"add_cop":40000}]'::jsonb,3),

  ('post-procesado','piezas','Cantidad de piezas','','slider',1,50,1,'1','piezas',9000,'[]'::jsonb,1),
  ('post-procesado','tamano','Tamaño promedio','','select',0,0,1,'mediano','',0,'[{"label":"Pequeño","value":"pequeno","multiplier":1,"add_cop":0},{"label":"Mediano","value":"mediano","multiplier":1.5,"add_cop":0},{"label":"Grande","value":"grande","multiplier":2.2,"add_cop":0}]'::jsonb,2),
  ('post-procesado','trabajo','Trabajo requerido','','select',0,0,1,'lijado','',0,'[{"label":"Lijado","value":"lijado","multiplier":1,"add_cop":0},{"label":"Lijado + primer","value":"primer","multiplier":1.3,"add_cop":0},{"label":"Pintura completa","value":"pintura","multiplier":1.9,"add_cop":0},{"label":"Pintura + barniz premium","value":"premium","multiplier":2.4,"add_cop":0}]'::jsonb,3),

  ('filamentos','rollos','Cantidad de rollos','Descuentos por volumen al confirmar el pedido.','slider',1,50,1,'2','rollos',85000,'[]'::jsonb,1),
  ('filamentos','tipo','Tipo de insumo','','select',0,0,1,'pla','',0,'[{"label":"PLA 1 kg","value":"pla","multiplier":1,"add_cop":0},{"label":"PETG 1 kg","value":"petg","multiplier":1.2,"add_cop":0},{"label":"ABS 1 kg","value":"abs","multiplier":1.15,"add_cop":0},{"label":"TPU 1 kg","value":"tpu","multiplier":1.7,"add_cop":0},{"label":"Resina 1 L","value":"resina","multiplier":1.5,"add_cop":0}]'::jsonb,2),
  ('filamentos','envio','Envío a mi ciudad','','toggle',0,0,1,'si','',0,'[{"label":"Sí, con envío","value":"si","multiplier":1,"add_cop":18000}]'::jsonb,3),

  ('cursos','horas','Horas de clase','','slider',2,40,2,'8','h',55000,'[]'::jsonb,1),
  ('cursos','modalidad','Modalidad','','select',0,0,1,'virtual','',0,'[{"label":"Virtual","value":"virtual","multiplier":1,"add_cop":0},{"label":"Presencial","value":"presencial","multiplier":1.3,"add_cop":0}]'::jsonb,2),
  ('cursos','personas','Cantidad de personas','','slider',1,15,1,'1','personas',0,'[]'::jsonb,3),
  ('cursos','nivel','Nivel','','select',0,0,1,'basico','',0,'[{"label":"Básico","value":"basico","multiplier":1,"add_cop":0},{"label":"Intermedio","value":"intermedio","multiplier":1.15,"add_cop":0},{"label":"Avanzado","value":"avanzado","multiplier":1.35,"add_cop":0}]'::jsonb,3)
) AS f(slug,key,label,help,input_type,min_value,max_value,step_value,default_value,unit,ppu,options,sort_order)
ON f.slug = s.slug;