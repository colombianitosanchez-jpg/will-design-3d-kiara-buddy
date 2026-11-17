import type { ProductVariant } from "@/lib/product-variants";
import { newVariant, resolveVariantProduct } from "@/lib/product-variants";
import type { ProductButton } from "@/lib/product-buttons";

export type ProductRecord = {
  id?: string;
  slug?: string;
  sort_order?: number;
  name: string;
  price_cop: number;
  btn_text?: string;
  show_whatsapp?: boolean;
  hide_default_cta?: boolean;
  accepts_3d_file?: boolean;
  quote_only?: boolean;
  custom_share_text?: string | null;
  custom_buttons?: ProductButton[];
  category_id?: string | null;
  brand_id?: string | null;
  short?: string;
  description?: string;
  kiara_tip?: string;
  image_url?: string | null;
  images?: string[];
  specs?: { label: string; value: string }[];
  sku?: string | null;
  featured?: boolean;
  active?: boolean;
  stock?: number;
  variants?: ProductVariant[];
  variant_label?: string;
  allowed_payment_method_ids?: string[];
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Genera un slug limpio y único sin usar el sufijo genérico "-copia".
 * Si ya existe, añade un sufijo numérico secuencial (-2, -3, ...).
 */
export function generateUniqueSlug(baseNameOrSlug: string, existingSlugs: string[]): string {
  const cleanBase = slugify(baseNameOrSlug) || "producto";
  const slugSet = new Set(existingSlugs.map((s) => s.toLowerCase()));

  if (!slugSet.has(cleanBase)) {
    return cleanBase;
  }

  const match = cleanBase.match(/^(.*?)-(\d+)$/);
  const root = match ? match[1] : cleanBase;
  let counter = match ? parseInt(match[2], 10) + 1 : 2;

  while (slugSet.has(`${root}-${counter}`)) {
    counter++;
  }

  return `${root}-${counter}`;
}

/** Genera un nombre de producto limpio y único sin agregar "(Copia)". */
export function generateUniqueName(baseName: string, existingNames: string[]): string {
  const trimmed = baseName.trim() || "Producto";
  const nameSet = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  if (!nameSet.has(trimmed.toLowerCase())) {
    return trimmed;
  }

  const match = trimmed.match(/^(.*?)\s+(\d+)$/);
  const root = match ? match[1] : trimmed;
  let counter = match ? parseInt(match[2], 10) + 1 : 2;

  while (nameSet.has(`${root} ${counter}`.toLowerCase())) {
    counter++;
  }

  return `${root} ${counter}`;
}

/**
 * Convierte una variante existente en un producto principal e independiente.
 * Congela la herencia de los datos comerciales y descriptivos.
 */
export function variantToProduct(
  variant: ProductVariant,
  parent: ProductRecord,
  existingSlugs: string[] = [],
  existingNames: string[] = [],
): ProductRecord {
  const resolved = resolveVariantProduct(parent, variant);
  const composedName = variant.name.trim()
    ? parent.name.trim()
      ? `${parent.name.trim()} - ${variant.name.trim()}`
      : variant.name.trim()
    : parent.name.trim() || "Producto";
  const uniqueName = generateUniqueName(composedName, existingNames);
  const uniqueSlug = generateUniqueSlug(uniqueName, existingSlugs);

  const parentGallery = [
    ...(parent.image_url ? [parent.image_url] : []),
    ...(parent.images ?? []).filter((u) => u !== parent.image_url),
  ];
  const variantGallery = variant.images?.length
    ? variant.images
    : variant.image_url
      ? [variant.image_url]
      : parentGallery;
  const mainImage = variant.image_url ?? variantGallery[0] ?? parent.image_url ?? null;
  const extraImages = variantGallery.filter((u) => u !== mainImage);
  const effectivePrice = variant.price_cop !== null && variant.price_cop !== undefined
    ? variant.price_cop
    : parent.price_cop ?? 0;
  const effectiveStock = variant.stock !== null && variant.stock !== undefined
    ? variant.stock
    : parent.stock ?? 0;
  const effectiveButtons = variant.custom_buttons ?? parent.custom_buttons ?? [];
  const effectivePaymentMethods = variant.allowed_payment_method_ids !== null &&
    variant.allowed_payment_method_ids !== undefined
      ? variant.allowed_payment_method_ids
      : (parent.allowed_payment_method_ids ?? []);

  return {
    name: uniqueName,
    slug: uniqueSlug,
    price_cop: effectivePrice,
    stock: effectiveStock,
    image_url: mainImage,
    images: extraImages,
    category_id: parent.category_id ?? null,
    brand_id: parent.brand_id ?? null,
    short: resolved.short ?? "",
    description: resolved.description ?? "",
    kiara_tip: resolved.kiara_tip ?? "",
    btn_text: resolved.btn_text ?? "",
    show_whatsapp: variant.show_whatsapp ?? parent.show_whatsapp ?? false,
    hide_default_cta: variant.hide_default_cta ?? parent.hide_default_cta ?? false,
    accepts_3d_file: variant.accepts_3d_file ?? parent.accepts_3d_file ?? false,
    quote_only: variant.quote_only ?? parent.quote_only ?? false,
    custom_share_text: resolved.custom_share_text ?? null,
    custom_buttons: effectiveButtons,
    specs: resolved.specs ? [...resolved.specs] : [],
    sku: variant.sku ?? parent.sku ?? null,
    featured: variant.featured ?? false,
    active: variant.is_active ?? true,
    variants: [],
    variant_label: "",
    allowed_payment_method_ids: effectivePaymentMethods,
  };
}

/** Convierte un producto principal en variante conservando sus datos enriquecidos. */
export function productToVariant(product: ProductRecord): ProductVariant {
  const images = [
    ...(product.image_url ? [product.image_url] : []),
    ...(product.images ?? []).filter((u) => u !== product.image_url),
  ];

  return {
    ...newVariant(),
    ...(product.id ? { id: product.id } : {}),
    name: product.name.trim() || "Variante",
    sku: product.sku ?? null,
    image_url: product.image_url ?? images[0] ?? null,
    images,
    price_cop: product.price_cop ?? 0,
    stock: product.stock ?? 0,
    is_active: product.active ?? true,
    custom_buttons: product.custom_buttons ?? [],
    allowed_payment_method_ids: product.allowed_payment_method_ids ?? [],
    featured: product.featured ?? false,
    description: product.description ?? "",
    short: product.short ?? "",
    specs: product.specs ? [...product.specs] : [],
    custom_share_text: product.custom_share_text ?? null,
    kiara_tip: product.kiara_tip ?? "",
    btn_text: product.btn_text ?? "",
    accepts_3d_file: product.accepts_3d_file ?? false,
    quote_only: product.quote_only ?? false,
    show_whatsapp: product.show_whatsapp ?? false,
    hide_default_cta: product.hide_default_cta ?? false,
    inheritance_frozen: true,
  };
}

/**
 * Mueve o copia una variante de un producto origen a un producto destino,
 * conservando las propiedades propias de la variante.
 */
export function transferVariant(
  variant: ProductVariant,
  targetParent: ProductRecord,
  options: { makeUniqueId?: boolean } = { makeUniqueId: true },
): ProductVariant {
  const targetExistingNames = new Set(
    (targetParent.variants ?? []).map((v) => v.name.trim().toLowerCase())
  );

  let newName = variant.name.trim() || "Variante";
  if (targetExistingNames.has(newName.toLowerCase())) {
    const match = newName.match(/^(.*?)\s+(\d+)$/);
    const root = match ? match[1] : newName;
    let counter = match ? parseInt(match[2], 10) + 1 : 2;
    while (targetExistingNames.has(`${root} ${counter}`.toLowerCase())) {
      counter++;
    }
    newName = `${root} ${counter}`;
  }

  return {
    ...variant,
    id: options.makeUniqueId
      ? typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      : variant.id,
    name: newName,
  };
}

/**
 * Duplica un producto completo generando nuevos IDs, un nuevo slug único y nombre único.
 */
export function duplicateProductRecord(
  product: ProductRecord,
  existingSlugs: string[] = [],
  existingNames: string[] = [],
): ProductRecord {
  const uniqueName = generateUniqueName(product.name, existingNames);
  const uniqueSlug = generateUniqueSlug(product.slug || product.name, existingSlugs);

  const duplicatedVariants: ProductVariant[] = (product.variants ?? []).map((v) => ({
    ...v,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }));

  const { id: _, ...rest } = product;

  return {
    ...rest,
    name: uniqueName,
    slug: uniqueSlug,
    variants: duplicatedVariants,
  };
}

/**
 * Fusión plana: la ficha base y las variantes del origen se convierten en variantes
 * hermanas del destino; ningún dato enriquecido se convierte en una subvariante.
 */
export function flattenProductIntoVariants(
  source: ProductRecord,
  target: ProductRecord,
): ProductVariant[] {
  const base = productToVariant({ ...source, variants: [] });
  const children = (source.variants ?? []).map((variant) => freezeVariantInheritance(variant, source));
  const result: ProductVariant[] = [...(target.variants ?? [])];
  for (const variant of [base, ...children]) {
    if (result.some((existing) => existing.id === variant.id)) {
      throw new Error("Ya existe una variante con esta identidad en el destino.");
    }
    result.push(transferVariant(variant, { ...target, variants: result }, { makeUniqueId: false }));
  }
  return result;
}

/** Freeze source inheritance before a move; an explicit empty button list stays empty. */
export function freezeVariantInheritance(variant: ProductVariant, source: ProductRecord): ProductVariant {
  const resolved = resolveVariantProduct(source, variant);
  const frozen = productToVariant({ ...resolved, id: variant.id, name: variant.name, active: variant.is_active });
  return {
    ...frozen,
    inheritance_frozen: true,
    featured: variant.featured ?? false,
    allowed_payment_method_ids: variant.allowed_payment_method_ids ?? source.allowed_payment_method_ids ?? [],
  };
}

/**
 * Mueve el elemento `fromIndex` para que quede justo antes de la ranura `slotIndex`
 * (0..length; length = al final). Devuelve una lista nueva.
 */
export function moveToSlot<T>(list: T[], fromIndex: number, slotIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= list.length) return list.slice();
  const next = list.slice();
  const [item] = next.splice(fromIndex, 1);
  const insertAt = slotIndex > fromIndex ? slotIndex - 1 : slotIndex;
  next.splice(Math.max(0, Math.min(insertAt, next.length)), 0, item);
  return next;
}

