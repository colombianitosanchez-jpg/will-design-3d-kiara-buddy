import type { ButtonIconShape } from "@/lib/product-buttons";

export type AboutButtonItem = {
  id: string;
  text: string;
  action_type: "link" | "whatsapp" | "cotizador";
  action_value?: string;
  whatsapp_number?: string;
  whatsapp_message?: string;
  whatsapp_image_url?: string;
  whatsapp_image_logic?: "auto" | "none" | "logo" | "product_image" | "custom";
  text_color?: string;
  custom_hex?: string;
  shade?: number;
  media_url?: string;
  media_mode?: "fill" | "none" | "icon";
  media_fit?: "cover" | "contain" | "fill";
  icon_url?: string;
  icon_position?: "none" | "left" | "right";
  icon_shape?: ButtonIconShape;
  width?: "auto" | "full";
};

const DEFAULT_ABOUT_BUTTON: AboutButtonItem = {
  id: "about_primary",
  text: "Conoce más sobre nosotros",
  action_type: "link",
  action_value: "/nosotros",
  media_fit: "cover",
};

function normalizeActionType(action: unknown): "link" | "whatsapp" | "cotizador" {
  if (action === "whatsapp" || action === "cotizador") {
    return action;
  }
  return "link";
}

function normalizeMediaMode(mode: unknown): "fill" | "none" | "icon" | undefined {
  if (mode === "fill" || mode === "none" || mode === "icon") {
    return mode;
  }
  return undefined;
}

function normalizeMediaFit(fit: unknown): "cover" | "contain" | "fill" | undefined {
  if (fit === "cover" || fit === "contain" || fit === "fill") {
    return fit;
  }
  return undefined;
}

function normalizeIconPosition(pos: unknown): "none" | "left" | "right" | undefined {
  if (pos === "none" || pos === "left" || pos === "right") {
    return pos;
  }
  return undefined;
}

function normalizeWidth(width: unknown): "auto" | "full" | undefined {
  if (width === "auto" || width === "full") {
    return width;
  }
  return undefined;
}

function normalizeWhatsAppLogic(
  logic: unknown,
): AboutButtonItem["whatsapp_image_logic"] | undefined {
  if (
    logic === "auto" ||
    logic === "none" ||
    logic === "logo" ||
    logic === "product_image" ||
    logic === "custom"
  ) {
    return logic;
  }
  return undefined;
}

