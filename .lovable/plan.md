# Integración profesional del cotizador con todo el sitio

El cotizador nuevo ya funciona y se administra desde el Panel, pero todavía vive un poco "aparte" del resto. Este plan cierra las conexiones que faltan para que catálogo, servicios, pedidos, Kiara y el Panel hablen el mismo idioma.

## 1. Panel → Pedidos: ver la cotización completa

Hoy la pestaña "Cotizaciones 3D" solo muestra los campos antiguos (material, acabado, medidas) y no el servicio elegido, las respuestas del cliente ni el precio estimado que la web ya calculó.

- Mostrar servicio, cantidad y **precio estimado** en cada fila.
- Al expandir: lista completa de respuestas (peso, calidad, urgencia, etc.) tal como las eligió el cliente.
- Estados de la cotización manejables: nueva → cotizada → aprobada → rechazada.
- Botón "Convertir en pedido": crea el pedido con el total estimado, sin recapturar datos.

## 2. Entradas al cotizador desde toda la web

- Nueva página propia `/cotizador` (además de la sección en Inicio), para poder enlazarla y compartirla.
- En `/servicios`: cada tarjeta de servicio tendrá un botón "Cotizar este servicio" que abre el cotizador **con ese servicio ya seleccionado**.
- En la ficha de producto (filamentos, resinas, insumos): botón "Cotizar cantidad" que abre el cotizador en el servicio de insumos.
- Kiara podrá enviar al cliente al cotizador con el servicio correcto ya elegido.

## 3. Un solo motor de precios (quitar la duplicación)

Ahora hay dos sistemas: las "Reglas de precios" antiguas y el cotizador nuevo. Kiara y la ruta interna de cálculo siguen usando el viejo.

- Kiara cotizará con los servicios y precios del cotizador nuevo, así lo que dice Kiara y lo que muestra la web **siempre coinciden**.
- La sección "Reglas de precios" del Panel se retira del menú (los valores quedan guardados) para que exista un único lugar donde cambiar precios: Panel → Cotizador.
- Kiara guardará su cotización en la misma tabla, de modo que aparezca en Panel → Pedidos igual que las de la web.

## 4. Servicios del sitio conectados a los servicios del cotizador

Los servicios de `/servicios` están escritos en el código y los del cotizador están en la base de datos: son dos listas distintas.

- Vincular cada tarjeta de `/servicios` con su servicio del cotizador, para que al agregar un servicio nuevo en el Panel aparezca también el botón de cotizar correspondiente.

## 5. Notificaciones y correo del equipo

- Cada cotización nueva entra a la cola de notificaciones existente (WhatsApp) con el resumen y el total estimado, respetando el horario laboral ya configurado.

## 6. Detalles de calidad

- Corregir el parpadeo/desajuste de "Productos destacados" en Inicio precargando los productos en el servidor.
- Título, descripción y datos para compartir en la nueva página `/cotizador`.
- Revisión responsiva del cotizador y del Panel → Cotizador en móvil, tablet y escritorio.

## Detalles técnicos

- `quotes`: añadir `status` con valores controlados y trigger de notificación reutilizando `enqueue_order_notification` (o gemelo para cotizaciones); política de lectura/actualización solo para `admin`/`staff`.
- Nueva ruta `src/routes/cotizador.tsx` con `head()` propio; `Quoter` acepta `initialServiceSlug` y lee `?servicio=` de la URL.
- `quoter_services`: nueva columna `site_anchor` para enlazar con las secciones de `/servicios`.
- `src/lib/kiara-tools.server.ts`: `generate_quote` pasa a usar `computeQuote` + `fetchQuoterServices` (server-side) en vez de `calcQuote`/`pricing_rules`; se agrega herramienta `open_quoter` que devuelve el enlace con el servicio preseleccionado.
- `src/routes/api/calculate-quote.ts` migra al motor de `src/lib/quoter.ts`, manteniendo compatibilidad de respuesta.
- `src/routes/panel.pedidos.tsx`: la pestaña de cotizaciones lee `service_name`, `answers`, `quantity`, `estimated_total_cop`; acción de conversión vía server function con `requireSupabaseAuth`.
- `src/routes/index.tsx`: `loader` con `ensureQueryData(productsQuery())` y `useSuspenseQuery` para eliminar el desajuste de hidratación.
- Se retira `/panel/cotizaciones` del menú lateral (la ruta y los datos permanecen).
