import { firstStaticShareImage } from "./share-image";
import { DEFAULT_SITE_URL, getCanonicalBaseUrl } from "./seo";

export type ButtonWhatsAppConfig = {
  whatsapp_message?: string;
  whatsapp_image_logic?: "auto" | "none" | "logo" | "product_image" | "custom" | string;
  whatsapp_image_url?: string;
  /** Clave de site_content donde vive la imagen: genera un enlace corto /ref?k=clave */
  whatsapp_image_key?: string;
};

export const PUBLIC_SITE_ORIGIN = DEFAULT_SITE_URL;

export function resolvePublicSiteOrigin(siteContent?: Record<string, string> | null): string {
  const hasConfiguredDomain = Boolean(
    siteContent?.site_canonical_domain?.trim() || siteContent?.site_url?.trim(),
  );
  if (hasConfiguredDomain) {
    return getCanonicalBaseUrl(siteContent);
  }
  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    /^https?:\/\//i.test(window.location.origin)
  ) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return PUBLIC_SITE_ORIGIN;
}

export const WHATSAPP_REF_ALIASES: Record<string, string> = {
  hero_cta_whatsapp_image_url: "hero",
  hero_secondary_cta_whatsapp_image_url: "hero2",
  nosotros_whatsapp_image_url: "nosotros",
  about_cta_whatsapp_image_url: "nosotros",
  mision_whatsapp_image_url: "mision",
  about_mission_cta_whatsapp_image_url: "mision",
  vision_whatsapp_image_url: "vision",
  about_vision_cta_whatsapp_image_url: "vision",
  about_values_cta_whatsapp_image_url: "valores",
  about_kiara_cta_whatsapp_image_url: "kiara",
  about_workshop_cta_whatsapp_image_url: "taller",
  site_logo_url: "logo",
};

export const REVERSE_REF_ALIASES: Record<string, string> = {
  hero: "hero_cta_whatsapp_image_url",
  h1: "hero_cta_whatsapp_image_url",
  hero2: "hero_secondary_cta_whatsapp_image_url",
  h2: "hero_secondary_cta_whatsapp_image_url",
  nosotros: "nosotros_whatsapp_image_url",
  mision: "mision_whatsapp_image_url",
  vision: "vision_whatsapp_image_url",
  valores: "about_values_cta_whatsapp_image_url",
  kiara: "about_kiara_cta_whatsapp_image_url",
  taller: "about_workshop_cta_whatsapp_image_url",
  logo: "site_logo_url",
};

export type WhatsAppPayload = {
  mediaToSend: string;
  mainMedia: string;
  text: string;
  formattedText: string;
};

export function toAbsoluteUrl(
  url?: string | null,
  siteContent?: Record<string, string> | null,
): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = resolvePublicSiteOrigin(siteContent);
  return `${origin}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export function isStorageMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.includes("supabase.co") ||
    url.includes("/storage/v1/object/") ||
    url.includes("token=")
  );
}

/**
 * Reemplaza etiquetas simples ({clave}) y dobles ({{clave}}) de forma flexible y segura.
 */
export function replaceTemplatePlaceholders(
  template: string,
  data: {
    producto?: string | null;
    precio?: string | null;
    variante?: string | null;
    media?: string | null;
  }
): string {
  let result = template;

  if (data.producto !== undefined && data.producto !== null) {
    result = result
      .replaceAll("{{producto}}", data.producto)
      .replaceAll("{producto}", data.producto)
      .replaceAll("{{product}}", data.producto)
      .replaceAll("{product}", data.producto);
  }

  if (data.precio !== undefined && data.precio !== null) {
    result = result
      .replaceAll("{{precio}}", data.precio)
      .replaceAll("{precio}", data.precio)
      .replaceAll("{{price}}", data.precio)
      .replaceAll("{price}", data.precio);
  }

  if (data.variante !== undefined && data.variante !== null) {
    result = result
      .replaceAll("{{variante}}", data.variante)
      .replaceAll("{variante}", data.variante)
      .replaceAll("{{variant}}", data.variante)
      .replaceAll("{variant}", data.variante);
  }

  if (data.media !== undefined && data.media !== null) {
    result = result
      .replaceAll("{{media_link}}", data.media)
      .replaceAll("{media_link}", data.media)
      .replaceAll("{{media}}", data.media)
      .replaceAll("{media}", data.media);
  }

  return result;
}

export function getWhatsAppPayloadForButton(
  buttonConfig: ButtonWhatsAppConfig,
  currentSectionMedia?: string | null,
  logoUrl?: string | null,
  defaultMessage?: string,
  globalDefaultMessage?: string,
  siteContent?: Record<string, string> | null
): WhatsAppPayload {
  const mainMedia = (currentSectionMedia || "").trim();
  const logic = buttonConfig.whatsapp_image_logic || "auto";
  const explicitImage = firstStaticShareImage([buttonConfig.whatsapp_image_url]);

  const rawMessage =
    buttonConfig.whatsapp_message?.trim() ||
    globalDefaultMessage?.trim() ||
    defaultMessage?.trim() ||
    "";

  // REGLA: Si NO hay imagen explícita configurada (whatsapp_image_url vacía) o logic === "none",
  // retornar mediaToSend = "" y formattedText estrictamente texto plano sin enlaces ni saltos de línea vacíos.
  if (logic === "none" || !explicitImage) {
    const clean = replaceTemplatePlaceholders(rawMessage, { media: "" })
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return {
      mediaToSend: "",
      mainMedia,
      text: rawMessage,
      formattedText: clean,
    };
  }

  // Hay imagen explícita configurada
  const mediaToSend = toAbsoluteUrl(explicitImage, siteContent);

  // Dominio canónico oficial configurado en /panel/marca, o window.location.origin, o fallback oficial.
  const origin = resolvePublicSiteOrigin(siteContent);
  const imageKey = (buttonConfig.whatsapp_image_key || "").trim();
  const isStorageMedia = isStorageMediaUrl(mediaToSend);

  // NUNCA caer en la URL larga de storage: shareableMediaUrl debe construirse como ruta ultra corta
  // `${origin}/r/${encodeURIComponent(shortKey)}` si existe imageKey y whatsapp_image_url.
  // Si no hay imageKey pero hay imagen de almacenamiento, usar el endpoint de respaldo /ref?img=...;
  // jamás exponer tokens de Supabase ni URLs crudas.
  const shortKey = WHATSAPP_REF_ALIASES[imageKey] || imageKey;
  const shareableMediaUrl = imageKey
    ? `${origin}/r/${encodeURIComponent(shortKey)}`
    : isStorageMedia
      ? `${origin}/ref?img=${encodeURIComponent(mediaToSend)}`
      : mediaToSend;

  let formattedText = replaceTemplatePlaceholders(rawMessage, {
    media: shareableMediaUrl,
  });

  // Si existe una imagen para enviar y la plantilla no incluye {media} o {media_link},
  // se adjunta automáticamente la URL al final del mensaje en una línea separada.
  const hasMediaTag =
    /\{\{media(_link)?\}\}/i.test(rawMessage) ||
    /\{media(_link)?\}/i.test(rawMessage);

  if (!hasMediaTag && shareableMediaUrl) {
    formattedText = formattedText
      ? `${formattedText}\n\n${shareableMediaUrl}`
      : shareableMediaUrl;
  }

  return {
    mediaToSend,
    mainMedia,
    text: rawMessage,
    formattedText,
  };
}
