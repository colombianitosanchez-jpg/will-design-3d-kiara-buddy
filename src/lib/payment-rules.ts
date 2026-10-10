/** Reglas de métodos de pago permitidos por producto y por variante. */

const SEP = "::";

/** Clave de línea del carrito: "<productId>" o "<productId>::<variantId>". */
export function cartLineKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}${SEP}${variantId}` : productId;
}

export function parseLineKey(key: string): { productId: string; variantId: string | null } {
  const i = key.indexOf(SEP);
  if (i < 0) return { productId: key, variantId: null };
  return { productId: key.slice(0, i), variantId: key.slice(i + SEP.length) || null };
}

export function normalizeMethodIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.filter((x): x is string => typeof x === "string" && !!x)));
}

/**
 * Métodos permitidos efectivos. La variante manda si tiene su propia lista (no null);
 * si no, hereda del producto. Una lista vacía significa "todos los métodos activos" → null.
 */
export function effectiveAllowed(
  productIds: string[],
  variantIds?: string[] | null,
): string[] | null {
  const list = variantIds != null ? variantIds : productIds;
  return list.length ? list : null;
}

/** Métodos (de los activos) que sirven para una línea. */
export function methodsForLine(allowed: string[] | null, activeIds: string[]): string[] {
  return allowed ? activeIds.filter((id) => allowed.includes(id)) : activeIds;
}

/** Métodos que sirven para todas las líneas a la vez. */
export function commonMethods(lines: (string[] | null)[], activeIds: string[]): string[] {
  return activeIds.filter((id) => lines.every((a) => !a || a.includes(id)));
}
