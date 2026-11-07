export type ButtonWhatsAppConfig = {
  whatsapp_message?: string;
  whatsapp_image_logic?: "auto" | "none" | "logo" | "product_image" | "custom" | string;
  whatsapp_image_url?: string;
  /** Clave de site_content donde vive la imagen: genera un enlace corto /ref?k=clave */
  whatsapp_image_key?: string;
};

export const PUBLIC_SITE_ORIGIN = "https://will-design-3d.lovable.app";

export type WhatsAppPayload = {
  mediaToSend: string;
  mainMedia: string;
  text: string;
  formattedText: string;
};

export function toAbsoluteUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://will-design-3d.lovable.app";
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
  globalDefaultMessage?: string
): WhatsAppPayload {
  const mainMedia = (currentSectionMedia || "").trim();
  const logic = buttonConfig.whatsapp_image_logic || "auto";
  const explicitImage = (buttonConfig.whatsapp_image_url || "").trim();

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
  const mediaToSend = toAbsoluteUrl(explicitImage);

  // Siempre el dominio publicado: el robot de WhatsApp no puede entrar a la vista previa.
  const origin = PUBLIC_SITE_ORIGIN;
  const imageKey = (buttonConfig.whatsapp_image_key || "").trim();
  const isStorageMedia = isStorageMediaUrl(mediaToSend);

  // NUNCA caer en la URL larga de storage: shareableMediaUrl debe construirse exclusivamente
  // como `${origin}/ref?k=${encodeURIComponent(imageKey)}` si existe imageKey y whatsapp_image_url.
  // Si no hay imageKey pero hay imagen de almacenamiento, usar el endpoint corto /ref?img=...;
  // jamás exponer tokens de Supabase ni URLs crudas.
  const shareableMediaUrl = imageKey
    ? `${origin}/ref?k=${encodeURIComponent(imageKey)}`
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
