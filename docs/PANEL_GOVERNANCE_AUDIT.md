# AUDITORÍA EXHAUSTIVA DE GOBERNANZA Y REORGANIZACIÓN DEL PANEL
**Proyecto:** Will Design 3D
**Fecha:** Octubre 2025
**Estado:** Documento de Arquitectura y Diagnóstico (READ ONLY - Sin modificaciones de código)

---

##  EXECUTIVE SUMMARY
El panel de administración `/panel/*` de **Will Design 3D** ha evolucionado añadiendo múltiples características (Cotizador 3D, IA Kiara, Temas dinámicos, Menú multinivel, SEO y Portafolio). Sin embargo, esta evolución ha generado **dispersión de configuraciones**, **duplicidad de fuentes de verdad** y **acoplamiento en componentes gigantes** (como `panel.contenido.tsx` con más de 700 líneas y decenas de campos heterogéneos).

El presente documento establece un diagnóstico exhaustivo de la arquitectura actual y propone una **reorganización bajo el principio de Un Sólido Lugar de Configuración por Dominio ("Single Source of Truth")**.

---

## FASE 1: MAPEO DE DISPERSIÓN ACTUAL

### 1.1 Mapeo de Rutas, Tablas de Supabase y Claves de `site_content`

| Ruta en `src/routes/` | Propósito | Tablas de Supabase Utilizadas | Claves de `site_content` Modificadas/Leídas |
| :--- | :--- | :--- | :--- |
| `panel.index.tsx` | Dashboard inicial de métricas | `products`, `orders` | Ninguna |
| `panel.contenido.tsx` | Gestión monolítica de textos, imágenes, SEO y temas | `site_content` (select/upsert), Storage `site-media` | **38 claves:** `hero_title`, `hero_subtitle`, `hero_image_url`, `hero_badge_title`, `hero_stat_1_k`, `hero_stat_1_v`, `hero_stat_2_k`, `hero_stat_2_v`, `hero_stat_3_k`, `hero_stat_3_v`, `home_sections_order`, `show_manual_gallery`, `show_instagram_widget`, `portfolio_display_order`, `portfolio_images`, `elfsight_instagram_id`, `about_short`, `quoter_badge`, `quoter_title`, `quoter_subtitle`, `quoter_service_label`, `quoter_disclaimer`, `contact_whatsapp`, `contact_whatsapp_display`, `contact_email`, `contact_instagram_url`, `contact_instagram_handle`, `contact_location_text`, `contact_location_short`, `contact_map_embed_url`, `whatsapp_quote_template`, `kiara_message`, `kiara_image_url`, `site_title`, `site_description`, `site_logo_url`, `site_favicon_url`, `site_meta_thumbnail_url`, `site_meta_thumbnail_alt`, `site_business_name`, `site_area_served`, `site_indexable_global`, `seo_home_*`, `seo_store_*`, `seo_services_*`, `seo_gallery_*`, `seo_about_*`, `seo_contact_*`, `active_theme_id`, `custom_themes` |
| `panel.llm.tsx` | Configuración técnica del motor LLM para Kiara | `site_content` (upsert/select) | `kiara_prompt_public`, `kiara_prompt_internal` |
| `panel.conocimiento.tsx` | Base de conocimiento para la IA Kiara | `knowledge_base` | Ninguna |
| `panel.carrusel.tsx` | Slides del carrusel multimedia del Hero | `hero_carousel`, Storage `hero-carousel` | Ninguna |
| `panel.productos.tsx` | Catálogo de productos e imágenes | `products`, `categories`, `brands`, `attributes`, `category_attributes`, `product_attribute_values`, Storage `product-images` | Ninguna |
| `panel.taxonomia.tsx` | Gestión de categorías, marcas y atributos | `categories`, `brands`, `attributes`, `category_attributes`, `attribute_values`, Storage `product-images` | Ninguna |
| `panel.servicios.tsx` | Catálogo de Servicios 3D | `site_services` | Ninguna |
| `panel.cotizador.tsx` | Servicios y campos del Cotizador 3D | `quoter_services`, `quoter_fields`, `admin_settings` | Ninguna (`quoting_vars` se guarda en `admin_settings`) |
| `panel.cotizaciones.tsx` | Reglas de cálculo del cotizador | `pricing_rules` | Ninguna |
| `panel.pedidos.tsx` | Gestión de pedidos y solicitudes de cotización | `orders`, `order_items`, `quotes`, Storage `quote-files` | Ninguna |
| `panel.pagos.tsx` | Métodos de pago y pasarelas | `payment_methods` (vía Server Fn), Storage `site-media` | Ninguna |
| `panel.notificaciones.tsx` | Configuración y cola de e-mails/alertas | `notification_settings`, `notifications_queue` | Ninguna |
| `panel.menu.tsx` | Árbol de navegación dinámico | `menu_items`, `categories`, `brands`, `attributes`, `products` | Ninguna |
| `panel.equipo.tsx` | Gestión de roles de usuario del equipo | `user_roles` | Ninguna |

