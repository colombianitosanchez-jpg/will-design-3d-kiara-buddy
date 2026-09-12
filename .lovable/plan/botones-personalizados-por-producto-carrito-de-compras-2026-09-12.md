# Botones personalizados por producto + carrito de compras

## Objetivo
Poder crear, desde el panel, tantos botones como quieras en cada producto: su texto, estilo, ancho, alineación y qué hace al pulsarlo. Y que las acciones de compra funcionen de verdad con un carrito nuevo.

## 1. Datos del producto
- Nuevo campo `custom_buttons` en productos (lista, vacía por defecto).
- Cada botón guarda: identificador, texto, estilo (`default`, `secondary`, `destructive`, `outline`, `ghost`), ancho (`auto` o completo), alineación (izquierda, centro, derecha), tipo de acción (`link`, `whatsapp`, `add_to_cart`, `checkout`) y su valor (URL o número de WhatsApp).
- Los productos existentes quedan sin botones, así que su tarjeta no cambia.

## 2. Panel de productos
- Sección "Botones del producto" en crear y editar, con lista dinámica: añadir, eliminar y reordenar (flechas arriba/abajo).
- Por botón: texto, estilo, ancho, alineación y tipo de acción.
- El campo de valor cambia según la acción: URL para Enlace, número para WhatsApp, y se oculta en Añadir al carrito e Ir al pago.
- Aviso claro si falta la URL o el número antes de guardar.
- Interruptor por producto: "Ocultar el texto de acción y el icono de WhatsApp actuales" — así decides libremente si la tarjeta muestra lo de siempre, solo tus botones, o ambos.

## 3. Tarjeta del producto (inicio, tienda y ficha)
- Debajo del precio se muestran los botones configurados, agrupados por alineación y respetando estilo y ancho.
- Acciones:
  - Enlace: rutas internas navegan dentro del sitio; enlaces externos abren en pestaña nueva.
  - WhatsApp: abre chat con el número del botón (o el número global si está vacío) y el mensaje "Hola, me interesa el producto: [nombre]".
  - Añadir al carrito: suma el producto y muestra confirmación.
  - Ir al pago: añade el producto y lleva directo a `/carrito`.
- Pulsar un botón no abre la ficha del producto por accidente.

## 4. Carrito nuevo
- Carrito guardado en el navegador del visitante, con contador visible en la cabecera.
- Página `/carrito`: productos, cantidades, subtotal, quitar/vaciar y formulario de datos (nombre, correo, teléfono, dirección, ciudad, notas) para confirmar el pedido.
- El pedido confirmado entra en Pedidos del panel igual que hoy, y también avisa por WhatsApp como el resto de pedidos.

## Verificación
- Crear varios botones en un producto y comprobar texto, color, ancho y alineación en inicio, tienda y ficha.
- Probar las cuatro acciones, añadir al carrito desde varias tarjetas y completar un pedido de prueba visible en el panel.
- Revisar móvil y escritorio, más errores de compilación y de ejecución.

## Detalles técnicos
- Migración en `public.products` para `custom_buttons jsonb not null default '[]'`; mismas reglas de acceso.
- Tipo `ProductButton`, parseo defensivo y validación en `src/lib/catalog.ts`; el campo se añade al `PRODUCT_SELECT`.
- Editor de botones en `src/routes/panel.productos.tsx` (estado local existente, sin introducir react-hook-form).
- `src/components/ProductCard.tsx` y la ficha `tienda.$slug.tsx` renderizan `Button` de shadcn y comparten un `handleButtonAction`.
- Carrito: `src/lib/cart.tsx` (contexto + localStorage), proveedor en `__root.tsx`, indicador en `SiteHeader.tsx`, ruta nueva `src/routes/carrito.tsx` reutilizando la creación de pedidos existente de `orders.functions.ts`.
