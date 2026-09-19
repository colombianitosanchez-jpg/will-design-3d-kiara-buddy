# Servicios gestionables desde el panel

La página /servicios hoy tiene los 7 servicios escritos en el código. Los movemos a la base de datos y creamos el CRUD en el Panel, siguiendo el patrón existente (Cotizador: lectura pública de filas activas + edición solo para Super Admin desde el navegador con RLS).

## 1. Migración (base de datos)

- Nueva tabla `public.site_services`: slug, título, lead, bullets (lista), color (orange/teal/wine), icono (clave de un set fijo), tip de Kiara, imagen opcional, activo, orden, created_at/updated_at con trigger.
- GRANT: lectura a anon + authenticated, todo a service_role. RLS: público lee solo filas activas; solo Super Admin (private.has_role admin) crea/edita/oculta/elimina.
- INSERTs con los 7 servicios actuales (mismo orden, textos, colores, iconos y tips) para que la página no cambie visualmente.

## 2. Lectura pública

- Nuevo `src/lib/site-services.ts`: tipo SiteService, mapa de iconos (claves → lucide), normalización, `fetchSiteServices(includeInactive)` y `siteServicesQuery`.
- `src/routes/servicios.tsx`: reemplaza el arreglo fijo por `useQuery(siteServicesQuery())`. Cada tarjeta usa slug como ancla (la lógica de "Cotizar en línea" con Panel → Cotizador sigue igual), muestra `image_url` si existe y si no el degradado actual; los cursos quedan como están.

## 3. Panel

- Nueva página `/panel/servicios` (solo Super Admin): lista de servicios con agregar, editar (título, lead, viñetas una por línea, color, icono, tip, imagen con URL o subida al bucket site-media con URL firmada), mostrar/ocultar (ojo) y reordenar con flechas, igual que en el Cotizador.
- `src/routes/panel.tsx`: nueva entrada "Servicios" (icono Wrench, solo Super Admin) en el menú lateral.
- `/admin/servicios`: el botón "próximamente" pasa a un enlace a /panel/servicios.

## 4. Verificación

- Typecheck + build.
- Playwright: /servicios muestra los 7 servicios; en el panel se agrega, edita, oculta y reordena uno de prueba, y se ve reflejado en la página pública. Datos de prueba eliminados al final.
