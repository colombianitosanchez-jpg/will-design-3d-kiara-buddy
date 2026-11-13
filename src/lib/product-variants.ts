import { normalizeMethodIds } from "@/lib/payment-rules";
import { parseProductButtons, type ProductButton } from "@/lib/product-buttons";

/**
 * Variante de un producto. Los campos null heredan el valor del producto padre.
 */
export type ProductVariant = {
  id: string;
  name: string;
  sku?: string | null;
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
  featured?: boolean;
  description?: string;
  short?: string;
  specs?: { label: string; value: string }[];
  custom_share_text?: string | null;
  kiara_tip?: string;
  btn_text?: string;
  accepts_3d_file?: boolean;
  quote_only?: boolean;
  show_whatsapp?: boolean;
  hide_default_cta?: boolean;
  inheritance_frozen?: boolean;
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
    featured: false,
    description: "",
    short: "",
    specs: [],
    custom_share_text: null,
    kiara_tip: "",
    btn_text: "",
  };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseSpecs(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : "",
      value: typeof item.value === "string" ? item.value : "",
    }));
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
        sku: typeof r.sku === "string" && r.sku ? r.sku : null,
        image_url: images[0] ?? null,
        images,
        price_cop: numOrNull(r.price_cop),
        stock: numOrNull(r.stock),
        is_active: r.is_active !== false,
        custom_buttons: Array.isArray(r.custom_buttons) ? parseProductButtons(r.custom_buttons) : null,
        allowed_payment_method_ids: Array.isArray(r.allowed_payment_method_ids)
          ? normalizeMethodIds(r.allowed_payment_method_ids)
          : null,
        featured: r.featured === true,
        description: typeof r.description === "string" ? r.description : "",
        short: typeof r.short === "string" ? r.short : "",
        specs: parseSpecs(r.specs),
        custom_share_text: typeof r.custom_share_text === "string" ? r.custom_share_text : null,
        kiara_tip: typeof r.kiara_tip === "string" ? r.kiara_tip : "",
        btn_text: typeof r.btn_text === "string" ? r.btn_text : "",
        accepts_3d_file: typeof r.accepts_3d_file === "boolean" ? r.accepts_3d_file : undefined,
        quote_only: typeof r.quote_only === "boolean" ? r.quote_only : undefined,
        show_whatsapp: typeof r.show_whatsapp === "boolean" ? r.show_whatsapp : undefined,
        hide_default_cta: typeof r.hide_default_cta === "boolean" ? r.hide_default_cta : undefined,
        inheritance_frozen: r.inheritance_frozen === true,
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

/** One resolver for every public surface and hierarchy transfer. */
export function resolveVariantProduct<T extends {
  price_cop: number; stock?: number; image_url?: string | null; images?: string[];
  short?: string; description?: string; specs?: { label: string; value: string }[];
  custom_share_text?: string | null; kiara_tip?: string; btn_text?: string; sku?: string | null;
  accepts_3d_file?: boolean; quote_only?: boolean; show_whatsapp?: boolean; hide_default_cta?: boolean;
  custom_buttons?: ProductButton[];
}>(parent: T, variant?: ProductVariant | null): T {
  if (!variant) return parent;
  const gallery = variant.images.length ? variant.images : variant.image_url ? [variant.image_url] : null;
  return {
    ...parent,
    price_cop: variant.price_cop ?? parent.price_cop,
    stock: variant.stock ?? parent.stock,
    image_url: variant.inheritance_frozen ? gallery?.[0] ?? null : gallery?.[0] ?? parent.image_url,
    images: variant.inheritance_frozen ? gallery ?? [] : gallery ?? parent.images,
    short: variant.inheritance_frozen ? variant.short ?? "" : variant.short?.trim() ? variant.short : parent.short,
    description: variant.inheritance_frozen ? variant.description ?? "" : variant.description?.trim() ? variant.description : parent.description,
    specs: variant.inheritance_frozen ? variant.specs ?? [] : variant.specs?.length ? variant.specs : parent.specs,
    custom_share_text: variant.inheritance_frozen ? variant.custom_share_text ?? null : variant.custom_share_text ?? parent.custom_share_text,
    kiara_tip: variant.inheritance_frozen ? variant.kiara_tip ?? "" : variant.kiara_tip?.trim() ? variant.kiara_tip : parent.kiara_tip,
    btn_text: variant.inheritance_frozen ? variant.btn_text ?? "" : variant.btn_text?.trim() ? variant.btn_text : parent.btn_text,
    sku: variant.inheritance_frozen ? variant.sku ?? null : variant.sku ?? parent.sku,
    accepts_3d_file: variant.accepts_3d_file ?? parent.accepts_3d_file,
    quote_only: variant.quote_only ?? parent.quote_only,
    show_whatsapp: variant.show_whatsapp ?? parent.show_whatsapp,
    hide_default_cta: variant.hide_default_cta ?? parent.hide_default_cta,
    custom_buttons: variant.custom_buttons ?? parent.custom_buttons,
  };
}