---

### 1.2 Inconsistencias y Dispersión Identificadas

1. **Dispersión de KIARA IA (3 lugares diferentes):**
   - **Foto de avatar (`kiara_image_url`) y Mensaje de bienvenida (`kiara_message`):** Configurados en `/panel/contenido` (Pestaña "Kiara").
   - **Prompts del sistema e integración LLM (`kiara_prompt_public`, `kiara_prompt_internal`, proveedores, API keys):** Configurados en `/panel/llm`.
   - **Base de Conocimiento (tabla `knowledge_base`):** Configurada en `/panel/conocimiento`.
   - *Efecto:* El administrador debe saltar entre 3 módulos diferentes para ajustar la personalidad, foto, respuestas y modelo de la IA.

2. **Dispersión de MARCA Y ESTILOS:**
   - **Logotipo, Favicon, Miniaturas sociales y SEO Global:** Squeeze dentro de la pestaña "Marca y SEO" de `panel.contenido.tsx`.
   - **Temas, Colores e Inyección de CSS (`active_theme_id`, `custom_themes`):** Squeeze dentro de la pestaña "Temas y Estilos" de `panel.contenido.tsx`.
   - **Información Legal y Redes Sociales:** Fragmentada entre "Contacto" y "Marca y SEO".

3. **Dispersión del COTIZADOR 3D (3 lugares diferentes):**
   - **Textos de encabezado y disclaimers (`quoter_badge`, `quoter_title`, `quoter_disclaimer`, `whatsapp_quote_template`):** Configurados en `/panel/contenido`.
   - **Servicios 3D del cotizador y Campos personalizados:** Configurados en `/panel/cotizador`.
   - **Reglas de precios (`pricing_rules`) y Variables globales (`quoting_vars`):** Divididos entre `/panel/cotizaciones` y la pestaña de variables en `/panel/cotizador`.

4. **Claves de `site_content` consumidas en el Frontend vs Definición en `FIELDS` (`panel.contenido.tsx`):**
   - **`site_subtitle`:** Utilizada en `SiteHeader.tsx` (`content?.site_subtitle`), pero **NO existe** en el arreglo `FIELDS` de `panel.contenido.tsx`. No hay forma de editar el subtítulo del encabezado desde el panel.
   - **`services_section_title` / `services_section_subtitle`:** Utilizados en `src/routes/index.tsx` (`getText("services_section_title", "Nuestros servicios")`), pero **NO existen** en `FIELDS` de `panel.contenido.tsx`.

---

## FASE 2: AUDITORÍA DE CONFLICTOS SEO Y FUENTES DE VERDAD

### 2.1 Mapeo de Jerarquía SEO

En el cliente y durante el SSR, la metainformación SEO se genera combinando el cargador de TanStack Router (`__root.tsx`) y los loaders de cada página individual.

