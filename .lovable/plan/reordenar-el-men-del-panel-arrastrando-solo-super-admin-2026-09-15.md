# Reordenar el menú del panel arrastrando (solo Super Admin)

Poder reorganizar el orden de los módulos del menú lateral del panel arrastrándolos con el dedo o el mouse. El orden que definas queda guardado y lo ve todo el equipo. Solo el Super Admin puede cambiarlo.

## Cómo funcionará

- Abajo del menú lateral aparece un botón "Modo edición" (icono de candado), visible solo para el Super Admin.
- Con el modo apagado: el menú funciona exactamente como hoy (enlaces normales, resaltado del módulo activo).
- Con el modo encendido: cada módulo muestra un tirador para arrastrar; los enlaces no navegan mientras se ordena. Funciona con el dedo en móvil y tablet.
- Al soltar un módulo, el nuevo orden se guarda al instante y se avisa con un mensaje de confirmación (o de error si algo falla).
- El equipo (empleados) ve el mismo orden global, pero sigue viendo solo los módulos permitidos para su rol.
- Si más adelante se agrega un módulo nuevo, aparece automáticamente al final de la lista.

## Alcance protegido

No se toca el enrutado, el contenido de ninguna página, ni las reglas de acceso por rol que ya existen. Solo cambia el orden en que se pintan los enlaces del menú y se agrega el modo edición.

## Detalles técnicos

**Base de datos**

- Nueva tabla `public.admin_settings`: `id uuid PK`, `sidebar_order jsonb NOT NULL DEFAULT '[]'`, `created_at`, `updated_at` + trigger `set_updated_at`.
- Una sola fila sembrada en la misma migración (INSERT literal) con `sidebar_order = '[]'`.
- `GRANT SELECT, UPDATE ON public.admin_settings TO authenticated; GRANT ALL TO service_role;` (sin `anon`).
- RLS activo:
  - SELECT: `TO authenticated` para cuentas del equipo activas (rol `empleado` o `super_admin` en `user_roles`).
  - UPDATE: `TO authenticated` solo si el usuario tiene `role = 'super_admin'` y `is_active = true` en `user_roles` (USING + WITH CHECK).
  - Sin políticas de INSERT/DELETE: la fila única no se crea ni se borra desde la app.

**Dependencias**

`bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.

**Código**

- Nuevo `src/lib/sidebar-order.ts`: clave estable por módulo (`inicio`, `productos`, `pedidos`, …) derivada de la ruta, `sortByOrder(items, order)` (ordena por índice en el array y agrega al final lo que no esté), y `sidebarOrderQuery()` con React Query (lectura vía cliente del navegador, respeta RLS).
- `src/routes/panel.tsx`:
  - `ALL_LINKS` gana un campo `key`; el orden se aplica **antes** del filtro por rol existente (`isSuperAdmin || !l.superOnly`), que queda intacto.
  - Estado local `editMode` (solo se puede activar si `isSuperAdmin`).
  - Modo apagado: render actual sin cambios (escritorio y barra móvil).
  - Modo encendido: la lista de escritorio y la barra móvil se envuelven en `DndContext` + `SortableContext` (`verticalListSortingStrategy` / `horizontalListSortingStrategy`), con `PointerSensor` y `TouchSensor` (`activationConstraint` con delay ~200 ms y tolerancia, para no bloquear el scroll táctil). Cada ítem usa `useSortable` y se renderiza como `div` con `GripVertical` en lugar de `Link` (sin navegación durante el arrastre).
  - `onDragEnd`: `arrayMove` sobre el orden completo (todas las claves de `ALL_LINKS`, no solo las visibles) → actualización optimista del estado y guardado en `admin_settings` con `supabase.from('admin_settings').update(...)`, invalidando la query. Si el guardado falla, se revierte y se muestra un toast de error (sonner).
