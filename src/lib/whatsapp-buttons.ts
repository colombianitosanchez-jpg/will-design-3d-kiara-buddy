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

  const rawMessage =
    buttonConfig.whatsapp_message?.trim() ||
    globalDefaultMessage?.trim() ||
    defaultMessage?.trim() ||
    "";

  let formattedText = rawMessage;
  if (formattedText.includes("{media}")) {
    formattedText = formattedText.replaceAll("{media}", mediaToSend);
  }
  if (formattedText.includes("{media_link}")) {
    formattedText = formattedText.replaceAll("{media_link}", mediaToSend);
  }

  return {
    mediaToSend,
    mainMedia,
    text: rawMessage,
    formattedText,
  };
}
