# Códigos QR y comprobante por WhatsApp en los métodos de pago

Mejora del configurador de pagos: cada método de transferencia manual (Nequi, Bancolombia, etc.) podrá mostrar un código QR en el carrito, y tras confirmar el pedido el cliente tendrá un botón verde de WhatsApp para enviar su comprobante.

El sistema ya tiene una página de éxito/seguimiento segura (`/pedido/<enlace-único>`) y el estado de pago "esperando pago". En lugar de crear una ruta duplicada con el ID del pedido visible, el botón de WhatsApp se integra en esa página existente, que además permite reportar el pago y ver el avance. El carrito y el enrutado no se tocan más allá de esto.

## 1. Base de datos

- Nueva columna `qr_image_url` (texto, opcional) en `payment_methods`.
- Se incluye en el permiso de lectura pública por columnas, junto a nombre, tipo e instrucciones. No cambia nada más de seguridad.

## 2. Panel `/panel/pagos` (Super Admin)

- En el formulario de crear/editar, el QR se puede definir de dos formas:
  - **Subir la imagen** desde el computador o celular (se guarda en el almacenamiento del sitio, igual que las imágenes del carrusel y los productos).
  - **O pegar una URL** pública (Imgur, etc.).
- Vista previa del QR al guardarlo o escribir la URL, y botón para quitarlo.

## 3. Carrito (paso de pago)

- Al elegir un método de transferencia manual que tenga QR, se muestra la imagen centrada (máx. 250 px, bordes redondeados, sombra suave) y debajo las instrucciones, como hoy.
- Si no hay QR, todo sigue igual.

## 4. Página de seguimiento del pedido (éxito)

- Cuando el método de pago es transferencia manual, se muestra un botón verde destacado "Enviar comprobante por WhatsApp".
- Abre WhatsApp con el mensaje: "Hola, acabo de realizar el pedido #XXXXXXX en Will Design 3D. Adjunto el comprobante de pago." (la referencia corta del pedido).
- El número sale del ajuste global de WhatsApp del sitio (Panel → Contenido), el mismo que usan todos los botones actuales. Si no estuviera configurado, usa el número por defecto ya definido en el sitio.
- La pantalla de agradecimiento del carrito también muestra este botón junto al enlace de seguimiento.

## Verificación

Prueba en el navegador: crear un método con QR, comprar eligiendo ese método, ver el QR en el carrito, confirmar el pedido, pulsar el botón de WhatsApp (mensaje con la referencia correcta), y comprobar en móvil y escritorio. Typecheck y build.

## Detalles técnicos

- Migración: `ALTER TABLE public.payment_methods ADD COLUMN qr_image_url text;` + `GRANT SELECT (qr_image_url) ON public.payment_methods TO anon, authenticated;` (se conservan los GRANT y políticas actuales).
- `src/lib/payment-methods.functions.ts`: `qr_image_url` en `PublicPaymentMethod` y `AdminPaymentMethod`, en el esquema zod (`z.string().url().max(500).nullable()` o vacío → null) y en el upsert.
- `src/routes/panel.pagos.tsx`: Input + preview del QR.
- `src/routes/carrito.tsx`: bloque QR dentro del método seleccionado (manual_transfer con `qr_image_url`).
- `src/lib/order-tracking.functions.ts`: `getOrderByToken` devuelve también `qr_image_url` y `payment_method_type` para la página de seguimiento.
- `src/routes/pedido.$token.tsx`: botón WhatsApp verde (enlace externo `wa.me` con `waLink()` de `src/lib/catalog.ts` y mensaje con la referencia corta), visible mientras el pago no esté confirmado como pagado. Sin cambios en estados ni notificaciones.
- El número se lee de `site_content` (`contact_whatsapp`) vía el mismo helper `waLink`; no se duplica configuración.
