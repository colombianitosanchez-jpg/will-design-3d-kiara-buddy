# Compartir la página completa desde cualquier parte del sitio

Se añade un botón de compartir global (reutilizando el `ShareButton` que ya existe) que comparte la URL de la página actual — si estás en la tienda comparte la tienda, si estás en un producto comparte ese producto, etc. No se toca el carrusel, la Vista Rápida ni los botones personalizados.

## 1. Dónde aparece

- **Cabecera (escritorio)**: icono de compartir pequeño junto al carrito, antes del botón de WhatsApp.
- **Cabecera (móvil/tablet)**: icono visible junto al carrito; además una opción "Compartir esta página" al final del menú lateral (Sheet).
- **Pie de página**: opción "Compartir esta página" junto a los enlaces existentes.

## 2. Comportamiento

- En móviles compatibles abre el menú nativo del teléfono (WhatsApp, correo, etc.) con el título del sitio y la URL de la página actual.
- En escritorio copia el enlace y muestra el aviso "¡Enlace copiado al portapapeles!".
- La URL se resuelve al hacer clic (`window.location.href`), así funciona en cualquier página sin configuración adicional.
- Texto por defecto: "Mira esto en Will Design 3D".

## 3. Vista previa al compartir (WhatsApp/Facebook)

Las etiquetas de vista previa del sitio (título, descripción e imagen general del logo) ya están definidas a nivel global en el sitio, y cada ficha de producto ya envía las suyas propias, así que cualquier página compartida mostrará una tarjeta correcta. Nota: esto solo se ve en el enlace público después de publicar.

## Detalles técnicos

- Reutiliza `src/components/ShareButton.tsx` sin modificarlo (ya resuelve `window.location.href` en el handler, seguro para SSR).
- `src/components/SiteHeader.tsx`: `ShareButton` con `title="Will Design 3D"` en el nav de escritorio y en la barra móvil; entrada "Compartir esta página" en el Sheet móvil (cierra el menú al usarla).
- `src/components/SiteFooter.tsx`: enlace/botón "Compartir esta página" en la columna de enlaces.
- Verificación: `bunx tsgo --noEmit`, build OK y Playwright a 375 y 1440 px (botón visible en cabecera, menú móvil y pie; copiado al portapapeles con aviso en escritorio, sin errores de consola).
