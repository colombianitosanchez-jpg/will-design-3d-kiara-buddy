import { parseProductButtons, type ProductButton } from "@/lib/product-buttons";

/**
 * Variante de un producto. Los campos null heredan el valor del producto padre.
 */
export type ProductVariant = {
  id: string;
  name: string;
  image_url: string | null;
  price_cop: number | null;
  stock: number | null;
  is_active: boolean;
  /** null = usa los botones del producto padre. */
  custom_buttons: ProductButton[] | null;
};

export function newVariant(): ProductVariant {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    image_url: null,
    price_cop: null,
    stock: null,
    is_active: true,
    custom_buttons: null,
  };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Convierte el JSON guardado en variantes válidas; productos antiguos devuelven []. */
export function parseVariants(raw: unknown): ProductVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      id: typeof r.id === "string" && r.id ? r.id : newVariant().id,
      name: typeof r.name === "string" ? r.name : "",
      image_url: typeof r.image_url === "string" && r.image_url ? r.image_url : null,
      price_cop: numOrNull(r.price_cop),
      stock: numOrNull(r.stock),
      is_active: r.is_active !== false,
      custom_buttons: Array.isArray(r.custom_buttons) ? parseProductButtons(r.custom_buttons) : null,
    }));
}

export function validateVariants(variants: ProductVariant[]): string | null {
  const names = new Set<string>();
  for (const v of variants) {
    const n = v.name.trim().toLowerCase();
    if (!n) return "Cada variante necesita un nombre.";
    if (names.has(n)) return `La variante "${v.name}" está repetida.`;
    names.add(n);
    if (v.price_cop !== null && v.price_cop < 0) return "El precio de una variante no puede ser negativo.";
  }
  return null;
}

/** Botones efectivos de una variante (propios o heredados). */
export function effectiveButtons(parent: ProductButton[], variant?: ProductVariant | null): ProductButton[] {
  return variant?.custom_buttons ?? parent;
}
