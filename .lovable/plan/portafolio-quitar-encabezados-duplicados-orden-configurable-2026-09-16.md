# Portafolio: quitar encabezados duplicados + orden configurable (manual vs Instagram)

## Origen de la duplicación (verificado)

- `/galeria` tiene su propio encabezado de página con el título **"Piezas que hemos impreso"**, y justo debajo `InstagramFeed` vuelve a pintar el bloque manual con el mismo título. En el inicio (`index.tsx`) el componente se renderiza solo, sin duplicar.
- La estructura interna de `InstagramFeed` ya tiene exactamente dos bloques independientes (manual e Instagram); no hay que reescribir la página, solo corregir el encabezado duplicado y añadir el orden.

## 1. Nueva clave de ajuste (sin migración)

Los ajustes del sitio son clave/valor de texto en `site_content`, así que solo se añade la clave:

- `portfolio_display_order` — valores `"manual_first"` (por defecto cuando está vacío) o `"instagram_first"`.

## 2. Panel → Contenido → Portafolio

En `src/routes/panel.contenido.tsx`, debajo de los dos interruptores de visibilidad:

- Nuevo tipo de campo `select` en `FieldDef` (opciones `{ value, label }`), renderizado con el `Select` de shadcn/ui.
- Campo "Orden de visualización" con las opciones:
  - `manual_first` — "Fotos manuales primero, luego Instagram"
  - `instagram_first` — "Instagram primero, luego fotos manuales"
- Se guarda con el `upsert` existente, sin tocar nada más del panel.

## 3. Limpieza de encabezados duplicados

- En `src/routes/galeria.tsx`: se ajusta el texto del encabezado de la página para que no repita "Piezas que hemos impreso" (la página presenta el portafolio completo, p. ej. "Nuestro portafolio" / "Portafolio en vivo"), dejando el título del bloque manual solo dentro de `InstagramFeed`.
- Resultado estricto: dos bloques con un solo encabezado cada uno:
  - **Bloque A (manual):** "Piezas que hemos impreso" + subtítulo + cuadrícula de fotos con visor ampliado.
  - **Bloque B (Instagram):** "Directo desde nuestro Instagram" + subtítulo + contenedor de Elfsight.

## 4. Lógica de orden en `src/components/InstagramFeed.tsx`

- Leer `portfolio_display_order` del contenido del sitio (vacío o desconocido ⇒ `manual_first`).
- Extraer el JSX de los dos bloques en variables (`manualBlock`, `instagramBlock`) y renderizarlas en el orden elegido, respetando las condiciones actuales de visibilidad de cada uno.
- Mantener `space-y-12` entre bloques (espaciado consistente en escritorio y móvil) y el aviso `PortfolioTeaser` cuando ninguno queda visible.

## Detalles técnicos

- Archivos: `src/components/InstagramFeed.tsx` (orden condicional de bloques), `src/routes/galeria.tsx` (texto del encabezado de página), `src/routes/panel.contenido.tsx` (tipo `select` + nuevo campo).
- No se toca el Hero, el navbar, el carrito ni la lógica de pagos. Sin cambios en la base de datos ni en el enrutado.
