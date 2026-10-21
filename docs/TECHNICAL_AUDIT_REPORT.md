# AUDITORÍA TÉCNICA Y DIAGNÓSTICO DEL SISTEMA COMPLETO — WILL DESIGN 3D

**PROYECTO:** Will Design 3D
**ARQUITECTURA:** TanStack Start v1 (SSR) + React 19 + Vite + Supabase + Cloudflare Workers / Nitro
**ESTADO:** Auditado y Diagnosticado

---

## 1. Executive Summary

- **Estado del Sitio:** El sitio web se encuentra **parcialmente funcional (~85%)**. Las rutas principales como `/` (Inicio), `/servicios`, `/galeria`, `/nosotros`, `/contacto`, `/carrito` y `/cotizador` cargan correctamente sin errores de hidratación. Sin embargo, la sección comercial central (`/tienda`) colapsa inmediatamente al entrar debido a una consulta SQL defectuosa en el backend/Supabase.
- **Gobernanza por Panel de Control (CMS):** El sitio está diseñado para ser **100% gobernado por el panel de administración** (`/panel/*`), pero existen **mismatches y omisiones críticas** en las definiciones de campos. El ejemplo más grave es que el campo `site_logo_url` no existe en la definición de campos de `/panel/contenido`, dejando al administrador sin capacidad de subir o cambiar el logotipo desde la interfaz de administración.
- **Fallas Principales Detectadas:**
  1. **`/tienda` en pantalla de error ("Algo se salió del molde"):** Causado por `fetchAttributes()` en `src/lib/catalog.ts` consultando la columna inexistente `attribute_values.image_url` en la base de datos de Supabase (Error Postgres `42703`).
  2. **Logo superior izquierdo ausente (muestra texto "Will Design 3D"):** La clave `site_logo_url` no existe en la tabla `site_content` de Supabase ni está definida en `FIELDS` de `src/routes/panel.contenido.tsx`, forzando el fallback a texto plano en el `SiteHeader`.

---

## 2. Critical Error Analysis — Crashes en `/tienda` ("Algo se salió del molde")

### Captura de Excepción y Stack Trace

- **Componente de Fallback:** `src/components/ErrorBoundary.tsx` (Línea 40). Captura la excepción no controlada y renderiza el mensaje *"Algo se salió del molde. Kiara 🐾 ya tomó nota."*
- **Origen de la Excepción:** `src/lib/catalog.ts` en la función `fetchAttributes()`.
- **Línea Defectuosa:**
  ```ts
  // src/lib/catalog.ts (Líneas 212–217)
  export async function fetchAttributes(): Promise<Attribute[]> {
    const { data, error } = await supabase
      .from("attributes")
      .select(
        "id,slug,name,input_type,is_filterable,sort_order,values:attribute_values(id,attribute_id,slug,label,color_hex,image_url,sort_order)"
      )
      .order("sort_order");
    if (error) throw error;
    return ...
  }
  ```

### Causa Raíz
La consulta solicita la columna `image_url` de la relación `attribute_values`. En el esquema actual de la base de datos en Supabase, la tabla `attribute_values` no contiene la columna `image_url`.

### Cadena de Colapso (Execution Chain):
1. El usuario navega a `/tienda`.
2. El loader de TanStack Router en `src/routes/tienda.index.tsx` ejecuta `Promise.all` pre-hidratando las queries:
   ```ts
   context.queryClient.ensureQueryData(attributesQuery())
   ```
3. Supabase retorna un objeto de error con código Postgres `42703`:
   `message: "column attribute_values_1.image_url does not exist"`.
4. `fetchAttributes()` evalúa `if (error) throw error;` y lanza la excepción.
5. El `Promise.all` del loader rechaza la promesa.
6. TanStack Router aborta el renderizado de la ruta `/tienda/` y delega la falla al `<ErrorBoundary label="root_layout">` en `src/routes/__root.tsx` (Línea 211).
7. La pantalla muestra la tarjeta con el ícono de alerta, la mascota Kiara y las opciones "Reintentar" y "Volver al inicio".

---

## 3. Logo Issue — Trazabilidad Completa del Logotipo

### Diagrama del Flujo Esperado
```
[Supabase: site_content]
   key: 'site_logo_url' -> value: 'https://.../logo.png'
          │
          ▼
[Loader: src/routes/__root.tsx]
   ensureQueryData(siteContentQuery())
          │
          ▼
[Hook / Query: siteContentQuery()]
   Convierte filas {key, value} -> Objeto Record<string, string>
          │
          ▼
[Componente: src/components/SiteHeader.tsx]
   const logoUrl = content?.site_logo_url?.trim();
   {logoUrl ? <img src={logoUrl} /> : <span>Will Design 3D</span>}
```

### Trazabilidad Real y Fallas Encontradas
1. **Base de Datos (`site_content`):**
   Al consultar `site_content` en Supabase, existen 39 claves configuradas (ej. `hero_title`, `site_favicon_url`, `site_meta_thumbnail_url`). La fila con `key = 'site_logo_url'` **no existe** (`undefined`).
