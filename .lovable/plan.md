# Portafolio: galería manual e Instagram conviviendo + widget de Elfsight arreglado

Hoy el feed de Instagram **reemplaza** la galería manual, y si el ID de Elfsight está mal escrito o el script no carga, la sección queda vacía. El plan arregla las dos cosas.

## 1. Interruptores independientes (sin cambios en la base de datos)

Los ajustes del sitio ya son una tabla de clave/valor, así que solo se añaden dos claves nuevas de texto (`"true"` / `"false"`), sin migración:

- `show_manual_gallery` — mostrar "Piezas que hemos impreso". Por defecto: sí.
- `show_instagram_widget` — mostrar "Directo desde nuestro Instagram". Por defecto: sí.

Ambas por defecto activas cuando el valor está vacío, para que nada desaparezca al publicar el cambio.

## 2. Panel → Contenido → Portafolio (Instagram)

- Nuevo tipo de campo `switch` en el editor de contenido, renderizado con el `Switch` de shadcn/ui.
- Dos interruptores nuevos al principio del grupo:
  - "Mostrar sección de Portafolio Manual (Piezas que hemos impreso)"
  - "Mostrar sección de Instagram en vivo"
- El campo del ID de Elfsight se limpia automáticamente al escribir/pegar: se quita el prefijo `elfsight-app-` (incluso repetido) y los espacios. Ayuda actualizada: pegar el ID completo también funciona.
- El subidor de fotos manuales se mantiene igual (subir varias, vista previa, quitar una por una).

## 3. Página pública del portafolio

`src/components/InstagramFeed.tsx` se reorganiza en dos bloques independientes dentro de la misma sección, separados con `gap-12`/`space-y-12`, sin espacios en blanco cuando uno está apagado:

**Bloque A — Galería manual "Piezas que hemos impreso"**
- Se muestra solo si `show_manual_gallery` está activo **y** hay al menos 1 foto.
- Cuadrícula actual con hover y visor ampliado (lightbox) tal cual está hoy.

**Bloque B — "Directo desde nuestro Instagram"**
- Se muestra solo si `show_instagram_widget` está activo **y** hay un ID válido.
- Contenedor `<div className={`elfsight-app-${cleanId}`} data-elfsight-app-lazy />`.
- Encabezado, texto y botón "@will_design2020" se mueven aquí (hoy están en la cabecera común).

**Si no queda nada visible** (ambos apagados o sin contenido): se muestra el aviso actual que invita a ver Instagram, para no dejar la página vacía.

## 4. Arreglo del widget de Elfsight

- Helper `sanitizeWidgetId(raw)`: recorta espacios y elimina el prefijo `elfsight-app-` con `.replace(/^elfsight-app-/, '')` (repetido hasta que no quede). Se aplica tanto al valor del panel como a la variable de entorno.
- El script oficial `https://static.elfsight.com/platform/platform.js` se inyecta con `defer`, y si ya existe se vuelve a lanzar `initApps()` (necesario al navegar entre páginas).
- El hook devuelve un estado `loading | ready | error`:
  - `ready` → el widget se renderiza.
  - `error` (fallo de carga o sin respuesta tras ~8 s) → el bloque de Instagram no se muestra; la galería manual sigue visible como respaldo.
- La galería manual **nunca** se oculta por la existencia del ID de Elfsight.

## Detalles técnicos

- Archivos: `src/components/InstagramFeed.tsx` (refactor en `ManualGallery` + `InstagramWidgetBlock`), `src/routes/panel.contenido.tsx` (tipo `switch`, sanitizado del ID, dos campos nuevos).
- Lectura de flags con el hook existente `useSiteContent` / `siteContentQuery`; helper `isOn(key, defaultTrue)` que trata `""` como activo y `"false"`/`"0"`/`"no"` como apagado.
- El guardado del panel ya hace `upsert` de todas las claves con `onConflict: "key"`, así que las nuevas se crean solas al guardar.
- Sin cambios en `/galeria`, `/` ni en el enrutado; `InstagramFeed` conserva su nombre y su `id="portafolio"`.