export type ProductHierarchyMoveChange = {
  id: string;
  updated_at: string;
  variants?: ProductVariant[];
  sort_order?: number;
  active?: boolean;
  absorbed_by?: string | null;
};

/**
 * Construye los cambios atómicos para convertir una variante en producto principal,
 * calculando el `sort_order` exacto en `targetSlotIndex` (índice sobre `visibleProductIds`)
 * cuando se suelta en una ranura entre productos principales.
 */
export function buildVariantToStandaloneMove<
  TProduct extends { id: string; updated_at: string; variants: ProductVariant[] },
>(params: {
  products: TProduct[];
  visibleProductIds: string[];
  parent: TProduct;
  variantId: string;
  targetSlotIndex?: number;
  newProd: ProductRecord;
}): {
  changes: ProductHierarchyMoveChange[];
  insert: ProductRecord;
} {
  const { products, visibleProductIds, parent, variantId, targetSlotIndex, newProd } = params;
  const remainingVariants = parent.variants.filter((v) => v.id !== variantId);

  if (targetSlotIndex === undefined) {
    return {
      changes: [
        {
          id: parent.id,
          updated_at: parent.updated_at,
          variants: remainingVariants,
        },
      ],
      insert: newProd,
    };
  }

  const clampedSlot = Math.max(0, targetSlotIndex);
  const anchorId = visibleProductIds[clampedSlot];
  let insertAt = anchorId ? products.findIndex((p) => p.id === anchorId) : -1;
  if (insertAt === -1) {
    const lastVisibleId = visibleProductIds[visibleProductIds.length - 1];
    const lastVisibleIdx = lastVisibleId ? products.findIndex((p) => p.id === lastVisibleId) : -1;
    insertAt = lastVisibleIdx >= 0 ? lastVisibleIdx + 1 : products.length;
  }

  const changes: ProductHierarchyMoveChange[] = products.map((p, idx) => {
    const sort_order = idx < insertAt ? idx + 1 : idx + 2;
    return p.id === parent.id
      ? { id: p.id, updated_at: p.updated_at, sort_order, variants: remainingVariants }
      : { id: p.id, updated_at: p.updated_at, sort_order };
  });

  if (!changes.some((c) => c.id === parent.id)) {
    changes.push({
      id: parent.id,
      updated_at: parent.updated_at,
      variants: remainingVariants,
    });
  }

  return {
    changes,
    insert: {
      ...newProd,
      sort_order: insertAt + 1,
    },
  };
}
