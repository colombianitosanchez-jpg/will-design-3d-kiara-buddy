# CTA dinámico y WhatsApp en tarjetas de producto

## Objetivo
Permitir que cada producto defina desde el panel su texto de acción y si muestra un acceso directo a WhatsApp, conservando la apariencia minimalista y la alineación actual de las tarjetas.

## Cambios
1. **Datos de productos**
   - Añadir `btn_text` con valor predeterminado `Ver más` y `show_whatsapp` con valor predeterminado `false`.
   - Mantener las reglas de acceso existentes de `products`; no se ampliarán permisos.
   - Los productos actuales recibirán automáticamente los valores predeterminados.

2. **Panel de productos**
   - Incorporar “Texto de acción” en los formularios de creación y edición.
   - Incorporar el interruptor “Mostrar icono de WhatsApp en el catálogo”.
   - Cargar y guardar ambos valores junto con el resto de la información del producto.

3. **Catálogo público**
   - Extender la consulta y el modelo público del producto con ambos campos.
   - Sustituir “Ver más” por el texto configurado, usando `Ver más` cuando esté vacío.
   - Mantener el enlace principal de la tarjeta hacia el detalle del producto y conservar la flecha.
   - Cuando esté habilitado, mostrar un icono discreto de WhatsApp junto a la acción. Su enlace abrirá una conversación con el texto “Hola, me interesa el producto: [nombre]”.
   - Usar el número global configurado en Contenido del panel, con el número actual del sitio como respaldo.
   - Evitar que pulsar WhatsApp también abra la ficha del producto y conservar la fila inferior alineada en móvil y escritorio.

## Verificación
- Comprobar creación y edición de ambos ajustes en `/panel/productos`.
- Confirmar en inicio y tienda que el texto cambia por producto, el icono solo aparece cuando corresponde y el enlace genera el mensaje correcto.
- Revisar tarjetas en móvil y escritorio, además de compilación y errores de ejecución.

## Detalles técnicos
- Cambio estructural mediante migración sobre `public.products`.
- Reutilización del `Switch` existente y del generador global de enlaces `wa.me`.
- Actualización focalizada de la gestión de productos, la consulta del catálogo y `ProductCard`; sin cambios de rutas ni del resto del diseño.
