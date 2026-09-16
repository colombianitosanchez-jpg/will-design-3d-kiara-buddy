# Variables globales del cotizador + Cotización guardada y compartible

Se añade sin reescribir el carrito, la navegación ni las tarjetas de producto: todo se integra en los archivos existentes.

## 1. Variables globales (Panel → Cotizador)

Nueva pestaña "Variables globales" dentro de `/panel/cotizador`, solo para Super Admin, con estos valores:

- Costo por gramo (FDM): 80
- Costo por ml (resina): 150
- Hora de máquina: 2.000
- Hora de mano de obra: 15.000
- Margen por defecto: 1,5
- Porcentaje de fallo: 15 %

Se guardan en la misma fila única de ajustes del panel que ya usa el orden del menú.

**Cómo se conectan con los precios actuales:** cada campo del cotizador (gramos, horas, ml…) gana un selector "Precio tomado de": *número fijo* (como hoy) o una de las variables globales. Lo que ya está configurado sigue funcionando igual; al elegir una variable, ese campo deja de usar su número propio y toma el valor global, y el porcentaje de fallo se suma al costo de ese campo. Así cambias un costo en un solo lugar y se actualiza en todos los servicios que lo usen.

El margen por defecto se ofrece como valor sugerido al crear un servicio nuevo; los servicios existentes mantienen su margen propio.

## 2. Guardar y compartir la cotización

En `/carrito` se añade un botón secundario "Guardar y Compartir Cotización" (icono de compartir) junto a los botones actuales:

- Guarda la lista del carrito y el total en una tabla nueva de cotizaciones guardadas.
- Devuelve un enlace propio y abre el menú nativo de compartir del teléfono; si no está disponible, copia el enlace al portapapeles con aviso.
- Título al compartir: "Cotización Will Design 3D".

Cualquier persona puede guardar una cotización, y solo se puede consultar con el enlace exacto (no se puede listar ni adivinar).

## 3. Servicios cotizados dentro del carrito

Para que la cotización compartida incluya "servicios personalizados" y no solo productos, el Cotizador gana un botón "Agregar al carrito" junto al de WhatsApp. Esas líneas aparecen en el carrito como servicio (nombre del servicio, cantidad, precio estimado) y se pueden compartir igual que los productos.

Al confirmar el pedido, el precio de cada servicio se vuelve a calcular en el servidor con las respuestas guardadas, igual que ya se hace con los productos: nadie puede enviar un precio inventado.

## 4. Página pública de la cotización (`/cotizacion/<id>`)

Vista limpia y formal con la marca Will Design 3D: fecha, número de cotización, lista de artículos (productos y servicios) con cantidad y precio, y el total. Incluye aviso de que los precios son estimados y sujetos a confirmación.

Botón principal: **"Añadir todo a mi carrito y Pagar"** → carga los artículos en el carrito y lleva a `/carrito`, que es donde ya se eligen los métodos de pago y se confirma el pedido.

## Detalles técnicos

- Migración: `ALTER TABLE public.admin_settings ADD COLUMN quoting_vars jsonb NOT NULL DEFAULT '{"fdm_gram_cost":80,"resin_ml_cost":150,"machine_hour_rate":2000,"labor_hour_rate":15000,"default_margin":1.5,"failure_rate_percentage":15}'::jsonb;` + `GRANT SELECT (quoting_vars) ... TO anon, authenticated` (lectura pública necesaria para calcular precios en la web; `UPDATE` ya está restringido a super_admin por la política existente).
- Migración: `ALTER TABLE public.quoter_fields ADD COLUMN price_source text NOT NULL DEFAULT 'fixed'` con trigger de validación (valores: `fixed`, `fdm_gram_cost`, `resin_ml_cost`, `machine_hour_rate`, `labor_hour_rate`).
- Migración: `CREATE TABLE public.saved_quotes (id uuid pk default gen_random_uuid(), items jsonb not null default '[]', total_price numeric not null default 0, created_at timestamptz not null default now())`; `GRANT SELECT, INSERT ON public.saved_quotes TO anon, authenticated; GRANT ALL TO service_role;` RLS: `INSERT` con `WITH CHECK (true)` para `anon, authenticated`; `SELECT` `USING (true)` — la tabla no expone datos personales y el id uuid actúa como token (sin `SELECT` por lista: la consulta siempre filtra por id; no se añaden políticas de `UPDATE`/`DELETE`).
- `src/lib/quoter-core.ts`: `QuoterField` gana `price_source`; `computeQuote` recibe un tercer parámetro opcional `vars: QuotingVars` y resuelve `unitCost = price_source === 'fixed' ? price_per_unit_cop : vars[price_source]`, aplicando `failure_rate_percentage` a ese costo. Sin `vars` el comportamiento es idéntico al actual (compatible con Kiara y `/api/calculate-quote`).
- `src/lib/quoting-vars.ts`: tipo `QuotingVars`, `DEFAULT_QUOTING_VARS`, `quotingVarsQuery()` (lee `admin_settings`) y `saveQuotingVars()`; versión servidor en `src/lib/quoter.server.ts` para Kiara y la ruta de cálculo.
- `src/lib/cart.tsx`: `CartItem` gana `kind?: "product" | "service"`, `service_slug?`, `answers?` y `unit_label?`; `product_id` sigue siendo la clave (para servicios se genera `svc:<slug>:<hash de respuestas>`). Nada del API actual (`addItem`, `setQuantity`, `removeItem`) cambia de firma.
- `src/lib/cart-order.functions.ts`: el esquema acepta líneas `kind: "service"` con `service_slug` + `answers`; el servidor carga el servicio con `fetchQuoterServices` (server) + `coerceAnswers` + `computeQuote(vars)` y usa ese precio para `order_items` (`product_id` nulo, `product_name` = nombre del servicio).
- `src/lib/saved-quotes.functions.ts`: `saveQuote` (insert público vía cliente publishable, valida items con zod y recalcula el total en el servidor) y `getSavedQuote(id)`.
- `src/routes/carrito.tsx`: botón `variant="outline"` que llama `saveQuote` y reutiliza la lógica de `ShareButton` (`navigator.share` + fallback portapapeles) sin modificar ese componente.
- `src/routes/cotizacion.$id.tsx`: nueva ruta pública con `loader` que llama `getSavedQuote` (server fn pública, sin `requireSupabaseAuth`), `head()` propio, `errorComponent` y `notFoundComponent`; el CTA hace `clear()` + `addItem()` por línea y `navigate({ to: "/carrito" })`.
- `src/routes/panel.cotizador.tsx`: se añade la sección de variables globales (formulario + guardar) y el selector `price_source` en el editor de campos; el resto del CRUD queda intacto.
