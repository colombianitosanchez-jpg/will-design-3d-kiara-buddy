import type { ButtonIconShape } from "@/lib/product-buttons";

export type HeroButtonItem = {
  id: string; // ej: "hero_btn_1"
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

const DEFAULT_HERO_BUTTON: HeroButtonItem = {
  id: "hero_primary",
  text: "Cotizar Proyecto",
  action_type: "cotizador",
  action_value: "/cotizador",
  custom_hex: "var(--brand-orange)",
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

export function parseHeroButtons(values: Record<string, string>): HeroButtonItem[] {
  // 1. Si values.hero_buttons existe y es un JSON array válido con elementos, devuélvelo mapeado asegurando valores por defecto seguros.
  if (values.hero_buttons) {
    try {
      const parsed = JSON.parse(values.hero_buttons);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped: HeroButtonItem[] = parsed
          .filter((item) => item && typeof item === "object")
          .map((item, idx) => {
            const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `hero_btn_${idx + 1}`;
            const text = typeof item.text === "string" ? item.text : "";
            const action_type = normalizeActionType(item.action_type);
            const action_value = typeof item.action_value === "string" ? item.action_value : undefined;
            const whatsapp_number = typeof item.whatsapp_number === "string" ? item.whatsapp_number : undefined;
            const whatsapp_message = typeof item.whatsapp_message === "string" ? item.whatsapp_message : undefined;
            const whatsapp_image_url = typeof item.whatsapp_image_url === "string" ? item.whatsapp_image_url : undefined;
            const whatsapp_image_logic =
              item.whatsapp_image_logic === "auto" ||
              item.whatsapp_image_logic === "none" ||
              item.whatsapp_image_logic === "logo" ||
              item.whatsapp_image_logic === "product_image" ||
              item.whatsapp_image_logic === "custom"
                ? item.whatsapp_image_logic
                : undefined;
            const text_color = typeof item.text_color === "string" ? item.text_color : undefined;
            const custom_hex = typeof item.custom_hex === "string" ? item.custom_hex : undefined;
            const shade = typeof item.shade === "number" && !isNaN(item.shade) ? item.shade : undefined;
            const media_url = typeof item.media_url === "string" ? item.media_url : undefined;
            const media_mode = normalizeMediaMode(item.media_mode);
            const media_fit = normalizeMediaFit(item.media_fit) || "cover";
            const icon_url = typeof item.icon_url === "string" ? item.icon_url : undefined;
            const icon_position = normalizeIconPosition(item.icon_position);
            const icon_shape = typeof item.icon_shape === "string" ? (item.icon_shape as ButtonIconShape) : undefined;
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
              ...(media_fit !== undefined ? { media_fit } : {}),
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

  // 2. Si no existe values.hero_buttons, genera la lista a partir de las claves legadas existentes:
  const primaryText = values.hero_cta_text?.trim() ?? "";
  const primaryUrl = values.hero_cta_url?.trim() ?? "";
  const primaryActionType = normalizeActionType(values.hero_cta_action_type || (primaryUrl ? "link" : "cotizador"));
  const primaryShadeStr = values.hero_cta_shade?.trim();
  const primaryShade = primaryShadeStr && !isNaN(Number(primaryShadeStr)) ? Number(primaryShadeStr) : undefined;

  const legacyPrimary: HeroButtonItem = {
    id: "hero_primary",
    text: primaryText || (primaryUrl ? "Cotizar Proyecto" : ""),
    action_type: primaryActionType,
    ...(values.hero_cta_url ? { action_value: values.hero_cta_url } : {}),
    ...(values.hero_cta_whatsapp_message ? { whatsapp_message: values.hero_cta_whatsapp_message } : {}),
    ...(values.hero_cta_whatsapp_image_url ? { whatsapp_image_url: values.hero_cta_whatsapp_image_url } : {}),
    ...(values.hero_cta_whatsapp_image_logic
      ? { whatsapp_image_logic: values.hero_cta_whatsapp_image_logic as HeroButtonItem["whatsapp_image_logic"] }
      : {}),
    ...(values.hero_cta_text_color ? { text_color: values.hero_cta_text_color } : {}),
    ...(values.hero_cta_custom_hex ? { custom_hex: values.hero_cta_custom_hex } : {}),
    ...(primaryShade !== undefined ? { shade: primaryShade } : {}),
    ...(values.hero_cta_media_url ? { media_url: values.hero_cta_media_url } : {}),
    ...(normalizeMediaMode(values.hero_cta_media_mode) ? { media_mode: normalizeMediaMode(values.hero_cta_media_mode) } : {}),
    media_fit: normalizeMediaFit(values.hero_cta_media_fit) || "cover",
    ...(values.hero_cta_icon_url ? { icon_url: values.hero_cta_icon_url } : {}),
    ...(normalizeIconPosition(values.hero_cta_icon_position) ? { icon_position: normalizeIconPosition(values.hero_cta_icon_position) } : {}),
    ...(values.hero_cta_icon_shape ? { icon_shape: values.hero_cta_icon_shape as ButtonIconShape } : {}),
    ...(normalizeWidth(values.hero_cta_width) ? { width: normalizeWidth(values.hero_cta_width) } : {}),
  };

  const secondaryText = values.hero_secondary_cta_text?.trim() ?? "";
  const secondaryUrl = values.hero_secondary_cta_url?.trim() ?? "";
  const hasSecondary = Boolean(secondaryText || secondaryUrl);

  let legacySecondary: HeroButtonItem | null = null;
  if (hasSecondary) {
    const secActionType = normalizeActionType(values.hero_secondary_cta_action_type || "link");
    const secShadeStr = values.hero_secondary_cta_shade?.trim();
    const secShade = secShadeStr && !isNaN(Number(secShadeStr)) ? Number(secShadeStr) : undefined;

    legacySecondary = {
      id: "hero_secondary",
      text: secondaryText || (secondaryUrl ? "Ver tienda" : ""),
      action_type: secActionType,
      ...(values.hero_secondary_cta_url ? { action_value: values.hero_secondary_cta_url } : {}),
      ...(values.hero_secondary_cta_whatsapp_message ? { whatsapp_message: values.hero_secondary_cta_whatsapp_message } : {}),
      ...(values.hero_secondary_cta_whatsapp_image_url ? { whatsapp_image_url: values.hero_secondary_cta_whatsapp_image_url } : {}),
      ...(values.hero_secondary_cta_whatsapp_image_logic
        ? { whatsapp_image_logic: values.hero_secondary_cta_whatsapp_image_logic as HeroButtonItem["whatsapp_image_logic"] }
        : {}),
      ...(values.hero_secondary_cta_text_color ? { text_color: values.hero_secondary_cta_text_color } : {}),
      ...(values.hero_secondary_cta_custom_hex ? { custom_hex: values.hero_secondary_cta_custom_hex } : {}),
      ...(secShade !== undefined ? { shade: secShade } : {}),
      ...(values.hero_secondary_cta_media_url ? { media_url: values.hero_secondary_cta_media_url } : {}),
      ...(normalizeMediaMode(values.hero_secondary_cta_media_mode) ? { media_mode: normalizeMediaMode(values.hero_secondary_cta_media_mode) } : {}),
      media_fit: normalizeMediaFit(values.hero_secondary_cta_media_fit) || "cover",
      ...(values.hero_secondary_cta_icon_url ? { icon_url: values.hero_secondary_cta_icon_url } : {}),
      ...(normalizeIconPosition(values.hero_secondary_cta_icon_position) ? { icon_position: normalizeIconPosition(values.hero_secondary_cta_icon_position) } : {}),
      ...(values.hero_secondary_cta_icon_shape ? { icon_shape: values.hero_secondary_cta_icon_shape as ButtonIconShape } : {}),
      ...(normalizeWidth(values.hero_secondary_cta_width) ? { width: normalizeWidth(values.hero_secondary_cta_width) } : {}),
    };
  }

  // Si ninguno de los dos tiene texto, retorna el botón predeterminado:
  // { id: "hero_primary", text: "Cotizar Proyecto", action_type: "cotizador", action_value: "/cotizador", custom_hex: "var(--brand-orange)" }
  if (!legacyPrimary.text && (!legacySecondary || !legacySecondary.text)) {
    return [{ ...DEFAULT_HERO_BUTTON }];
  }

  // Lista de botones legados
  const buttons: HeroButtonItem[] = [];
  const order = values.hero_buttons_order?.trim();

  if (legacySecondary && legacySecondary.text) {
    if (order === "secondary,primary") {
      buttons.push(legacySecondary);
      if (legacyPrimary.text) {
        buttons.push(legacyPrimary);
      }
    } else {
      if (legacyPrimary.text) {
        buttons.push(legacyPrimary);
      }
      buttons.push(legacySecondary);
    }
  } else if (legacyPrimary.text) {
    buttons.push(legacyPrimary);
  }

  return buttons.length > 0 ? buttons : [{ ...DEFAULT_HERO_BUTTON }];
}
