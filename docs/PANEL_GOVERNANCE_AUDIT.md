# AUDITORÍA DE GOBERNANZA Y REORGANIZACIÓN DEL PANEL — WILL DESIGN 3D

**PROYECTO:** Will Design 3D
**OBJETIVO:** Definir una arquitectura de gobernanza donde **cada configuración tenga una única fuente de verdad y un solo lugar de administración** dentro del panel `/panel/*`.
**ESTADO:** Auditado y Propuesto (Read-Only)

---

## 1. Tabla de Dispersión Actual

Actualmente, las configuraciones del sitio están fragmentadas en 14 módulos planos sin agrupación lógica. A continuación se detalla la dispersión actual por área de negocio:

| Dominio / Funcionalidad | Rutas del Panel Donde Se Configura Actualmente | Tablas de Supabase / Keys de `site_content` Tocadas | Diagnóstico de Dispersión |
|---|---|---|---|
| **Asistente Kiara IA** | 1. `/panel/contenido` (Pestaña Kiara)<br>2. `/panel/llm`<br>3. `/panel/conocimiento` | 1. `site_content` (`kiara_message`, `kiara_image_url`)<br>2. `site_content` (`kiara_prompt_internal`, `kiara_prompt_public`, `kiara_model`, `kiara_temperature`)<br>3. Tabla `kiara_knowledge` | **Triplemente disperso:** La foto/saludo está en Contenido, la personalidad/prompts en LLM, y la memoria en Conocimiento. |
| **Identidad de Marca & SEO** | 1. `/panel/contenido` (Pestaña Marca y SEO)<br>2. Campo `site_logo_url` ausente | `site_content` (`site_title`, `site_description`, `site_favicon_url`, `site_meta_thumbnail_url`, `site_business_name`, `site_area_served`, `site_logo_url`) | **Omitido / Incompleto:** Los datos SEO globales se editan en Contenido, pero no existe campo para el Logotipo Principal. |
| **Página de Inicio (Home)** | 1. `/panel/contenido` (Pestañas Inicio, Portafolio, Nosotros)<br>2. `/panel/carrusel`<br>3. `/panel/equipo` | 1. `site_content` (`hero_title`, `hero_subtitle`, `hero_stats`, `home_sections_order`, `portfolio_images`, `about_short`)<br>2. Tabla `hero_carousel`<br>3. Tabla `team_members` | **Fragmentado:** El orden y los textos del inicio están en Contenido, las imágenes del carrusel en un módulo separado, y el equipo en otro. |
| **Catálogo & Productos** | 1. `/panel/productos`<br>2. `/panel/taxonomia` | 1. Tablas `products`, `product_attribute_values`<br>2. Tablas `categories`, `brands`, `attributes`, `attribute_values`, `category_attributes` | **Dividido:** La carga de productos está separada de la creación de marcas, categorías y atributos filtrables. |
| **Cotizador & Servicios** | 1. `/panel/servicios`<br>2. `/panel/cotizador`<br>3. `/panel/cotizaciones` | 1. Tabla `site_services`<br>2. Tablas `quoter_services`, `quoter_fields`, `quoter_options`, `quoting_vars`<br>3. Tablas `quotations`, `pricing_rules` | **Duplicidad conceptual:** Los servicios generales (impresión FDM, escaneo) están separados de la configuración de fórmulas del cotizador. |
| **Ventas & Operaciones** | 1. `/panel/pedidos`<br>2. `/panel/pagos`<br>3. `/panel/notificaciones` | 1. Tablas `orders`, `order_requests`<br>2. Tabla `payment_methods`<br>3. Tabla `notifications_settings` / `site_content` | **Desconectado:** Los pedidos no muestran directamente los métodos de pago disponibles ni las reglas de notificación. |

---

## 2. Análisis de Conflictos SEO y Metadatos Globales

### Jerarquía de Fuentes de Verdad para SEO
El sistema utiliza una cascada de fallback en las metatags `head()` de TanStack Router:
```
Meta de Página (ej. seo_home_title) ──► Meta Global (site_title) ──► Fallback Hardcoded ("Will Design 3D")
```

### Conflictos y Puntos de Falla Identificados:
1. **Ausencia del Campo `site_logo_url`:**
   En `__root.tsx`, `index.tsx`, `tienda.index.tsx`, `servicios.tsx`, `galeria.tsx`, `nosotros.tsx` y `contacto.tsx`, la miniatura para redes sociales (Open Graph / Twitter Card) recurre a:
   `siteContent?.seo_*_image || siteContent?.site_meta_thumbnail_url || siteContent?.site_logo_url || ""`
   Dado que `site_logo_url` no existe en la definición de campos de `/panel/contenido`, la cadena de fallback cae a la imagen global o a una cadena vacía.
2. **URLs Canónicas e Hardcoded Domains:**
   Todas las rutas públicas tienen registrado de forma rígida `"https://will-design-3d.lovable.app/..."` en las etiquetas `<link rel="canonical">` y `<meta property="og:url">`. Si el cliente cambia el dominio principal, debe ser parametrizable desde la configuración de Marca del Panel.
3. **Esquema JSON-LD para Google (Organization & WebSite):**
   Renderizado en `src/routes/__root.tsx` leyendo `site_business_name` y `site_area_served`. No presenta conflicto pero requiere validación en el panel para asegurar que no quede vacío.

---

## 3. Home Builder y Ordenación Seccional

