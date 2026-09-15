# Revisión del sistema de pagos: coherencia y seguridad

Revisé la base de datos y las pantallas del flujo de pago. Funciona de punta a punta, pero encontré tres cosas que hay que corregir para que sea seguro y coherente.

## 1. Fuga de credenciales (crítico, confirmado)

Hoy cualquier visitante puede leer la columna de credenciales de los métodos activos (número de Nequi, llaves de la pasarela). La intención era limitarlo por columnas, pero el permiso quedó dado sobre toda la tabla.

Arreglo: quitar el permiso de lectura pública sobre la tabla y volver a darlo únicamente sobre nombre, tipo, instrucciones, orden y activo. Las credenciales quedan accesibles solo desde el servidor, para el Super Admin.

## 2. El cliente no recibe avisos de su pago

Los avisos de WhatsApp solo se disparan cuando cambia el estado del pedido (pendiente, empacando, enviado…). Si el cliente reporta su pago o si rechazamos el comprobante, no se genera ningún mensaje.

Arreglo: los cambios de estado de pago también entran en la cola de avisos, con dos eventos nuevos configurables desde Panel → Notificaciones (activables/desactivables como los demás):

- pago confirmado: "recibimos tu pago, empezamos a preparar tu pedido"
- pago rechazado: "no pudimos verificar el comprobante" + la nota del equipo

El aviso de "empacando" ya existe y se mantiene; se evita duplicar mensajes cuando ambos ocurren a la vez.

## 3. Un pago rechazado se queda bloqueado

Al rechazar, el pedido queda en "rechazado" y en el enlace del cliente no se explica con claridad que puede volver a reportar el pago con otro comprobante.

Arreglo: en la página de seguimiento, cuando el pago está rechazado se muestra la nota del equipo y de nuevo el formulario "Ya pagué" con un texto claro para reintentar. El panel sigue mostrando el historial del último comprobante.

## 4. Aún no hay métodos de pago creados

La tabla está vacía, así que el carrito hoy no muestra el paso de pago (se comporta como antes, sin bloquear pedidos). Eso es correcto, pero conviene crear el primer método para verlo. Puedo dejar creado un método "Nequi" desactivado como plantilla, listo para que solo pongas el número y lo actives.

## Verificación final

Prueba completa en el navegador: crear un método, comprar desde el carrito, entrar al enlace de seguimiento, reportar el pago, confirmarlo y rechazarlo desde el panel, comprobando el estado del pedido y los avisos generados en cada paso, en móvil y escritorio.

## Detalles técnicos

- Migración: `REVOKE SELECT ON public.payment_methods FROM anon, authenticated;` + `GRANT SELECT (id, name, type, instructions, display_order, is_active)` a `anon, authenticated`; se conserva `GRANT ALL` a `service_role` y las políticas RLS actuales.
- Migración: nuevo trigger `AFTER UPDATE OF payment_status ON public.orders` que llama a una función `private.enqueue_payment_notification()` con la misma lógica de `enqueue_order_notification` (`notification_settings.events`/`templates`, `next_working_slot`), eventos `pago_confirmado`, `comprobante_enviado` y `pago_rechazado`; se añaden esas claves por defecto a `notification_settings.events`/`templates`. `private.orders_payment_autostatus` ya avanza `pendiente → empacando`, así que el evento `pago_confirmado` se omite si en la misma operación se encoló `empacando`.
- `src/routes/panel.notificaciones.tsx`: añadir los eventos y plantillas nuevos a la UI existente (mismo patrón de switches/textarea).
- `src/routes/pedido.$token.tsx`: rama para `payment_status === 'rechazado'` que muestra `payment_note` y re-habilita el formulario con copy de reintento; `reportPayment` ya lo permite (solo bloquea `pagado`).
- Sin cambios en el carrusel, el navbar, los botones personalizados ni la lógica del carrito.