#### Flujo de Fallbacks Actual:
```
[SEO Específico de Página (seo_home_title, etc.)]
       ↓ (si no está definido o es string vacío)
[SEO Global (site_title, site_description, site_meta_thumbnail_url)]
       ↓ (si no está definido en Supabase)
[Valor por Defecto Hardcodeado ("Will Design 3D", "/favicon.ico")]
```

### 2.2 Conflictos y Redundancias Detectados

1. **Hardcoding en Script de Datos Estructurados (JSON-LD) en `__root.tsx`:**
   - En `src/routes/__root.tsx`, la clave `sameAs` dentro del esquema JSON-LD contiene un enlace hardcodeado:
     ```json
     "sameAs": ["https://www.instagram.com/will_design2020"]
     ```
     *Conflicto:* Debería consumir dinámicamente `siteContent.contact_instagram_url` configurado en el panel.

2. **Hardcoding de URL Canónica y OpenGraph en `src/routes/index.tsx`:**
   - Las meta tags `og:url` y `canonical` en `index.tsx` tienen hardcodeada la URL del sandbox de Lovable:
     ```typescript
     { property: "og:url", content: "https://will-design-3d.lovable.app/" }
     ```
     *Conflicto:* Si el dominio cambia a producción personalizables (ej. `willdesign3d.com`), los buscadores recibirán URLs canónicas incorrectas.

3. **Hardcoding de Ubicación y Textos de Marca en `src/routes/index.tsx`:**
   - En la sección Hero de `index.tsx`, el tag "Bogotá · Colombia" está escrito estáticamente en el código JSX en lugar de consultar `site_area_served` o `contact_location_short`.

4. **Inconsistencia en la Miniatura por Defecto:**
   - En `__root.tsx`:
     ```typescript
     const image = siteContent?.site_meta_thumbnail_url || siteContent?.site_logo_url || "";
     ```
     *Conflicto:* Si no hay `site_meta_thumbnail_url`, se usará `site_logo_url`. Sin embargo, un logotipo cuadrado no cumple con la relación de aspecto 1200x630px recomendada para previsualizaciones de WhatsApp/OpenGraph, generando tarjetas distorsionadas.

---

## FASE 3: AUDITORÍA DE HOME BUILDER (PÁGINA DE INICIO)

### 3.1 Estructura y Ordenamiento Actual
En `src/routes/index.tsx`, el orden de renderizado de la página principal está gobernado dinámicamente por la clave `home_sections_order`:

```typescript
const SECTION_COMPONENTS: Record<HomeSectionKey, () => React.ReactNode> = {
  hero: Hero,
  services: Services,
  products: FeaturedProducts,
  portfolio: InstagramFeed,
  quoter: Quoter,
};

function Home() {
  const { getText } = useSiteContent();
  const order = parseHomeOrder(getText("home_sections_order", ""));
  return (
    <>
      {order.map((key) => {
        const Section = SECTION_COMPONENTS[key];
        return <Section key={key} />;
      })}
    </>
  );
}
```

### 3.2 Diagnóstico del Home Builder
- **Mecanismo de Almacenamiento:** El orden se guarda en la tabla `site_content` con la clave `home_sections_order` en formato JSON stringificado (ej. `["hero","services","products","portfolio","quoter"]`).
- **Componente de Arrastre (Drag & Drop):** En `panel.contenido.tsx` existe el componente `<HomeSectionsOrder>`, impulsado por `@dnd-kit` (`@dnd-kit/core` y `@dnd-kit/sortable`).
- **Deficiencia Actual:** Aunque el ordenamiento arrastrable funciona bien en base de datos, el control está enterrado dentro de la pestaña "Inicio" del monolito `panel.contenido.tsx`. No existe un espacio visual tipo "Builder" donde se pueda:
  1. Reordenar las secciones mediante drag & drop.
  2. Activar/Desactivar visibilidad de secciones individuales sin borrar su contenido.
  3. Editar directamente los títulos y subtítulos de cada sección desde la misma interfaz.

---

