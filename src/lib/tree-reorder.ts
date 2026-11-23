import { arrayMove } from "@dnd-kit/sortable";

export type HierarchicalOrderItem = {
  id: string;
  parent_id?: string | null;
};

export type SiblingReorderResult<T extends HierarchicalOrderItem> = {
  parentId: string | null;
  reorderedSiblings: T[];
};

/**
 * Resuelve el reordenamiento entre elementos hermanos de un árbol jerárquico.
 *
 * - Si `overId` pertenece al mismo nivel (`parent_id`), reordena dentro de ese grupo de hermanos.
 * - Si `overId` es un descendiente de otro hermano del mismo nivel que `activeId`,
 *   resuelve hacia ese hermano ancestro para que arrastrar sobre ramas expandidas sea natural.
 * - Si `overId` es descendiente de `activeId` o pertenece a una rama sin ancestro común al nivel
 *   de `activeId`, devuelve `null` (no modifica la jerarquía).
 */
export function resolveSiblingReorder<T extends HierarchicalOrderItem>(
  orderedRows: readonly T[],
  activeId: string,
  overId: string,
): SiblingReorderResult<T> | null {
  if (!activeId || !overId || activeId === overId) return null;

  const byId = new Map(orderedRows.map((row) => [row.id, row]));
  const activeItem = byId.get(activeId);
  const overItem = byId.get(overId);
  if (!activeItem || !overItem) return null;

  const activeParentId = activeItem.parent_id ?? null;

  let cursor: T | undefined = overItem;
  let guard = 0;
  while (cursor && (cursor.parent_id ?? null) !== activeParentId && guard++ < 50) {
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }

  if (!cursor || (cursor.parent_id ?? null) !== activeParentId || cursor.id === activeId) {
    return null;
  }

  const siblings = orderedRows.filter((row) => (row.parent_id ?? null) === activeParentId);
  const oldIndex = siblings.findIndex((row) => row.id === activeId);
  const newIndex = siblings.findIndex((row) => row.id === cursor.id);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null;

  return {
    parentId: activeParentId,
    reorderedSiblings: arrayMove(siblings, oldIndex, newIndex),
  };
}

/**
 * Aplica los nuevos valores secuenciales (`0..n-1`) de orden a una copia de la lista completa
 * para actualización optimista inmediata en memoria antes de persistir.
 */
export function applySiblingOrder<T extends HierarchicalOrderItem, K extends keyof T>(
  rows: readonly T[],
  reorderedSiblings: readonly T[],
  orderKey: K,
): T[] {
  const nextOrderById = new Map<string, number>();
  reorderedSiblings.forEach((item, index) => {
    nextOrderById.set(item.id, index);
  });
  return rows.map((row) =>
    nextOrderById.has(row.id) ? { ...row, [orderKey]: nextOrderById.get(row.id) } : row,
  );
}
