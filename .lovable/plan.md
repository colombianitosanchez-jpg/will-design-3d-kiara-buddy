# Configurador de métodos de pago

Añade métodos de pago gestionables solo por el Super Admin (Nequi, transferencia bancaria, pasarelas) y un paso de selección de pago en el carrito. El carrito, el carrusel, el navbar y los botones personalizados no se tocan más allá de añadir el nuevo paso.

## 1. Base de datos y seguridad

Nueva tabla `payment_methods`: nombre, tipo (`manual_transfer` o `gateway`), instrucciones, credenciales (privadas), activo, orden de aparición, fechas.

- Cualquier visitante puede ver solo nombre, tipo e instrucciones de los métodos activos. Las credenciales quedan bloqueadas a nivel de permisos de columna, no solo de política, así que nunca salen al navegador.
- Crear, editar, activar y borrar métodos (incluidas las credenciales) queda reservado a cuentas con rol Super Admin activo, verificado en la base de datos con la función segura ya usada por el resto del panel.
- Los pedidos guardan el método elegido: se añaden a `orders` el identificador del método y su nombre en el momento de la compra.

## 2. Panel `/panel/pagos`

- Nueva página en el panel, visible en el menú solo para Super Admin; un empleado que entre por URL ve "Acceso restringido" y un enlace de vuelta al panel.
- Lista de métodos con: interruptor de activo, orden, editar y eliminar (con confirmación).
- Formulario para crear/editar: nombre, tipo, instrucciones para el cliente y credenciales (número de Nequi, llaves de la pasarela) en campos tipo contraseña con opción de mostrar. Las credenciales se guardan y actualizan desde el servidor, nunca se devuelven a la pantalla ya guardadas: si se dejan vacías, se conservan las existentes.

## 3. Carrito público

En `/carrito`, dentro del formulario de datos y antes del botón de confirmar:

- Lista seleccionable (RadioGroup) con los métodos activos.
- Al elegir un método de transferencia manual se muestran sus instrucciones.
- Si no hay métodos configurados, el carrito funciona igual que hoy (sin bloquear el pedido).
- El método elegido viaja con el pedido y se valida de nuevo en el servidor antes de guardar; la pantalla de agradecimiento repite las instrucciones de pago.
- En el panel de pedidos se muestra el método de pago de cada pedido.

## 4. El proceso completo, paso a paso

**Cliente (transferencia manual, ej. Nequi)**

1. Llena sus datos, elige "Nequi" y ve las instrucciones con el número.
2. Confirma el pedido: queda con referencia propia y estado de pago "esperando pago".
3. Llega a una página de seguimiento del pedido (enlace único con la referencia) que repite las instrucciones, el total y un formulario corto: "Ya pagué" con número/comprobante de la transacción y fecha.
4. Al reportar el pago, el pedido pasa a "comprobante enviado" y puede volver al enlace en cualquier momento para ver el avance.

**Cliente (pasarela)**

1. Elige la pasarela y confirma el pedido.
2. Se marca "esperando pago" y, cuando la pasarela avise que el pago se aprobó, el pedido se marca pagado sin intervención nuestra.

**Equipo (panel de pedidos)**

1. Los pedidos con comprobante enviado aparecen destacados con el dato del comprobante.
2. Un clic en "Confirmar pago" marca el pago como recibido y **automáticamente** mueve el pedido a "empacando".
3. Si el comprobante no cuadra, "Rechazar pago" lo devuelve a "esperando pago" con una nota para el cliente visible en su enlace de seguimiento.
4. El resto del flujo sigue igual: empacando → enviado → entregado.
5. Cada cambio de estado de pago entra en la cola de notificaciones existente, igual que los pedidos nuevos.

## Detalles técnicos

- Migración: `CREATE TABLE public.payment_methods` (+ enum `payment_method_type`), `GRANT SELECT (id, name, type, instructions, display_order, is_active)` a `anon`/`authenticated`, `GRANT ALL` a `service_role`, RLS activa, política pública `is_active = true`, política de gestión con `is_super_admin(auth.uid())` (o función equivalente `SECURITY DEFINER` sobre `user_roles` con `role = 'super_admin' AND is_active`), trigger `updated_at`.
- `orders`: nuevas columnas `payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL`, `payment_method_name text`, `payment_status` (enum `payment_status`: `esperando_pago`, `comprobante_enviado`, `pagado`, `rechazado`, default `esperando_pago`), `payment_reference text`, `payment_reported_at`, `payment_confirmed_at`, `payment_note text`, y `public_token uuid DEFAULT gen_random_uuid()` para el enlace de seguimiento. Sin políticas públicas sobre `orders`: todo el acceso del cliente pasa por server functions que exigen el token.
- Nuevo `src/lib/payment-methods.functions.ts`: `listPublicPaymentMethods` (cliente publicable, columnas seguras) y CRUD con `requireSupabaseAuth` + comprobación de rol Super Admin antes de usar el cliente privilegiado; las credenciales solo se leen/escriben ahí.
- Nuevo `src/lib/order-tracking.functions.ts`: `getOrderByToken` (devuelve solo campos seguros: referencia corta, total, estado, método e instrucciones) y `reportPayment` (token + referencia → `payment_status = 'comprobante_enviado'`, `payment_reported_at`).
- Nuevo `src/lib/order-payments.functions.ts` con `requireSupabaseAuth` (admin o empleado): `confirmPayment` (→ `pagado`, `payment_confirmed_at`, y `status = 'empacando'` si sigue en `pendiente`) y `rejectPayment` (→ `rechazado` + nota). La transición automática se hace en la base de datos con un trigger sobre `orders` para que valga también para la pasarela.
- Nueva ruta pública `src/routes/pedido.$token.tsx` (seguimiento + formulario "Ya pagué", `robots: noindex`).
- Ruta `src/routes/api/public/hooks/payment-webhook.ts` para el aviso de la pasarela, con verificación de firma/secreto antes de marcar el pago.
- Nueva ruta `src/routes/panel.pagos.tsx` (patrón de `panel.equipo.tsx`: `ssr: false`, guard `isSuperAdmin`, `robots: noindex`) y entrada `superOnly: true` en `ALL_LINKS` de `src/routes/panel.tsx`.
- `src/lib/cart-order.functions.ts`: `payment_method_id` opcional en el esquema zod, verificación de que el método existe y está activo, persistencia de método y estado de pago, y devolución del `public_token` para redirigir al seguimiento.
- `src/routes/carrito.tsx`: métodos activos con TanStack Query, `RadioGroup` de shadcn, bloque de instrucciones y pantalla final con enlace al seguimiento; el resto del formulario se mantiene.
- `src/routes/panel.pedidos.tsx`: columna de método y estado de pago, datos del comprobante y acciones Confirmar/Rechazar pago.

