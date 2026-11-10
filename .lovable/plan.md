# Restaurar la foto en WhatsApp de productos y variantes

## Lo que encontré (revisado en el código)
1. **Sin foto propia en el botón, no se envía ningún enlace.** El botón solo agrega el enlace de previsualización si tiene foto propia o el interruptor antiguo "incluir imagen" encendido. Ese interruptor ya no existe en el panel y viene apagado, así que los niveles 2 (foto ★ de la variante) y 3 (portada del producto) nunca llegan a WhatsApp.
2. **Con foto propia, se manda el enlace directo del archivo**, que es largo y WhatsApp no siempre lo convierte en tarjeta con foto.
3. **La ficha del producto no respeta la estrella ★ de la variante**: toma la primera foto de la variante en lugar de su portada.

## Cómo quedará (tu jerarquía exacta)
Al tocar un botón de WhatsApp en un producto, siempre se adjunta un enlace corto (por ejemplo `/t/pla?v=2&b=1`) cuya tarjeta muestra:
1. **Foto propia del botón de WhatsApp** (Sección B) — si existe, gana siempre, también en botones propios de una variante.
2. **Foto ★ de la variante elegida** — si no tiene fotos propias, pasa al siguiente nivel.
3. **Portada ★ del producto** (o su primera foto).

Si no hay ninguna foto en los tres niveles, se envía solo el texto.

## Cambios
- **Nuevo enlace corto `/t/$slug`**: lee el producto, la variante (`v` = número de orden) y el botón (`b` = número de orden, en los botones del padre o de la variante si los tiene propios) y arma la tarjeta de WhatsApp con la jerarquía de arriba. Si alguien abre el enlace, lo lleva a la ficha con esa variante seleccionada.
- **Mensaje del botón**: siempre agrega ese enlace cuando hay alguna foto disponible; ya no depende del interruptor antiguo.
- **Ficha `/tienda/$slug`**: su tarjeta usa la foto ★ de la variante antes que las demás.
- **Panel**: el aviso de la Sección B dirá "Se usará esta foto" o "Se usará la foto ★ de la variante / del producto", en lugar de "solo texto".
- Las fotos se siguen omitiendo si son video.

## Detalles técnicos
- `buildButtonWhatsappText` (src/lib/product-buttons.ts): sustituir `resolvedMedia` por `productShareUrl(slug, variantIndex, buttonIndex)` y condicionar a `hasAnyImage`.
- Nueva función pura `resolveProductShareImage(product, variantIndex, buttonIndex)` en src/lib con tests: botón > variante.image_url (★) > variante.images > producto.image_url > producto.images; descarta videos.
- Ruta SSR `src/routes/t.$slug.tsx` con head() og:image/twitter:image, Cache-Control como `/r/$slug`, y redirección del lado del cliente a `/tienda/$slug?v=<uuid>`.
- `tienda.$slug.tsx` head: priorizar `v.image_url`.
- Mantener retrocompatibilidad con enlaces viejos `?v=<uuid>`.
- Tests: uno por nivel de la jerarquía y el caso "sin fotos = sin enlace".