export function parseAboutButtons(
  values: Record<string, string | undefined>,
): AboutButtonItem[] {
  if (values.about_buttons) {
    try {
      const parsed = JSON.parse(values.about_buttons);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped: AboutButtonItem[] = parsed
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map((item, idx) => {
            const id =
              typeof item.id === "string" && item.id.trim()
                ? item.id.trim()
                : `about_btn_${idx + 1}`;
            const text = typeof item.text === "string" ? item.text : "";
            const action_type = normalizeActionType(item.action_type);
            const action_value =
              typeof item.action_value === "string" ? item.action_value : undefined;
            const whatsapp_number =
              typeof item.whatsapp_number === "string" ? item.whatsapp_number : undefined;
            const whatsapp_message =
              typeof item.whatsapp_message === "string" ? item.whatsapp_message : undefined;
            const whatsapp_image_url =
              typeof item.whatsapp_image_url === "string" ? item.whatsapp_image_url : undefined;
            const whatsapp_image_logic = normalizeWhatsAppLogic(item.whatsapp_image_logic);
            const text_color =
              typeof item.text_color === "string" ? item.text_color : undefined;
            const custom_hex =
              typeof item.custom_hex === "string" ? item.custom_hex : undefined;
            const shade =
              typeof item.shade === "number" && Number.isFinite(item.shade)
                ? Math.max(0, Math.min(100, item.shade))
                : undefined;
            const media_url =
              typeof item.media_url === "string" ? item.media_url : undefined;
            const media_mode = normalizeMediaMode(item.media_mode);
            const media_fit = normalizeMediaFit(item.media_fit) || "cover";
            const icon_url = typeof item.icon_url === "string" ? item.icon_url : undefined;
            const icon_position = normalizeIconPosition(item.icon_position);
            const icon_shape =
              typeof item.icon_shape === "string"
                ? (item.icon_shape as ButtonIconShape)
                : undefined;
            const width = normalizeWidth(item.width);

            return {
              id,
              text,
              action_type,
              ...(action_value !== undefined ? { action_value } : {}),
              ...(whatsapp_number !== undefined ? { whatsapp_number } : {}),
              ...(whatsapp_message !== undefined ? { whatsapp_message } : {}),
              ...(whatsapp_image_url !== undefined ? { whatsapp_image_url } : {}),
              ...(whatsapp_image_logic !== undefined ? { whatsapp_image_logic } : {}),
              ...(text_color !== undefined ? { text_color } : {}),
              ...(custom_hex !== undefined ? { custom_hex } : {}),
              ...(shade !== undefined ? { shade } : {}),
              ...(media_url !== undefined ? { media_url } : {}),
              ...(media_mode !== undefined ? { media_mode } : {}),
              media_fit,
              ...(icon_url !== undefined ? { icon_url } : {}),
              ...(icon_position !== undefined ? { icon_position } : {}),
              ...(icon_shape !== undefined ? { icon_shape } : {}),
              ...(width !== undefined ? { width } : {}),
            };
          });

        if (mapped.length > 0) {
          return mapped;
        }
      }
    } catch {
      // JSON inválido: continuar con claves legadas
    }
  }

  const primaryText = values.about_cta_text?.trim() ?? "";
  const primaryUrl = values.about_cta_url?.trim() ?? "";
  const primaryActionType = normalizeActionType(values.about_cta_action_type || "link");
  const primaryShadeStr = values.about_cta_shade?.trim();
  const primaryShade =
    primaryShadeStr && !isNaN(Number(primaryShadeStr))
      ? Math.max(0, Math.min(100, Number(primaryShadeStr)))
      : undefined;
  const waLogic = normalizeWhatsAppLogic(values.about_cta_whatsapp_image_logic);
  const mediaMode = normalizeMediaMode(values.about_cta_media_mode);
  const iconPosition = normalizeIconPosition(values.about_cta_icon_position);
  const width = normalizeWidth(values.about_cta_width);

  const resolvedUrl =
    primaryUrl ||
    (primaryActionType === "cotizador"
      ? "/cotizador"
      : primaryActionType === "link"
        ? "/nosotros"
        : "");

  const legacyPrimary: AboutButtonItem = {
    id: "about_primary",
    text: primaryText || DEFAULT_ABOUT_BUTTON.text,
    action_type: primaryActionType,
    ...(resolvedUrl ? { action_value: resolvedUrl } : {}),
    ...(values.about_cta_whatsapp_message
      ? { whatsapp_message: values.about_cta_whatsapp_message }
      : {}),
    ...(values.about_cta_whatsapp_image_url
      ? { whatsapp_image_url: values.about_cta_whatsapp_image_url }
      : {}),
    ...(waLogic ? { whatsapp_image_logic: waLogic } : {}),
    ...(values.about_cta_text_color ? { text_color: values.about_cta_text_color } : {}),
    ...(values.about_cta_custom_hex ? { custom_hex: values.about_cta_custom_hex } : {}),
    ...(primaryShade !== undefined ? { shade: primaryShade } : {}),
    ...(values.about_cta_media_url ? { media_url: values.about_cta_media_url } : {}),
    ...(mediaMode ? { media_mode: mediaMode } : {}),
    media_fit: normalizeMediaFit(values.about_cta_media_fit) || "cover",
    ...(values.about_cta_icon_url ? { icon_url: values.about_cta_icon_url } : {}),
    ...(iconPosition ? { icon_position: iconPosition } : {}),
    ...(values.about_cta_icon_shape
      ? { icon_shape: values.about_cta_icon_shape as ButtonIconShape }
      : {}),
    ...(width ? { width } : {}),
  };

  return [legacyPrimary];
}
