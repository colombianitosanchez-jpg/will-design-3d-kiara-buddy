export type ButtonWhatsAppConfig = {
  whatsapp_message?: string;
  whatsapp_image_logic?: "auto" | "logo" | "product_image" | "custom" | string;
  whatsapp_image_url?: string;
};

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
  const fallbackLogo = (logoUrl || "").trim() || "/logo.png";

  const isVideo = /\.(mp4|webm|quicktime)($|\?)/i.test(mainMedia);
  const isImage = /\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(mainMedia);

  const logic = buttonConfig.whatsapp_image_logic || "auto";

  let mediaToSend = fallbackLogo;
  const explicitImage = (buttonConfig.whatsapp_image_url || "").trim();

  if (explicitImage) {
    mediaToSend = explicitImage;
  } else if (logic === "logo") {
    mediaToSend = fallbackLogo;
  } else if (logic === "product_image") {
    mediaToSend = isImage ? mainMedia : fallbackLogo;
  } else {
    // Reglas CEO (auto)
    if (isVideo && !isImage) {
      mediaToSend = fallbackLogo;
    } else if (isVideo && isImage) {
      mediaToSend = mainMedia;
    } else if (isImage) {
      mediaToSend = mainMedia;
    } else {
      mediaToSend = fallbackLogo;
    }
  }

  // Asegurar que la URL sea absoluta para previsualización correcta en WhatsApp
  mediaToSend = toAbsoluteUrl(mediaToSend);

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://will-design-3d.lovable.app";

  const isStorageMedia = isStorageMediaUrl(mediaToSend);
  const shareableMediaUrl = isStorageMedia
    ? `${origin}/ref?img=${encodeURIComponent(mediaToSend)}`
    : mediaToSend;

  const rawMessage =
    buttonConfig.whatsapp_message?.trim() ||
    globalDefaultMessage?.trim() ||
    defaultMessage?.trim() ||
    "";

  let formattedText = replaceTemplatePlaceholders(rawMessage, {
    media: shareableMediaUrl,
  });

  // Si es una imagen de Supabase Storage / con tokens y la plantilla no incluye {media} o {media_link},
  // se añade el enlace amigable al final en una línea separada.
  if (isStorageMedia) {
    const hasMediaTag =
      /\{\{media(_link)?\}\}/i.test(rawMessage) ||
      /\{media(_link)?\}/i.test(rawMessage);

    if (!hasMediaTag) {
      formattedText = formattedText ? `${formattedText}\n\n${shareableMediaUrl}` : shareableMediaUrl;
    }
  }

  return {
    mediaToSend,
    mainMedia,
    text: rawMessage,
    formattedText,
  };
}
