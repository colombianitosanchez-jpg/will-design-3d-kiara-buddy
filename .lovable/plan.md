# Ecosistema Will Design 3D: Servicios, Cotizadores, Contenido y Móvil

Revisión del plan: el orden es correcto, pero se ajustan tres puntos para no romper lo que ya funciona.

## Ajustes tras revisar el código
- **Servicios**: no existe `/panel/servicios`; el editor actual vive en una ruta antigua (`/admin/servicios`). Se crea el módulo nuevo en el Panel y la ruta antigua redirige ahí, sin perder datos.
- **Reglas de precios** (`/panel/cotizaciones`) sigue en el menú y duplica el Cotizador. Se retira del menú (los datos quedan), dejando un solo lugar para precios.
- **Orden del inicio** ya funciona con arrastrar y soltar; no se rehace, solo se añade el campo numérico de posición.

## Fase 1 — Servicios (`/panel/servicios`)
- Crear, editar, ocultar, borrar y ordenar servicios arrastrando.
- Cada servicio: foto/video, texto, mensaje de WhatsApp propio y un selector "Cotizador vinculado" (ninguno = botón directo a WhatsApp con mensaje prellenado).
- `/servicios` público lee solo de aquí.

## Fase 2 — Cotizadores independientes
- Cada cotizador con sus propias reglas: precio fijo (ej. cursos), por material/peso, por horas o por cantidad con descuentos por volumen.
- Las variables globales solo se usan si el cotizador las activa; por defecto, apagadas.
- Opción por cotizador: mostrar al cliente solo el precio final o el desglose.

## Fase 3 — Seguridad de precios (una sola fuente de verdad)
- El cálculo vive solo en el servidor: la web y Kiara envían las respuestas del cliente y reciben el precio final o el desglose autorizado.
- Ni el navegador ni llamadas externas ven márgenes, costos de proveedor ni fórmulas.

## Fase 4 — Rendimiento móvil
- Carga diferida de fotos, GIFs y videos fuera de pantalla (hoy solo 3 sitios lo hacen).
- Cálculos del cotizador memorizados para que los deslizadores no se traben.
- Las partes pesadas (visor 3D, editores del panel) se descargan solo cuando se usan; quien ve la tienda desde el celular baja una versión ligera.

## Detalles técnicos
- Nueva ruta `src/routes/panel.servicios.tsx`; `admin.servicios.tsx` redirige a `/panel/servicios` preservando parámetros y búsqueda (`?id=`, etc.) para no romper enlaces guardados. Columna `site_services.quoter_service_id uuid null` + `whatsapp_template text null`.
- `quoter_services`: `pricing_mode text default 'formula'`, `uses_global_vars boolean default false`, `price_display text default 'final'`, `volume_tiers jsonb default '[]'`. Solo columnas nuevas, nada se borra.
- Motor único: `createServerFn` `computeQuoteServer` (en `quoter.functions.ts`, lógica en `quoter.server.ts` sobre `quoter-core.ts`); lee `quoting_vars` con cliente privilegiado; devuelve solo total o desglose según `price_display`. Kiara (`kiara-tools.server.ts`) y `/api/calculate-quote` llaman al mismo helper. Se quita la lectura anónima de `quoting_vars` y el navegador deja de importar fórmulas con costos. Tests Vitest por regla (fijo, volumen, sin variables globales, desglose oculto).
- Menú lateral: quitar entrada `cotizaciones`, añadir `servicios` (superOnly).
- `loading="lazy"`/`preload="none"` en ProductMedia, galería, carrusel salvo la primera; `React.lazy` + `Suspense` para visor STL/FileDropzone3D, RichTextEditor, VariantsEditor y ProductButtonsEditor.
- Cada fase se verifica con tsgo, Vitest y navegador con sesión de Super Admin antes de pasar a la siguiente.
