# Fix: lógica de renderizado del widget de Elfsight en el portafolio

## Archivo afectado
`src/components/InstagramFeed.tsx` (único archivo; no se toca ruteo, panel ni base de datos).

## Cambios

### 1. Saneamiento del ID del widget
- Nueva función helper `sanitizeWidgetId(raw?: string | null): string` que recorta espacios y elimina el prefijo `elfsight-app-` con `.replace(/^elfsight-app-/, '')`.
- Se aplica sobre `content?.elfsight_instagram_id` y sobre `VITE_ELFSIGHT_INSTAGRAM_ID` antes de usarlos. Así, si en el Panel se pega el ID completo (`elfsight-app-abc123`) o solo el sufijo (`abc123`), ambos funcionan.
- `cleanWidgetId = sanitizeWidgetId(...)` reemplaza al actual `widgetId`.

### 2. Carga del script con `defer` y detección de éxito/fallo
- `useElfsightScript` pasa a `s.defer = true` en lugar de `s.async` (el script oficial se sigue inyectando dinámicamente desde `https://static.elfsight.com/platform/platform.js`; si ya existe, solo se re-dispara `initApps`).
- El hook devuelve además un estado `status: "loading" | "ready" | "error"`:
  - `ready` → el script cargó (`load` event + reintento de `initApps`).
  - `error` → el script falló al cargar (`error` event) o no respondió tras un timeout razonable (~8 s).

### 3. Lógica de fallback
Orden de renderizado dentro de la sección:
1. Si `cleanWidgetId` es válido (no vacío) **y** `status === "ready"` → renderizar el widget: `<div className={`elfsight-app-${cleanWidgetId}`} data-elfsight-app-lazy />`.
2. Si `cleanWidgetId` es válido pero el script todavía carga → mantener un contenedor con altura mínima (evita salto de layout); aún no se oculta la galería.
3. Si el script falla (`status === "error"`) o el ID está vacío → mostrar `PhotoGallery` (fotos del panel) o `PortfolioTeaser` como hasta ahora.

Resultado: la galería manual solo se oculta cuando el widget de Elfsight está realmente listo; si Elfsight falla (bloqueo de red, ID malo), el visitante siempre ve fotos.

## No se cambia
- Estructura de la sección, textos, CMS (`site_content`), ni el aviso de desarrollo.
- La galería de fotos y el teaser siguen funcionando igual como fallback.
