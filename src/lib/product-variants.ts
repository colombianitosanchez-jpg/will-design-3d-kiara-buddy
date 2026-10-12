import { normalizeMethodIds } from "@/lib/payment-rules";
import { parseProductButtons, type ProductButton } from "@/lib/product-buttons";

/**
 * Variante de un producto. Los campos null heredan el valor del producto padre.
 */
export type ProductVariant = {
  id: string;
  name: string;
  /** Foto principal de la variante (= images[0]). */
  image_url: string | null;
  /** Galería propia de la variante; vacía = usa la del producto. */
  images: string[];
  price_cop: number | null;
  stock: number | null;
  is_active: boolean;
  /** null = usa los botones del producto padre. */
  custom_buttons: ProductButton[] | null;
  /** null = hereda los métodos de pago del producto; [] = todos los activos. */
  allowed_payment_method_ids: string[] | null;
};

export function newVariant(): ProductVariant {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    image_url: null,
    images: [],
    price_cop: null,
    stock: null,
    is_active: true,
    custom_buttons: null,
    allowed_payment_method_ids: null,
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
    .map((r) => {
      const main = typeof r.image_url === "string" && r.image_url ? r.image_url : null;
      const extra = Array.isArray(r.images) ? r.images.filter((u): u is string => typeof u === "string" && !!u) : [];
      const images = Array.from(new Set([...(main ? [main] : []), ...extra]));
      return {
      id: typeof r.id === "string" && r.id ? r.id : newVariant().id,
      name: typeof r.name === "string" ? r.name : "",
      image_url: images[0] ?? null,
      images,
      price_cop: numOrNull(r.price_cop),
      stock: numOrNull(r.stock),
      is_active: r.is_active !== false,
      custom_buttons: Array.isArray(r.custom_buttons) ? parseProductButtons(r.custom_buttons) : null,
      allowed_payment_method_ids: Array.isArray(r.allowed_payment_method_ids)
        ? normalizeMethodIds(r.allowed_payment_method_ids)
        : null,
      };
    });
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

/** Normaliza texto: minúsculas y sin acentos, para búsquedas tolerantes. */
export function normalizeText(value: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Busca la primera variante que coincida con la consulta de búsqueda.
 * Realiza coincidencia parcial no estricta (palabras clave sin acentos/mayúsculas).
 */
export function getMatchingVariant(
  variants: ProductVariant[] | undefined | null,
  query?: string | null,
): ProductVariant | null {
  if (!variants || variants.length === 0) return null;
  const q = query?.trim();
  if (!q) return null;

  const terms = normalizeText(q).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;

  for (const v of variants) {
    const haystack = normalizeText(`${v.name} ${(v as any).sku ?? ""}`);
    const matchesAll = terms.every((term) => haystack.includes(term));
    if (matchesAll) {
      return v;
    }
  }

  return null;
}

/** Galería visible: la de la variante si tiene fotos; si no, la del producto. */
export function variantGallery(productGallery: string[], variant?: ProductVariant | null): string[] {
  return variant && variant.images.length ? variant.images : productGallery;
}
