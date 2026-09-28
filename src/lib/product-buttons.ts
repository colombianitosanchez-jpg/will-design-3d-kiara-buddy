/** Botones personalizables por producto, configurados desde /panel/productos. */

export const BUTTON_VARIANTS = ["default", "secondary", "destructive", "outline", "ghost"] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_WIDTHS = ["auto", "full"] as const;
export type ButtonWidth = (typeof BUTTON_WIDTHS)[number];

export const BUTTON_POSITIONS = ["left", "center", "right"] as const;
export type ButtonPosition = (typeof BUTTON_POSITIONS)[number];

export const BUTTON_ACTIONS = ["link", "whatsapp", "add_to_cart", "checkout"] as const;
export type ButtonActionType = (typeof BUTTON_ACTIONS)[number];

export type ProductButton = {
  id: string;
  text: string;
  variant: ButtonVariant;
  width: ButtonWidth;
  position: ButtonPosition;
  action_type: ButtonActionType;
  action_value: string;
  /** Mensaje personalizado de WhatsApp; admite {{producto}} y {{precio}}. */
  whatsapp_message: string;
  /** Añade al final del mensaje el enlace de la imagen principal. */
  include_image_link: boolean;
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
};

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
    }))
    .filter((b) => !!b.text);
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