## FASE 4: PROPUESTA DE NUEVA ARQUITECTURA DE MENÚ Y GOBERNANZA

Para resolver la dispersión y lograr que **CADA ELEMENTO TENGA UN SOLO LUGAR DE CONFIGURACIÓN**, se propone reestructurar el menú lateral del panel `/panel` en **5 Grupos Dominio**:

```
 ____________________________________________________________________
|                                                                    |
|  MARCA          Identidad, Favicon, SEO Global, JSON-LD, Temas     |
|  KIARA IA       Perfil, LLM, Prompts, Base de Conocimiento        |
|  TIENDA         Productos, Categorías, Marcas, Atributos           |
|  CONTENIDO      Home Builder, Carrusel, Servicios 3D, Menú, Equipo |
|  VENTAS         Cotizador 3D, Pedidos, Métodos de Pago, Alertas    |
|____________________________________________________________________|
```

### 4.1 Desglose de la Nueva Estructura del Menú Lateral

####  GRUPO 1: MARCA Y APARIENCIA (`/panel/marca`)
*Unifica toda la identidad corporativa, SEO y estilos del sitio.*
- **Identidad Visual:** Logotipo oficial, Favicon de pestaña, Nombre comercial, Subtítulo global.
- **SEO Global y Metatags:** Título global, Descripción global, Miniatura social por defecto (OG Image), Robots e Indexación.
- **Datos de Empresa (JSON-LD):** Nombre de la organización, Área de servicio, Perfiles de redes sociales oficiales.
- **Temas y Estilos:** Selector de tema activo, Creador de temas personalizados (colores primaria, secundaria, acento), Animaciones de botones, CSS personalizado.

####  GRUPO 2: KIARA IA (`/panel/kiara`)
*Unifica absolutamente TODO lo relacionado con el asistente inteligente en una sola ruta con pestañas dedicadas.*
- **Pestaña 1: Perfil y Saludos:** Foto de avatar (`kiara_image_url`), Mensaje/teaser inicial (`kiara_message`).
- **Pestaña 2: Proveedor y LLM:** Selección de proveedor (OpenAI/DeepSeek/Groq), API Key cifrada, Modelo, Temperatura.
- **Pestaña 3: Prompts de Sistema:** Prompt público para clientes en la web, Prompt interno para el equipo en el panel.
- **Pestaña 4: Base de Conocimiento:** Gestor CRUD de artículos, FAQs y material de entrenamiento (`knowledge_base`).

####  GRUPO 3: TIENDA Y CATÁLOGO (`/panel/tienda` / `/panel/productos` / `/panel/taxonomia`)
*Gestión centralizada del catálogo comercial.*
- **Productos:** Alta, edición, precios, imágenes, destacado en portada.
- **Categorías y Marcas (Taxonomía):** Árbol de categorías, marcas comerciales, atributos dinámicos por categoría.
- **Control de Inventario:** Stock rápido, estado activo/inactivo.

####  GRUPO 4: CONTENIDO Y PÁGINAS (`/panel/contenido`)
*Gestión de la experiencia visual y estructural del sitio.*
- **Home Builder:** Espacio drag & drop para ordenar las secciones del inicio (`hero`, `services`, `products`, `portfolio`, `quoter`), control de visibilidad y textos de sección (`services_section_title`, etc.).
- **Carrusel Hero:** Diapositivas multimedia principales (`hero_carousel`).
- **Servicios 3D:** Editor de catálogo de servicios ofrecidos (`site_services`).
- **Portafolio y Redes:** Fotos manuales impresas, ID del widget de Instagram.
- **Menú de Navegación:** Árbol recursivo de navegación (`menu_items`).
- **Equipo y Permisos:** Miembros del equipo y roles (`user_roles`).

