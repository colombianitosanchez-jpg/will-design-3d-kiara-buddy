# Vista Rápida + archivo 3D opcional por producto

Se añaden dos cosas al catálogo, sin tocar el carrusel del inicio, el menú responsivo ni la lógica de los botones personalizados.

## 1. Nueva opción en el panel de productos

- Nueva casilla en la base de datos: "acepta archivo 3D" (apagada por defecto).
- En el formulario de producto aparece un interruptor: "Solicitar archivo 3D al cliente (STL/OBJ/STEP) antes de cotizar", justo al lado de los interruptores actuales de WhatsApp y CTA.
- Se guarda y se lee igual que las demás opciones del producto.

## 2. Vista Rápida en las tarjetas

- Al pasar el cursor sobre la foto aparece un botón semitransparente centrado "Vista Rápida" con icono de ojo. En móvil el botón queda siempre visible en una esquina de la foto (no hay hover táctil).
- Abre una ventana modal:
  - Escritorio: foto a la izquierda, y a la derecha nombre, marca, precio, descripción corta y los botones personalizados del producto.
  - Móvil: todo apilado, con scroll interno.
  - Incluye enlace "Ver ficha completa" al detalle del producto.
- Los botones personalizados se muestran con el mismo componente que ya usan la tarjeta y la ficha, así que su comportamiento (enlace, WhatsApp, añadir al carrito, pagar) no cambia.
- El clic en "Vista Rápida" no navega a la ficha.

## 3. Zona para subir el archivo 3D

- Si el producto tiene la opción activada, aparece una zona con borde punteado encima de los botones, con el texto "Sube tu archivo 3D (.stl, .obj, .step)", tanto en la ventana de Vista Rápida como en la ficha del producto.
- Acepta arrastrar y soltar o clic para elegir archivo; se muestra el nombre del archivo elegido y se puede quitar.
- El archivo solo se guarda en memoria (no se sube al servidor todavía). Si el cliente pulsa un botón de WhatsApp, al mensaje se le añade: "Tengo un archivo 3D listo para enviar."

## Detalles técnicos

- Migración: `ALTER TABLE public.products ADD COLUMN accepts_3d_file boolean NOT NULL DEFAULT false;` (sin cambios de RLS/grants).
- `src/lib/catalog.ts`: añadir `accepts_3d_file` al tipo `Product`, a `PRODUCT_SELECT` y a la normalización.
- `src/routes/panel.productos.tsx`: campo en el tipo del formulario, en `empty`, en la lectura de filas y en el payload de guardado + `<Switch>` con la etiqueta pedida.
- Nuevo `src/components/FileDropzone3D.tsx`: div con borde punteado, `input[type=file]` oculto con `accept=".stl,.obj,.step,.stp"`, handlers `onDragOver`/`onDrop`, estado del nombre del archivo.
- `src/components/ProductButtons.tsx`: nueva prop opcional `extraWhatsappNote?: string` que se concatena al texto del mensaje en la acción `whatsapp`. Ningún otro cambio de lógica.
- Nuevo `src/components/ProductQuickView.tsx`: `Dialog` de shadcn con `grid gap-6 md:grid-cols-2`, `max-h-[90vh] overflow-y-auto`, imagen (o el degradado actual como respaldo), datos del producto, dropzone condicional y `<ProductButtons>`.
- `src/components/ProductCard.tsx`: se añade solo el overlay de hover y el estado de apertura del modal; la fila de precio/CTA y el bloque de botones personalizados se mantienen tal cual.
- `src/routes/tienda.$slug.tsx`: dropzone condicional encima de `ProductButtons`, pasando la nota de WhatsApp.
- Verificación: typecheck, build y revisión en el navegador a 375, 768 y 1440 px.
