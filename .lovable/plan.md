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

## Fase 3 — Seguridad de precios
- Los costos internos (costo por gramo, hora de máquina, margen) dejan de verse en la web; el cálculo se hace en el servidor y el cliente solo recibe el resultado.
- Kiara cotiza con el mismo motor.

## Fase 4 — Rendimiento móvil
- Carga diferida de fotos, GIFs y videos fuera de pantalla (hoy solo 3 sitios lo hacen).
- Cálculos del cotizador memorizados para que los deslizadores no se traben.
- Revisión de peso de la web y separación de partes pesadas (visor 3D, panel).

## Detalles técnicos
- Nueva ruta `src/routes/panel.servicios.tsx`; `admin.servicios.tsx` pasa a `redirect` a `/panel/servicios`. Columna `site_services.quoter_service_id uuid null` + `whatsapp_template text null`.
- `quoter_services`: `pricing_mode text default 'formula'`, `uses_global_vars boolean default false`, `price_display text default 'final'`, `volume_tiers jsonb default '[]'`. Solo columnas nuevas, nada se borra.
- `quoting_vars` sin lectura anónima; cálculo vía `createServerFn` reutilizando `quoter-core.ts`. Tests Vitest por regla (fijo, volumen, sin variables globales).
- Menú lateral: quitar entrada `cotizaciones`, añadir `servicios` (superOnly).
- `loading="lazy"`/`preload="none"` en ProductMedia, galería, carrusel salvo la primera; `React.lazy` para visor STL.
- Cada fase se verifica con tsgo, Vitest y navegador con sesión de Super Admin antes de pasar a la siguiente.
