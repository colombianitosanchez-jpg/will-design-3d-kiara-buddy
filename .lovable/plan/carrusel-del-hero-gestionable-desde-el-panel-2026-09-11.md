# Carrusel del hero gestionable desde el panel

Convertir la imagen fija del inicio en un carrusel de fotos y videos que el equipo administra desde el panel, sin cambiar el diseño actual.

## Qué verá el visitante

- En el mismo lugar de la foto principal aparecerá un carrusel que avanza solo cada 4,5 segundos y se detiene si la persona lo toca o arrastra.
- Se mantienen exactamente las esquinas redondeadas, la sombra, el resplandor de fondo y la proporción 4:3 actuales.
- La etiqueta flotante "Pieza destacada" queda en el mismo sitio, encima del carrusel.
- Los videos se reproducen solos, en silencio y en bucle; las fotos se muestran recortadas igual que hoy.
- Si todavía no hay elementos activos, se muestra la imagen de siempre (la del panel de Contenido), así nunca queda un hueco.

## Qué podrá hacer el equipo

Nueva pestaña "Carrusel" en el panel (visible junto a Contenido):

- Arrastrar o elegir archivos para subir varios a la vez; el tipo (foto o video) se detecta automáticamente por el archivo.
- Ver la lista de elementos con su miniatura, activar o desactivar cada uno y reordenarlos con flechas.
- Eliminar elementos.
- Límite de tamaño por archivo y aviso claro si un archivo no es imagen ni video.

## Detalles técnicos

Base de datos y almacenamiento
- Nueva tabla `public.hero_carousel`: `id`, `media_url`, `media_type` ('image' | 'video'), `is_active`, `display_order`, `created_at`, `updated_at` (con trigger `set_updated_at`).
- GRANT: `SELECT` a `anon` y `authenticated`; CRUD a `authenticated`; `ALL` a `service_role`.
- RLS: lectura pública solo de filas activas; lectura completa y escritura para quienes pasan `has_role(auth.uid(),'staff')`, igual que las demás tablas del panel.
- Nuevo bucket de almacenamiento `site-media` (público) con políticas en `storage.objects`: lectura pública, subida/borrado solo para staff. Si la política del workspace bloquea buckets públicos, se mantiene privado y se usan URLs firmadas de larga duración, como ya hace `ImageDropzone`.

Frontend
- `src/lib/hero-carousel.ts`: `heroCarouselQuery()` con `queryOptions` (patrón de `src/lib/catalog.ts`), lee filas activas ordenadas por `display_order`.
- `src/routes/index.tsx`: dentro de `Hero`, reemplazar el `<img>` por `<Carousel>` de `@/components/ui/carousel` con el plugin `embla-carousel-autoplay` (delay 4500, `stopOnInteraction: true`). Se conservan los contenedores, clases y la etiqueta flotante existentes. Se añade el prefetch de la nueva consulta en el `loader`.
- Instalar `embla-carousel-autoplay` (`embla-carousel-react` ya está).
- Nueva ruta `src/routes/panel.carrusel.tsx` (mismo estilo que `panel.contenido.tsx`) y entrada "Carrusel" en `ALL_LINKS` de `src/routes/panel.tsx`.
- La subida reutiliza el patrón de `ImageDropzone` adaptado para aceptar también video (`video/mp4`, `webm`, `quicktime`).

No se toca el cotizador, la tienda, el menú, Kiara ni las reglas de las tablas existentes.