2. **Panel de Administración (`src/routes/panel.contenido.tsx`):**
   El arreglo constante `FIELDS` define todos los campos que el administrador puede editar en la pestaña *"Marca y SEO"*.
   - Muestra: `site_title`, `site_description`, `site_favicon_url`, `site_meta_thumbnail_url`, `site_business_name`, `site_area_served`.
   - **Falta totalmente:** El objeto de definición para `site_logo_url`.
3. **Renderizado del Header (`src/components/SiteHeader.tsx`, Línea 304):**
   `const logoUrl = content?.site_logo_url?.trim();` evalúa a `undefined`.
4. **Condicional de Imagen (`SiteHeader.tsx`, Líneas 317–324):**
   ```tsx
   {logoUrl && (
     <img src={logoUrl} alt={businessName} width={44} height={44} className="..." />
   )}
   ```
   Al ser `logoUrl` falsy, la etiqueta `<img>` se omite por completo del DOM y únicamente se despliega el texto de `{businessName}` ("Will Design 3D").

---

## 4. Full Route Status Table

| Ruta | Loader pre-hidrata (`ensureQueryData`) | Componente usa `useQuery` | Claves Coinciden | Estado | Tablas de Supabase Requeridas |
|---|---|---|---|---|---|
| `/` | `siteContentQuery`, `menuItemsQuery`, `categoriesQuery`, `featuredProductsQuery`, `heroCarouselQuery`, `siteServicesQuery` | Sí (`useQuery` con mismas opciones) | Sí | **OK** | `site_content`, `menu_items`, `categories`, `products`, `hero_carousel`, `site_services` |
| `/tienda` / `/tienda/` | `siteContentQuery`, `productsQuery`, `categoriesQuery`, `attributesQuery` | Sí (`productsQuery`, `categoriesQuery`, `brandsQuery`, `attributesQuery`, `categoryAttributesQuery`) | Sí | **COLAPSA (Error 42703)** | `products`, `categories`, `brands`, `attributes` (`attribute_values`), `category_attributes`, `site_content` |
| `/tienda/$slug` | `productBySlugQuery(slug)`, `productsQuery` (prefetch) | Sí (`productsQuery`, `siteContentQuery`) | Sí | **OK** | `products`, `brands`, `categories`, `product_attribute_values`, `site_content` |
| `/servicios` | `siteContentQuery`, `siteServicesQuery` | Sí | Sí | **OK** | `site_content`, `site_services` |
| `/galeria` | `siteContentQuery` | Sí | Sí | **OK** | `site_content` |
| `/nosotros` | `siteContentQuery` | Sí | Sí | **OK** | `site_content` |
| `/contacto` | `siteContentQuery` | Sí | Sí | **OK** | `site_content` |
| `/carrito` | Ninguno (Ruta de cliente) | Lee estado local con `CartProvider` | N/A | **OK** | Estado local / `localStorage` |
| `/cotizador` | `quoterServicesQuery`, `quoterFieldsQuery`, `siteContentQuery` | Sí | Sí | **OK** | `quoter_services`, `quoter_fields`, `site_content` |
| `/cotizacion/$id` | Obtiene cotización por ID | Consulta directa | N/A | **OK** | `quotations` |
| `/pedido/$token` | Obtiene pedido por Token | Consulta directa | N/A | **OK** | `orders` / `order_requests` |
| `/panel/*` | Carga de administración (`ssr: false`) | Consultas directas a Supabase | N/A | **OK** | Todas las tablas de administración |

---

## 5. Data Model — Table by Table Audit

1. **`site_content` (OK - 39 filas):** Funciona como almacén Clave-Valor. Falta registrar la clave `site_logo_url`.
2. **`products` (OK - 64 productos):** Consulta `PRODUCT_SELECT` funciona correctamente con `active = true`. Contiene variantes en JSONB y relaciones con `categories` y `brands`.
3. **`categories` (OK - 12 categorías):** Estructura jerárquica con `parent_id` y `is_active`.
4. **`brands` (OK - 5 marcas):** Marcas de impresoras/filamentos activas.
5. **`attributes` / `attribute_values` (ERROR DE ESQUEMA):**
   - La tabla `attributes` existe.
   - La relación `attribute_values` carece de la columna `image_url` en Supabase DB.
6. **`category_attributes` (OK):** Asociación entre categorías y atributos filtrables.
7. **`hero_carousel` (OK):** Diapositivas e imágenes/videos del carrusel principal.
8. **`site_services` (OK - 8 servicios):** Servicios públicos y reglas para cotizaciones.
9. **`quoter_services` y `quoter_fields` (OK - 9 servicios, 30 campos):** Cotizador en vivo.
10. **`menu_items` (OK - 12 ítems):** Menú navegable gobernado dinámicamente.
11. **`payment_methods` (ADVERTENCIA DE PERMISOS RLS):** Retorna error Postgres `42501` (`permission denied for table payment_methods`) para el rol `anon`. Requiere política RLS pública de lectura (`GRANT SELECT TO anon`).

---

## 6. Panel vs Public Gap Analysis — Brechas de Conexión