/** Normaliza texto: minúsculas y sin acentos, para búsquedas tolerantes. */
const normCache = new Map<string, string>();
const NORM_CACHE_MAX = 1000;

export function normalizeText(value: string): string {
  if (!value) return "";
  let res = normCache.get(value);
  if (res !== undefined) return res;
  res = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normCache.size > NORM_CACHE_MAX) normCache.clear();
  normCache.set(value, res);
  return res;
}

export type ParentProductContext = {
  name?: string | null;
  brand?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
  attributes?: { value_label?: string | null }[] | null;
  sku?: string | null;
  short?: string | null;
  description?: string | null;
};

/**
 * Obtiene todas las variantes cuyo nombre coincida con el término de búsqueda.
 */
export function getMatchingVariants(
  variants: ProductVariant[] | undefined | null,
  query?: string | null,
): ProductVariant[] {
  if (!variants || variants.length === 0) return [];
  const q = query?.trim();
  if (!q) return [];
  const normQ = normalizeText(q);
  if (!normQ) return [];

  return variants.filter((v) => {
    const varName = normalizeText(v.name);
    return varName.includes(normQ);
  });
}

/**
 * Busca la variante que mejor coincida con la consulta de búsqueda.
 * Evalúa de forma combinada el contexto del producto padre + datos de la variante.
 */
export function getMatchingVariant(
  variants: ProductVariant[] | undefined | null,
  query?: string | null,
  parentContext?: string | ParentProductContext | null,
): ProductVariant | null {
  const matching = getMatchingVariants(variants, query);
  if (matching.length > 0) {
    const normQ = normalizeText(query ?? "");
    // Si hay varias, devuelve la que empiece o sea igual, o la primera
    const exact = matching.find((v) => normalizeText(v.name) === normQ);
    if (exact) return exact;
    const starts = matching.find((v) => normalizeText(v.name).startsWith(normQ));
    if (starts) return starts;
    return matching[0];
  }

  if (!variants || variants.length === 0) return null;
  const q = query?.trim();
  if (!q) return null;

  const terms = normalizeText(q).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;

  let parentStr = "";
  if (typeof parentContext === "string") {
    parentStr = normalizeText(parentContext);
  } else if (parentContext && typeof parentContext === "object") {
    parentStr = normalizeText(
      [
        parentContext.name ?? "",
        parentContext.brand?.name ?? "",
        parentContext.category?.name ?? "",
        parentContext.sku ?? "",
        parentContext.short ?? "",
        parentContext.description ?? "",
        ...(parentContext.attributes?.map((a) => a.value_label ?? "") ?? []),
      ].join(" "),
    );
  }

  let bestVariant: ProductVariant | null = null;
  let highestScore = -1;

  for (const v of variants) {
    const varName = normalizeText(v.name);
    const varSku = normalizeText(v.sku ?? "");
    const haystack = normalizeText(`${parentStr} ${varName} ${varSku}`);

    const matchesAll = terms.every((term) => haystack.includes(term));
    if (matchesAll) {
      let score = 0;
      const normalizedQuery = normalizeText(q);

      if (varName === normalizedQuery) {
        score += 1000;
      } else if (varName.startsWith(normalizedQuery)) {
        score += 600;
      } else if (varName.includes(normalizedQuery)) {
        score += 400;
      }

      for (const term of terms) {
        if (varName.includes(term)) score += 150;
        if (varSku.includes(term)) score += 100;
        if (parentStr.includes(term)) score += 20;
      }

      if (score > highestScore) {
        highestScore = score;
        bestVariant = v;
      }
    }
  }

  return bestVariant;
}

/** Galería visible: la de la variante si tiene fotos; si no, la del producto. */
export function variantGallery(productGallery: string[], variant?: ProductVariant | null): string[] {
  return variant && variant.images.length ? variant.images : productGallery;
}
