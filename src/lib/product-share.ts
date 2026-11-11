import type { ProductButton } from "@/lib/product-buttons";
import type { ProductVariant } from "@/lib/product-variants";

const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
const isPhoto = (u?: string | null): u is string => Boolean(u && u.trim() && !VIDEO_RE.test(u));

export type ShareProduct = {
  slug?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  custom_buttons?: ProductButton[] | null;
  variants?: ProductVariant[] | null;
};

/**
 * Foto de la tarjeta de WhatsApp de un producto:
 * 1) foto del botón realmente usado (propio de la variante, o del padre si la variante hereda),
 * 2) portada ★ de la variante, 3) portada ★ del producto.
 */
export function resolveProductShareImage(product: ShareProduct, variantIndex: number | null, buttonIndex: number | null): string {
  const variant = variantIndex != null ? product.variants?.[variantIndex] ?? null : null;
  const buttons = variant?.custom_buttons ?? product.custom_buttons ?? [];
  const btn = buttonIndex != null ? buttons[buttonIndex] : undefined;
  const candidates = [
    btn?.whatsapp_image_url,
    variant?.image_url,
    ...(variant?.images ?? []),
    product.image_url,
    ...(product.images ?? []),
  ];
  return (candidates.find(isPhoto) || "").trim();
}

export function productShareUrl(slug: string, variantIndex: number | null, buttonIndex: number | null, origin?: string): string {
  const base =
    origin || (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://will-design-3d.lovable.app");
  const suffix = [variantIndex != null ? `--v${variantIndex + 1}` : "", buttonIndex != null ? `--b${buttonIndex + 1}` : ""].join("");
  return `${base}/t/${slug}${suffix}`;
}

/** Enlace corto con foto para un botón; vacío si no hay ninguna foto (mensaje limpio). */
export function productShareLink(product: ShareProduct, variantId: string | null | undefined, buttonId: string, origin?: string): string {
  if (!product.slug) return "";
  const vIdx = variantId ? (product.variants ?? []).findIndex((v) => v.id === variantId) : -1;
  const variantIndex = vIdx >= 0 ? vIdx : null;
  const variant = variantIndex != null ? product.variants![variantIndex] : null;
  const buttons = variant?.custom_buttons ?? product.custom_buttons ?? [];
  const bIdx = buttons.findIndex((b) => b.id === buttonId);
  const buttonIndex = bIdx >= 0 ? bIdx : null;
  if (!resolveProductShareImage(product, variantIndex, buttonIndex)) return "";
  return productShareUrl(product.slug, variantIndex, buttonIndex, origin);
}
