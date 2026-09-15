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

## Detalles técnicos

- Migración: `CREATE TABLE public.payment_methods` (+ enum `payment_method_type`), `GRANT SELECT (id, name, type, instructions, display_order, is_active)` a `anon`/`authenticated`, `GRANT ALL` a `service_role`, RLS activa, política pública `is_active = true`, política de gestión con `is_super_admin(auth.uid())` (o función equivalente `SECURITY DEFINER` sobre `user_roles` con `role = 'super_admin' AND is_active`), trigger `updated_at`. `ALTER TABLE public.orders ADD COLUMN payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL, ADD COLUMN payment_method_name text`.
- Nuevo `src/lib/payment-methods.functions.ts`: `listPublicPaymentMethods` (cliente publicable, columnas seguras) y funciones de CRUD con `requireSupabaseAuth` que comprueban el rol Super Admin antes de usar el cliente privilegiado; las credenciales solo se leen/escriben ahí.
- Nueva ruta `src/routes/panel.pagos.tsx` (patrón de `panel.equipo.tsx`: `ssr: false`, guard `isSuperAdmin`, `robots: noindex`), y entrada `superOnly: true` en `ALL_LINKS` de `src/routes/panel.tsx`.
- `src/lib/cart-order.functions.ts`: `payment_method_id` opcional en el esquema zod, verificación de que el método existe y está activo, y persistencia de `payment_method_id`/`payment_method_name` en `orders`.
- `src/routes/carrito.tsx`: consulta de métodos activos con TanStack Query, `RadioGroup` de shadcn y bloque de instrucciones; el resto del formulario y del flujo se mantiene.
