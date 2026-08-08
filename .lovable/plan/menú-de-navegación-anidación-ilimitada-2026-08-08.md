# Menú de navegación: anidación ilimitada

## Lo que pasa hoy

En el Panel → Menú de navegación, el desplegable "Pertenece a (padre)" solo lista ítems de los dos primeros niveles (`depth < 2`), así que "Filamentos" (nivel 3) no aparece como padre posible y no se pueden crear "PLA", "PETG", etc. debajo.

En el navbar público el renderizado ya es recursivo (escritorio con flyout lateral y móvil con acordeón), así que soporta niveles 4 y 5 en cuanto existan datos. Falta un detalle: un ítem raíz con enlace y sin hijos se dibuja como desplegable vacío en vez de enlace directo.

No se toca la base de datos: ningún ítem existente se modifica ni se borra.

## Cambios

1. **Modal de crear/editar (`/panel/menu`)**
   - Quitar el límite de nivel: cualquier ítem puede ser padre, excepto el propio ítem y sus descendientes (esa protección ya existe y se mantiene, evitando ciclos).
   - Mostrar el nivel en cada opción del desplegable para no perder orientación en árboles profundos.
   - Un padre que ya tenía enlace sigue funcionando: al ganar hijos se comporta como disparador del desplegable, sin convertirlo ni perder su `link_value`.

2. **Navbar público**
   - Ítem raíz sin hijos: renderizar enlace simple en vez de desplegable vacío (escritorio y móvil).
   - Mantener el renderizado recursivo actual para niveles arbitrarios; en móvil, indentación por profundidad ya existente.

3. **Seguridad ante bucles**
   - El armado del árbol ya ignora referencias a padres inexistentes; se añade un control de nodos ya visitados para que un ciclo accidental en datos no cuelgue el render.

## Notas técnicas

- `src/routes/panel.menu.tsx`: `parentOptions` pasa de `depth < 2 && !blocked` a solo `!blocked`.
- `src/lib/menu.ts`: `buildTree` con set de visitados; sin cambios de tipos.
- `src/components/SiteHeader.tsx`: `DesktopRoot` y el bloque móvil devuelven enlace cuando `children.length === 0`.
- Sin migraciones ni cambios de layout del panel.