1. **Gestión del Logo del Sitio:**
   - **En el Panel (`/panel/contenido`):** No existe el campo de carga de logo.
   - **En la Web Pública:** `SiteHeader`, `SiteFooter` y `/nosotros` esperan `site_logo_url`.
2. **Imágenes en Valores de Atributos:**
   - **En la Web Pública (`src/lib/catalog.ts`):** `fetchAttributes()` solicita `image_url` de `attribute_values` para mostrar chips de color/textura en la tienda.
   - **En la Base de Datos:** La columna `image_url` no ha sido agregada a la tabla `attribute_values` en Supabase (o alternativamente debe retirarse de la cláusula `.select()`).
3. **Permisos de Lectura Anónima en Métodos de Pago (`payment_methods`):**
   - El panel en `/panel/pagos` guarda los métodos de pago activos (Nequi, Daviplata, BANCAMIA, Cripto), pero los usuarios sin iniciar sesión (`anon`) no tienen permiso de lectura RLS en la tabla.

---

## 7. Ghost Code & Technical Debt List

1. **Anidamiento HTML Inválido (`ProductCard.tsx`):**
   - En `src/components/ProductCard.tsx`, el componente `<Link to="/tienda/$slug">` (que se renderiza como una etiqueta `<a>`) envuelve a `<ShareButton>` y a un `<button type="button">Vista Rápida</button>`.
   - **Riesgo:** En el estándar HTML5, tener elementos `<button>` dentro de un elemento `<a>` es anidamiento inválido. Produce diferencias en la hidratación y problemas de propagación de eventos de clic.
2. **Uso Directo de `window.localStorage` en Render:**
   - Totalmente corregido y blindado dentro de bloques `useEffect` en `src/lib/cart.tsx` y `src/lib/live-store.ts`. No hay ejecuciones directas en render durante SSR.
3. **Ghost Code / Fallbacks Antiguos:**
   - No se encontraron constantes obsoletas como `WILL_LOGO`, `MOCK_`, `FALLBACK_LOGO` u `OLD_`.
   - `suppressHydrationWarning` se encuentra en 0 archivos (100% código limpio).

---

## 8. Build & Quality Assurance Status

- **Type Check (`bun x tsc --noEmit`):**
  - **Resultado:** `0 errores`. La verificación de tipos compila perfectamente de principio a fin.
- **Suite de Pruebas (`bun test`):**
  - **Resultado:** `31 pasadas / 0 fallidas` (Ejecutadas en 188 ms a través de 5 archivos de prueba).
  - Incluye verificación de variaciones de productos, motor del cotizador, reglas de pago y ordenamiento de secciones del inicio.

---

## 9. Complete Prioritized Roadmap to Close Issues

### FASE A: Arreglo Crítico de la Tienda (Prioridad Máxima - Inmediata)
1. **Archivo `src/lib/catalog.ts` (Línea 215):**
   Ajustar la función `fetchAttributes()` eliminando `image_url` del `.select()` de `attribute_values`:
   ```ts
   // Cambiar:
   "values:attribute_values(id,attribute_id,slug,label,color_hex,image_url,sort_order)"
   // A:
   "values:attribute_values(id,attribute_id,slug,label,color_hex,sort_order)"
   ```
   *Efecto:* Restablece la carga de `/tienda` al 100% de inmediato.

### FASE B: Conexión y Carga del Logotipo (Branding)
1. **Archivo `src/routes/panel.contenido.tsx`:**
   Agregar la definición del campo `site_logo_url` dentro de la constante `FIELDS` en la sección *"Marca y SEO"*, grupo *"Marca y Logotipos"*:
   ```ts
   {
     key: "site_logo_url",
     label: "Logotipo Principal del Sitio",
     type: "image",
     help: "Imagen del logo oficial visible en el encabezado (Header) y pie de página (Footer).",
     section: "Marca y SEO",
     group: "Marca y Logotipos"
   }
   ```
2. **Administración / Base de Datos:**
   Subir la imagen del logotipo oficial de Will Design 3D desde el panel `/panel/contenido` para que guarde la clave `site_logo_url` en la tabla `site_content`.

### FASE C: Refactorización Estructural Menor & RLS
1. **Políticas de Supabase (RLS):**
   Ejecutar la política RLS en Supabase:
   `GRANT SELECT ON public.payment_methods TO anon;`
2. **Archivo `src/components/ProductCard.tsx`:**
   Extraer los botones de acción (`ShareButton` y `Vista Rápida`) fuera del componente `<Link>` principal para eliminar el anidamiento `<a><button></button></a>`.

---

## 10. Final Conclusion

El proyecto posee una base técnica sólida construida con **TanStack Start v1, React 19 y Supabase**. Las fallas reportadas por el usuario no se deben a deficiencias de arquitectura ni a problemas complejos de SSR, sino a **dos inconsistencias puntuales de datos**:
1. Una referencia a una columna inexistente en la tabla de atributos (`image_url`).
2. Un campo faltante en el formulario de administración del contenido (`site_logo_url`).

Aplicando las soluciones descritas en la **Fase A** y **Fase B** de la hoja de ruta, la plataforma quedará completamente funcional, con el catálogo cargando a máxima velocidad y el logotipo oficial desplegado en todo el sitio web.
