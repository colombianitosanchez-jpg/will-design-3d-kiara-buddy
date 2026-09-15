# Botón "Compartir" nativo en productos y servicios

Se añade un botón de compartir reutilizable, más un texto de compartir configurable por producto. No se toca el carrusel, la Vista Rápida ni los botones personalizados.

## 1. Nuevo campo en el panel de productos

- Nueva columna en la base de datos: `custom_share_text` (texto, opcional).
- En el formulario de producto, un campo de texto: "Texto para compartir (Ej: ¡Mira este diseño increíble!)", junto a los campos actuales de textos.
- Se guarda y se lee igual que el resto de campos del producto.

## 2. Botón de compartir

Nuevo componente reutilizable con el icono de compartir (estilo discreto, sin fondo):

- En móviles compatibles abre el menú nativo del teléfono (WhatsApp, correo, etc.) con el nombre del producto, el texto para compartir (o "Mira esto en Will Design 3D" si está vacío) y el enlace de la ficha.
- En escritorio copia el enlace y muestra el aviso "¡Enlace copiado al portapapeles!".
- Si el usuario cancela el menú nativo, no se muestra ningún error.

## 3. Dónde aparece

- Tarjeta de producto: icono pequeño en la esquina superior derecha de la foto (no navega a la ficha al pulsarlo).
- Ventana de Vista Rápida: al lado del nombre.
- Ficha del producto: al lado del nombre.
- Página de Servicios: un botón de compartir en la cabecera de la página, que comparte el enlace de Servicios.

## 4. Vista previa al compartir (WhatsApp/Facebook)

La ficha de producto ya envía el nombre, la descripción, la foto y el enlace propio de cada producto en las etiquetas de vista previa, así que ese punto ya está cubierto. Solo se ajusta un detalle: si la foto del producto no es una dirección web completa, se omite para que WhatsApp no muestre una imagen rota y use la imagen general del sitio.

Nota: los cambios de vista previa solo se ven en el enlace público después de publicar, y WhatsApp/Facebook siguen mostrando la versión que guardaron hasta que vuelven a leer el enlace.

## Detalles técnicos

- Migración: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_share_text text;` (sin cambios de RLS/grants).
- `src/lib/catalog.ts`: `custom_share_text: string | null` en el tipo `Product`, en `PRODUCT_SELECT` y en `normalizeProduct`.
- `src/routes/panel.productos.tsx`: campo en el tipo del formulario, en `empty`, en la lectura de filas y en el payload de guardado + `<Input>` con la etiqueta pedida (se guarda `null` si queda vacío).
- Nuevo `src/components/ShareButton.tsx`: props `{ title, text?, url?, className?, label? }`; `navigator.share` cuando existe (try/catch ignorando `AbortError`), si no `navigator.clipboard.writeText` + `toast.success("¡Enlace copiado al portapapeles!")` (sonner ya montado en `__root.tsx`). Usa `window.location.href` por defecto, resuelto en el handler (no en render) para no romper SSR; `e.preventDefault()/stopPropagation()`.
- Integración: `ProductCard.tsx` (icono absoluto `right-3 top-3` sobre la foto, junto al badge "Destacado"), `ProductQuickView.tsx` (fila con el título), `tienda.$slug.tsx` (junto al `h1`), `servicios.tsx` (cabecera).
- `tienda.$slug.tsx` head: filtrar `og:image`/`twitter:image` a URLs `https://` absolutas.
- Verificación: `bunx tsgo --noEmit`, build y Playwright a 375 y 1440 px (copiado en escritorio, sin errores de consola).