### Estado Actual del Home Builder
1. **Configuración en `site_content`:**
   La clave `home_sections_order` almacena una lista JSON serializada con las claves de las secciones:
   `["hero", "services", "products", "portfolio", "quoter"]`
2. **Renderizado Dinámico en `src/routes/index.tsx`:**
   `Home()` lee la clave, la parsea con `parseHomeOrder()` y renderiza los componentes en el orden exacto configurado:
   ```tsx
   const SECTION_COMPONENTS: Record<HomeSectionKey, () => React.ReactNode> = {
     hero: Hero,
     services: Services,
     products: FeaturedProducts,
     portfolio: InstagramFeed,
     quoter: Quoter,
   };
   ```
3. **Componente Drag & Drop (`src/components/HomeSectionsOrder.tsx`):**
   Utiliza `@dnd-kit` (`DndContext`, `SortableContext`, `verticalListSortingStrategy`) para reorganizar visualmente las secciones desde la pestaña *Inicio* de `/panel/contenido`.

### Diagnóstico:
El mecanismo funciona correctamente pero se encuentra oculto en una pestaña de `/panel/contenido`. Debe elevarse como un submódulo dedicado dentro del dominio **CONTENIDO > Diseñador de Inicio**.

---

## 4. Propuesta de Nueva Arquitectura de Menú del Panel

Se propone reorganizar el menú lateral en **5 Grupos Lógicos de Dominio**:

```
┌────────────────────────────────────────────────────────┐
│               PANEL WILL DESIGN 3D                     │
└────────────────────────────────────────────────────────┘
  │
  ├── 🟢 1. MARCA E IDENTIDAD
  │     ├── /panel/marca          (Logo, Favicon, Colores, Temas)
  │     └── /panel/seo            (SEO Global, Meta Tags por página, JSON-LD)
  │
  ├── 🤖 2. KIARA IA (UNIFICADO)
  │     ├── /panel/kiara/perfil   (Mensaje, Foto de Kiara)
  │     ├── /panel/kiara/prompts  (Prompts Interno/Público, Modelo, Temperatura)
  │     └── /panel/kiara/memoria  (Base de Conocimiento / FAQ)
  │
  ├── 🛍️ 3. TIENDA Y CATÁLOGO
  │     ├── /panel/productos      (Gestión de Productos y Variantes)
  │     ├── /panel/taxonomia      (Categorías, Marcas, Atributos y Filtros)
  │     └── /panel/inventario     (Stock y SKUs de la tienda)
  │
  ├── 🎨 4. CONTENIDO Y WEB
  │     ├── /panel/home-builder   (Orden Drag & Drop de secciones del inicio)
  │     ├── /panel/carrusel       (Diapositivas y videos del Hero)
  │     ├── /panel/servicios      (Servicios 3D)
  │     ├── /panel/menu           (Menú de Navegación del Header/Footer)
  │     └── /panel/equipo         (Miembros del Equipo)
  │
  └── 💼 5. VENTAS Y OPERACIONES
        ├── /panel/pedidos        (Solicitudes de pedido recibidas)
        ├── /panel/cotizador      (Motor de Cotización, Tarifas y Fórmulas)
        ├── /panel/cotizaciones   (Cotizaciones enviadas y reglas)
        ├── /panel/pagos          (Métodos de Pago: Nequi, Bancamía, Cripto)
        └── /panel/notificaciones (Canales de alerta por WhatsApp y Correo)
```

---

## 5. Roadmap por Fases para la Reorganización

Para implementar esta arquitectura **sin romper rutas existentes ni alterar la base de datos**, se ejecutará el siguiente plan en 4 fases:

### Fase 1: Correcciones Críticas de Datos y Registro de Logo (Inmediata)
- Agregar la definición del campo `site_logo_url` en `FIELDS` dentro de `src/routes/panel.contenido.tsx`.
- Corregir `fetchAttributes()` en `src/lib/catalog.ts` para eliminar la consulta a la columna inexistente `image_url` en `attribute_values`.
- Otorgar permiso `GRANT SELECT ON public.payment_methods TO anon;` en Supabase.

### Fase 2: Unificación de Kiara IA (`/panel/kiara`)
- Crear la ruta `/panel.kiara.tsx` con pestañas unificadas: *Perfil y Saludo*, *Prompts y LLM*, y *Base de Conocimiento*.
- Mantener `/panel/llm` y `/panel/conocimiento` con redirecciones internas para no romper marcadores del equipo.

### Fase 3: Separación de Marca y SEO (`/panel/marca` y `/panel/seo`)
- Dividir la pestaña *"Marca y SEO"* de `/panel/contenido.tsx` en dos vistas dedicadas:
  - `/panel/marca`: Logotipo, Favicon, Nombre Comercial y Paleta de Colores/Temas.
  - `/panel/seo`: Títulos, Descripciones, Miniaturas Sociales y Configuración de Indexación.

### Fase 4: Reorganización del Sidebar Navegable
- Actualizar `ALL_LINKS` en `src/routes/panel.tsx` con la nueva estructura de grupos y colapsables.
- Migrar las preferencias de orden del menú en `sidebar_order`.

---

## 6. Conclusión

Con esta reestructuración, la plataforma ganará:
1. **Unicidad de Gobernanza:** Cómputo y parámetros de Kiara IA centralizados en un único módulo.
2. **Facilidad de Administración:** La configuración de Marca y SEO dejará de competir con los textos del Inicio.
3. **Escalabilidad:** El catálogo y el motor de operaciones quedan claramente diferenciados de la capa visual y de contenidos.
