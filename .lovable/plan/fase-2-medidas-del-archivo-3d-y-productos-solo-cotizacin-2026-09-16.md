# Fase 2: medidas del archivo 3D y productos "solo cotización"

Revisé la lista de la Fase 2 contra lo que ya está construido. La mayoría ya existe y funciona; solo faltan dos cosas reales. Detalle:

Ya listo (no se toca):
- Métodos de pago con QR, instrucciones y control exclusivo del Super Admin.
- QR + instrucciones en el carrito al elegir transferencia manual.
- Botón verde "Enviar comprobante por WhatsApp" en la página del pedido y en la pantalla de agradecimiento (con el número del sitio y la referencia del pedido).
- Vista Rápida con icono de ojo sobre la foto, ventana responsiva y zona de archivo 3D.
- Vistas previas al compartir (título e imagen) en la ficha de producto.
- Menú del panel reordenable arrastrando, con el orden guardado para todo el equipo.

## 1. Medidas reales del archivo 3D (.STL)

En la zona de "Sube tu archivo 3D":

- Al soltar o elegir un archivo .stl, se leen sus vértices y se calcula la caja que lo contiene.
- Debajo del nombre del archivo aparece: "Medidas: 120 x 80 x 45 mm" (un decimal si hace falta).
- Si el archivo no es .stl (.obj, .step) o no se puede leer, se muestra el nombre igual que hoy, sin medidas y sin errores visibles.
- No se dibuja ninguna vista 3D en pantalla: solo el cálculo.

Esas medidas se añaden automáticamente al mensaje de WhatsApp de los botones del producto, junto con la nota de archivo listo que ya se envía hoy.

## 2. Productos "solo cotización"

- Nuevo interruptor en Panel → Productos: "Solo cotización (ocultar precio)".
- En las tarjetas de la tienda y en la Vista Rápida, esos productos no muestran precio: en su lugar dicen "Sujeto a cotización".
- Los botones de "Agregar al carrito" y "Comprar ahora" quedan desactivados para esos productos (los botones de WhatsApp y enlaces siguen funcionando, que es la vía para cotizar).
- El carrito rechaza esos productos también del lado del servidor, para que no se pueda forzar la compra.

## Verificación

Probar en móvil y escritorio: soltar un .stl y ver las medidas, abrir WhatsApp desde un botón del producto y comprobar que el mensaje incluye las medidas; marcar un producto como solo cotización y ver el precio oculto y el botón de carrito desactivado en tarjeta, Vista Rápida y ficha.

## Detalles técnicos

- `bun add three` (+ tipos). `FileDropzone3D.tsx` importa `STLLoader` y `Box3`/`Vector3` mediante `await import("three")` dentro del handler, de modo que el paquete solo se descarga cuando el usuario suelta un archivo; nunca se monta un canvas WebGL.
- `FileDropzone3D` amplía su API: `onFileChange(name, dims?)` donde `dims = { x, y, z }` en mm; nuevo helper exportado `dimsNote(dims)` → "Medidas: X x Y x Z mm". El archivo sigue solo en memoria, sin Storage.
- `ProductQuickView.tsx` y `tienda.$slug.tsx` guardan `dims` en estado y componen `extraWhatsappNote` = `FILE_3D_WA_NOTE` + `dimsNote(dims)`; `ProductButtons.tsx` no cambia (ya soporta `extraWhatsappNote`).
- Migración: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quote_only boolean NOT NULL DEFAULT false;` (los GRANT y RLS existentes cubren la columna). Se prefiere una columna booleana a un JSON `{type:'quote_only'}` porque `pricing_rules` es la tabla de tarifas globales del cotizador, no un campo por producto; así el filtro del servidor y los listados son directos.
- `src/lib/catalog.ts`: `quote_only` en el tipo `Product` y en los selects.
- `ProductCard.tsx` / `ProductQuickView.tsx` / `tienda.$slug.tsx`: si `quote_only`, se muestra "Sujeto a cotización" en lugar de `formatCOP` y se pasa `quoteOnly` a `ProductButtons`, que desactiva las acciones `add_to_cart` y `checkout`.
- `cart-order.functions.ts`: al validar cada producto se lee `quote_only` y se devuelve error claro si viene en el pedido.
- Verificación: `bunx tsgo --noEmit`, build y Playwright 375/1440.