####  GRUPO 5: VENTAS Y OPERACIONES (`/panel/ventas`)
*Centro de operaciones de conversión, pagos y atención.*
- **Cotizador 3D:** Unifica la gestión de Servicios de cotización, Campos dinámicos, Variables de cálculo (`quoting_vars`) y Reglas de precios (`pricing_rules`).
- **Pedidos y Cotizaciones:** Listado unificado de pedidos del e-commerce y cotizaciones recibidas con estado y archivos subidos.
- **Métodos de Pago:** Configuración de métodos manuales (QR Nequi/Bancolombia) y pasarelas de pago (`payment_methods`).
- **Notificaciones y Canales:** Plantillas de WhatsApp, configuración de e-mails y cola de mensajes pendientes.

---

## FASE 5: ROADMAP DE IMPLEMENTACIÓN POR ETAPAS (SIN INTERRUPCIÓN)

Para garantizar cero tiempo de inactividad (*zero downtime*) y evitar romper el sitio en producción, la migración se ejecutará en 4 etapas progresivas:

```
[Etapa 1: Refactorización de Claves y SEO]
                  ↓
[Etapa 2: Unificación del Módulo KIARA IA]
                  ↓
[Etapa 3: Restructuración de Marca y Cotizador]
                  ↓
[Etapa 4: Reorganización del Menú Lateral /panel]
```

###  Etapa 1: Saneamiento de Claves de `site_content` y SEO (Sin cambiar rutas)
1. **Agregar campos faltantes en `panel.contenido.tsx`:** Añadir `site_subtitle`, `services_section_title` y `services_section_subtitle` al arreglo `FIELDS`.
2. **Eliminar Hardcoding SEO:**
   - Actualizar `src/routes/__root.tsx` para consumir `siteContent.contact_instagram_url` en el script JSON-LD en lugar del string estático.
   - Reemplazar las URLs fijas de `will-design-3d.lovable.app` por `window.location.origin` o configuración de sitio.
   - En `src/routes/index.tsx`, reemplazar "Bogotá · Colombia" hardcodeado por `site_area_served`.

###  Etapa 2: Unificación de KIARA IA en `/panel/kiara`
1. Crear la ruta unificada `src/routes/panel.kiara.tsx` con interfaz por pestañas (Perfil, LLM, Prompts, Base de Conocimiento).
2. Mover la lógica de `panel.llm.tsx` y `panel.conocimiento.tsx` a este nuevo componente.
3. Trasladar los campos `kiara_message` y `kiara_image_url` desde `panel.contenido.tsx` hacia `/panel/kiara`.
4. Mantener redirecciones o alias desde `/panel/llm` y `/panel/conocimiento` para evitar enlaces rotos.

###  Etapa 3: Separación del Grupo MARCA y Unificación del COTIZADOR
1. Crear la ruta `src/routes/panel.marca.tsx` trasladando los campos de Identidad, SEO Global, JSON-LD y el gestor de Temas y Estilos.
2. Unificar en `/panel/cotizador` la pestaña de variables globales de precios (`pricing_rules`) y la plantilla de WhatsApp para eliminar la ruta obsoleta `/panel/cotizaciones`.

###  Etapa 4: Reorganización del Menú Lateral (`panel.tsx`)
1. Actualizar el arreglo `ALL_LINKS` y `sidebar_order` en `src/routes/panel.tsx` para reflejar la nueva agrupación por dominios (MARCA, KIARA IA, TIENDA, CONTENIDO, VENTAS).
2. Limpiar código diferido, verificar tipos con `bun x tsc --noEmit` y asegurar que todas las pruebas pasen con `bun test`.

---

## CONCLUSIÓN Y SIGUIENTES PASOS
Con esta propuesta de arquitectura de gobernanza:
- Se elimina la dispersión de datos.
- Se resuelve el acoplamiento en `panel.contenido.tsx`.
- Se corrigen las inconsistencias SEO y valores hardcodeados en el frontend.
- Se proporciona a los administradores una experiencia intuitiva agrupada por dominio de negocio.

*El código se mantiene intacto según la indicación de esta fase de auditoría. Listo para proceder a la implementación tras la aprobación de este plan.*
