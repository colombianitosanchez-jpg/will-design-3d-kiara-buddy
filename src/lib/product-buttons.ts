/** Botones personalizables por producto, configurados desde /panel/productos. */
import { replaceTemplatePlaceholders, toAbsoluteUrl } from "./whatsapp-buttons";
import { firstStaticShareImage } from "./share-image";

export const BUTTON_VARIANTS = ["default", "secondary", "destructive", "outline", "ghost"] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_WIDTHS = ["auto", "full"] as const;
export type ButtonWidth = (typeof BUTTON_WIDTHS)[number];

export const BUTTON_POSITIONS = ["left", "center", "right"] as const;
export type ButtonPosition = (typeof BUTTON_POSITIONS)[number];

export const BUTTON_ACTIONS = ["link", "whatsapp", "add_to_cart", "checkout", "order_request"] as const;
export type ButtonActionType = (typeof BUTTON_ACTIONS)[number];

export const ANIMATION_TYPES = ["none", "image", "video", "gif", "lottie"] as const;
export type ButtonAnimationType = (typeof ANIMATION_TYPES)[number];

export type ButtonMediaMode = "fill" | "icon" | "none";
export type ButtonIconPosition = "left" | "right" | "none";

export const BUTTON_ICON_SHAPES = [
  "circle",
  "square",
  "rounded",
  "hexagon",
  "diamond",
  "star",
  "shield",
  "octagon",
  "original",
] as const;
export type ButtonIconShape = (typeof BUTTON_ICON_SHAPES)[number];

export const ICON_SHAPE_LABELS: Record<ButtonIconShape, string> = {
  circle: "Circular (Círculo)",
  square: "Cuadrado",
  rounded: "Cuadrado redondeado",
  hexagon: "Hexágono",
  diamond: "Diamante / Rombo",
  star: "Estrella",
  shield: "Escudo",
  octagon: "Octágono",
  original: "Silueta original (sin recortar)",
};

export const ICON_SHAPE_CLIP_PATHS: Record<string, string | undefined> = {
  hexagon: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  shield: "polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)",
  octagon: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
};

export type ProductButton = {
  id: string;
  text: string;
  label?: string;
  variant: ButtonVariant;
  width: ButtonWidth;
  position: ButtonPosition;
  action_type: ButtonActionType;
  action_value: string;
  /** Mensaje personalizado de WhatsApp; admite {{producto}} y {{precio}}. */
  whatsapp_message: string;
  /** URL de imagen específica cargada para acompañar el mensaje de WhatsApp. */
  whatsapp_image_url?: string;
  /** ID del color seleccionado de la paleta del tema activo */
  color_id?: string;
  /** Color personalizado libre HEX si no usa color de paleta */
  custom_hex?: string;
  /** Color personalizado libre HEX para el texto del botón (ej: #ffffff) */
  text_color?: string;
  /** URL de GIF, Video (MP4/WebM), Lottie JSON o Imagen decorativa para el botón */
  media_url?: string;
  /** Modo de visualización del medio principal: relleno completo ("fill"), icono circular ("icon") o ninguno */
  media_mode?: ButtonMediaMode;
  /** URL independiente para icono o logo circular en el botón */
  icon_url?: string;
  /** Posición del icono circular dentro del botón */
  icon_position?: ButtonIconPosition;
  /** Tipo de animación/media */
  animation_type?: ButtonAnimationType;
  /** Estilo de animación dinámica (Neón, Pulso Cyber, Shimmer) */
  animation_style?: string;
  /** Opacidad del botón entero (10 a 100) */
  opacity?: number;
  /** Sombreado/contraste entre fondo y texto (0 a 100). Vacío = automático */
  shade?: number;
  /** Ajuste del fondo animado dentro del botón */
  media_fit?: "cover" | "contain" | "fill";
  /** Forma del ícono o logo */
  icon_shape?: ButtonIconShape;
  /** Mostrar también en la tarjeta del catálogo (/tienda). Por defecto sí. */
  show_on_card?: boolean;
  /** En botones WhatsApp de producto, capturar datos y crear pedido en BD antes de abrir WhatsApp. Por defecto sí. */
  capture_order?: boolean;
};

