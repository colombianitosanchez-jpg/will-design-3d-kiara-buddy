# Más formas de pago: pasarelas, contra entrega, efectivo y cripto

Amplío el configurador de pagos para que desde el panel puedas crear cualquier tipo de método: transferencia manual con QR, redirección a pasarela (PSE/tarjetas/PayPal), pago contra entrega, punto de efectivo (Efecty, Baloto) y criptomonedas. El flujo actual de carrito, QR y comprobante por WhatsApp se mantiene intacto.

## 1. Base de datos

- Se añaden los nuevos tipos a la lista permitida: `gateway_redirect`, `cash_on_delivery`, `cash_point`, `crypto` (los existentes `manual_transfer` y `gateway` siguen funcionando; `gateway` se trata como pasarela con redirección para no romper métodos ya creados).
- Nueva columna de ajustes variables (`config`) en los métodos de pago, para guardar el enlace de pago o las zonas permitidas según el tipo.

## 2. Panel → Pagos

- El selector de tipo pasa a tener cinco opciones: "Transferencia Manual / QR", "Redirección a Pasarela (PSE/Tarjetas)", "Pago Contra Entrega", "Punto de Efectivo (Efecty, etc)", "Criptomonedas".
- Los campos del formulario cambian según el tipo elegido:
  - Transferencia manual y punto de efectivo: instrucciones + URL/subida del código QR (como hoy).
  - Pasarela y cripto: campo "URL de pago / Link de checkout" (obligatorio) + instrucciones opcionales.
  - Contra entrega: campo "Zonas permitidas (Ej: Solo Bogotá)" + instrucciones opcionales.
- La lista de métodos muestra la etiqueta correcta del tipo y una insignia cuando tiene enlace de pago o QR.

## 3. Carrito público

- Los métodos activos se agrupan visualmente por familia con su icono: Transferencias y billeteras, Tarjetas y pasarelas, Efectivo, Cripto.
- Al elegir un método se muestra lo que corresponde: QR e instrucciones, el aviso de zonas para contra entrega, o el aviso de que se abrirá la plataforma de pago externa.
- Al confirmar el pedido:
  - Transferencia manual, punto de efectivo y contra entrega: se crea el pedido en "esperando pago" y se llega a la pantalla de agradecimiento con instrucciones, QR y el botón verde de WhatsApp (igual que hoy). En contra entrega el mensaje de WhatsApp dice: "Hola, acabo de realizar el pedido #REFERENCIA. El método es Pago Contra Entrega."
  - Pasarela y cripto: se crea el pedido en "esperando pago" y el navegador se redirige automáticamente al enlace de pago del método. Antes de salir se muestra un aviso breve con un enlace manual por si el navegador bloquea la redirección, y el enlace de seguimiento del pedido queda disponible.
- La página de seguimiento del pedido muestra lo mismo según el tipo: QR y "Ya pagué" para los manuales, botón "Ir a pagar" para pasarela/cripto, y el aviso de zonas para contra entrega.

## Detalles técnicos

- Migración: `ALTER TYPE public.payment_method_type ADD VALUE` para `gateway_redirect`, `cash_on_delivery`, `cash_point`, `crypto`; `ALTER TABLE public.payment_methods ADD COLUMN config jsonb NOT NULL DEFAULT '{}'::jsonb`; `GRANT SELECT (config) ON public.payment_methods TO anon, authenticated` (config no guarda secretos; las credenciales privadas siguen en `credentials`, sin grant público).
- `src/lib/payment-methods.functions.ts`: `PaymentMethodType` amplía la unión; `config` en `PublicPaymentMethod`/`AdminPaymentMethod`; zod `config: z.object({ payment_url: z.string().url().max(500).optional(), allowed_zones: z.string().max(300).optional() }).partial()` con validación condicional (`payment_url` requerido para `gateway_redirect`/`gateway`/`crypto`); selects de `listPublicPaymentMethods` y `listAdminPaymentMethods` incluyen `config`.
- Nuevo helper compartido `src/lib/payment-types.ts`: `PAYMENT_TYPE_OPTIONS` (label + grupo + icono lucide), `paymentGroup(type)`, `isManualFlow(type)` (manual_transfer | cash_point | cash_on_delivery) y `isRedirectFlow(type)` (gateway | gateway_redirect | crypto). Lo usan panel, carrito y seguimiento.
- `src/routes/panel.pagos.tsx`: `FormState` gana `payment_url` y `allowed_zones`; render condicional de campos por tipo; el bloque de QR solo para flujos manuales; etiquetas de tipo desde el helper.
- `src/lib/cart-order.functions.ts`: el select de validación añade `type, config`; la respuesta añade `payment_method_type` y `payment_url` para que el cliente sepa si debe redirigir.
- `src/routes/carrito.tsx`: agrupación de métodos por `paymentGroup`, bloque informativo por tipo, y en `onSubmit` tras crear el pedido: si `isRedirectFlow` → `window.location.assign(payment_url)` (con pantalla puente y enlace manual); si no, pantalla de agradecimiento actual. Texto de WhatsApp específico para `cash_on_delivery`.
- `src/lib/order-tracking.functions.ts`: `TrackedOrder.payment_method_type` amplía la unión y añade `payment_url` / `allowed_zones` leídos de `config`.
- `src/routes/pedido.$token.tsx`: ramas por tipo (QR + "Ya pagué" en manuales, botón "Ir a pagar" en pasarela/cripto, aviso de zonas en contra entrega).
- Sin cambios en el carrusel, el navbar, los botones personalizados ni en las reglas de rol; el panel de pagos sigue restringido a Super Admin.