export const VARIANT_LABELS: Record<ButtonVariant, string> = {
  default: "Principal (naranja)",
  secondary: "Secundario (suave)",
  destructive: "Destacado (rojo)",
  outline: "Borde",
  ghost: "Transparente",
};

export const WIDTH_LABELS: Record<ButtonWidth, string> = {
  auto: "Ajustado al texto",
  full: "Ancho completo",
};

export const POSITION_LABELS: Record<ButtonPosition, string> = {
  left: "Izquierda",
  center: "Centro",
  right: "Derecha",
};

export const ACTION_LABELS: Record<ButtonActionType, string> = {
  link: "Enlace / URL",
  whatsapp: "WhatsApp",
  add_to_cart: "Añadir al carrito",
  checkout: "Ir al pago",
  order_request: "Solicitar pedido (formulario)",
};

export const ANIMATION_TYPE_LABELS: Record<ButtonAnimationType, string> = {
  none: "Sin Animación",
  image: "Imagen fija (PNG/JPG/SVG)",
  gif: "GIF Animado",
  video: "Video MP4 / WebM",
  lottie: "Lottie JSON",
};

export function duplicateProductButton(original: ProductButton): ProductButton {
  return {
    ...original,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "btn-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    text: original.text + " (Copia)",
  };
}

export function newProductButton(): ProductButton {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `btn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: "Comprar",
    variant: "default",
    width: "auto",
    position: "left",
    action_type: "add_to_cart",
    action_value: "",
    whatsapp_message: "",
    color_id: "",
    custom_hex: "",
    text_color: "",
    media_url: "",
    media_mode: "fill",
    icon_url: "",
    icon_position: "none",
    animation_type: "none",
    animation_style: "none",
  };
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Convierte el JSON guardado en botones válidos, ignorando datos corruptos. */
export function parseProductButtons(raw: unknown): ProductButton[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .map((b, i) => ({
      id: typeof b.id === "string" && b.id ? b.id : `btn-${i}`,
      text: typeof b.text === "string" ? b.text.trim() : "",
      variant: pick(b.variant, BUTTON_VARIANTS, "default"),
      width: pick(b.width, BUTTON_WIDTHS, "auto"),
      position: pick(b.position, BUTTON_POSITIONS, "left"),
      action_type: pick(b.action_type, BUTTON_ACTIONS, "link"),
      action_value: typeof b.action_value === "string" ? b.action_value.trim() : "",
      whatsapp_message: typeof b.whatsapp_message === "string" ? b.whatsapp_message : "",
      whatsapp_image_url: typeof b.whatsapp_image_url === "string" ? b.whatsapp_image_url.trim() : "",
      color_id: typeof b.color_id === "string" ? b.color_id : "",
      custom_hex: typeof b.custom_hex === "string" ? b.custom_hex : "",
      text_color: typeof b.text_color === "string" ? b.text_color : "",
      media_url: typeof b.media_url === "string" ? b.media_url.trim() : "",
      media_mode: (b.media_mode === "fill" || b.media_mode === "icon" || b.media_mode === "none" ? b.media_mode : "fill") as ButtonMediaMode,
      icon_url: typeof b.icon_url === "string" ? b.icon_url.trim() : "",
      icon_position: (b.icon_position === "left" || b.icon_position === "right" || b.icon_position === "none" ? b.icon_position : "none") as ButtonIconPosition,
      animation_type: pick(b.animation_type || (b.media_type as string), ANIMATION_TYPES, "none"),
      animation_style: typeof b.animation_style === "string" ? b.animation_style : "none",
      icon_shape: pick(b.icon_shape, BUTTON_ICON_SHAPES, "circle"),
      opacity: typeof b.opacity === "number" ? b.opacity : undefined,
      shade: typeof b.shade === "number" ? b.shade : undefined,
      show_on_card: b.show_on_card !== false,
      capture_order: b.capture_order !== false,
      media_fit: (b.media_fit === "contain" || b.media_fit === "fill" || b.media_fit === "cover" ? b.media_fit : "cover") as "cover" | "contain" | "fill",
    }))
    .filter((b) => !!b.text);
}

/** Quita los tokens de una URL firmada de Storage para dejarla lo más corta posible. */
function shortenStorageUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.pathname.includes("/object/sign/")) {
      u.pathname = u.pathname.replace("/object/sign/", "/object/public/");
      u.search = "";
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

/** URL pública de la ficha del producto: WhatsApp la usa para la vista previa con foto. */
export function productPageUrl(slug?: string | null, variantId?: string | null): string {
  if (!slug) return "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://will-design-3d.lovable.app";
  return `${origin}/tienda/${slug}${variantId ? `?v=${encodeURIComponent(variantId)}` : ""}`;
}

/**
 * Texto final del mensaje de WhatsApp para un botón de producto.
 * Usa el mensaje personalizado (con {{producto}} / {{precio}}) o el de sistema.
 * Cuando el botón incluye la foto, se adjunta el enlace de la ficha del producto
 * (con Open Graph) en una línea aparte para que WhatsApp muestre la miniatura.
 */
export function buildButtonWhatsappText(
  button: Pick<ProductButton, "whatsapp_message" | "whatsapp_image_url">,
  product: {
    name: string;
    slug?: string | null;
    image_url?: string | null;
    images?: string[] | null;
    price?: string | null;
    variant_id?: string | null;
    variant_name?: string | null;
    /** Enlace corto /t/... con la foto ya resuelta; "" = sin foto, mensaje limpio. */
    share_url?: string | null;
  },
  extraNote = "",
  globalDefaultMessage = "",
): string {
  const custom = (button.whatsapp_message ?? "").trim() || globalDefaultMessage.trim();
  // Productos: enlace corto con la jerarquía botón > variante ★ > producto ★.
  // Fuera de productos: solo la foto propia del botón.
  const resolvedMedia =
    product.share_url !== undefined
      ? product.share_url || ""
      : firstStaticShareImage([button.whatsapp_image_url])
        ? shortenStorageUrl(firstStaticShareImage([button.whatsapp_image_url]))
        : "";
  const absoluteMedia = resolvedMedia ? toAbsoluteUrl(resolvedMedia) : "";

  const base = custom
    ? replaceTemplatePlaceholders(custom, {
        producto: product.name,
        precio: product.price ?? "",
        variante: product.variant_name ?? "",
        media: absoluteMedia,
      })
    : `Hola, me interesa el producto: ${product.name}.`;

  const parts = [base.trim()];
  if (extraNote.trim()) parts.push(extraNote.trim());
  let text = parts.join(" ");

  if (absoluteMedia) {
    if (!custom.includes("{media") && !custom.includes("{{media")) {
      text = `${text}\n\n${absoluteMedia}`;
    }
  }
  return text;
}

/** Valida antes de guardar en el panel: devuelve el primer error legible o null. */
export function validateProductButtons(buttons: ProductButton[]): string | null {
  for (const [i, b] of buttons.entries()) {
    const n = i + 1;
    if (!b.text.trim()) return `El botón ${n} necesita un texto.`;
    if (b.action_type === "link" && !b.action_value.trim())
      return `El botón ${n} necesita la URL o ruta de destino.`;
    if (b.action_type === "whatsapp" && b.action_value.trim() && b.action_value.replace(/\D/g, "").length < 7)
      return `El número de WhatsApp del botón ${n} no parece válido.`;
  }
  return null;
}
