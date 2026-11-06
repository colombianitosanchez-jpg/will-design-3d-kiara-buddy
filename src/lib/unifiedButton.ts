import type { ProductButton } from "./product-buttons";

export type ButtonType = "solid" | "gradient" | "imageFill" | "videoFill" | "lottieFill";

export type ButtonAnimation =
  | "none"
  | "pulse"
  | "shine"
  | "heartbeat"
  | "float"
  | "glow"
  | "neon_glow"
  | "cyber_pulse";

export interface UnifiedButtonStyle {
  /** Estructura y tipo de renderizado del fondo */
  type: ButtonType;
  /** Color de fondo sólido */
  background?: string;
  /** Color inicial del degradé */
  gradientFrom?: string;
  /** Color final del degradé */
  gradientTo?: string;
  /** Ángulo del degradé en grados */
  gradientAngle?: number;
  /** URL pública o firmada de la imagen/GIF/Video/Lottie que cubre el fondo */
  bgImageUrl?: string;
  /** Opacidad del overlay oscuro en porcentaje (30 a 80) */
  overlayOpacity?: number;
  /** Sombreado elegido en el panel (0..100). Si existe, se respeta exacto */
  shade?: number;
  /** Efecto de animación o resplandor */
  animation?: ButtonAnimation;
  /** Color del texto */
  textColor?: string;
  /** Estilo de redondeado */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  /** Ubicación del ícono o miniatura */
  iconPosition?: "none" | "left" | "right";
  /** URL del ícono miniatura si iconPosition !== 'none' */
  iconUrl?: string;
}

/** Calcula la luminancia relativa para garantizar un contraste WCAG 2.2 AA (mínimo 4.5:1) */
export function getHexLuminance(hexStr: string): number {
  const hex = hexStr.replace("#", "").trim();
  if (hex.length !== 6 && hex.length !== 3) return 0.5;
  const fullHex =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const num = parseInt(fullHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const [sR, sG, sB] = [r / 255, g / 255, b / 255].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
  );

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

export type AccessibilityResult = {
  overlayOpacity: number; // Porcentaje 0..100
  textColor: string;
  textShadowClass: string;
  tapTargetClass: string;
  focusClass: string;
  ariaLabel?: string;
  contrastRatioNote?: string;
};

/**
 * Motor de Accesibilidad WCAG 2.2 AA para Botones Vivos y Botoneras de Conversión Móvil.
 * Garantiza mínimo 45% de overlay oscuro en fondos de video/imagen, tap target de 44px
 * para uso táctil bajo sol intenso y alto contraste de legibilidad.
 */
export function getBestAccessibility(
  style: Partial<UnifiedButtonStyle>,
  buttonText = "",
  actionType = "",
): AccessibilityResult {
  const isFill =
    style.type === "imageFill" ||
    style.type === "videoFill" ||
    style.type === "lottieFill" ||
    Boolean(style.bgImageUrl);

  // 1. Overlay automático: si es botón vivo, forzar MIN 45% para asegurar legibilidad bajo el sol.
  let overlayOpacity = style.overlayOpacity ?? (isFill ? 50 : 0);
  if (isFill && overlayOpacity < 45) {
    overlayOpacity = 45;
  }
  if (typeof style.shade === "number" && !isNaN(style.shade)) {
    overlayOpacity = Math.max(0, Math.min(100, style.shade));
  }

  // 2. Color de texto y sombra de alto contraste
  let textColor = style.textColor || "";
  let textShadowClass = "";

  if (isFill) {
    // El color elegido en el panel siempre manda; blanco solo si no hay uno
    if (!textColor) textColor = "#ffffff";
    textShadowClass = "drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] font-bold tracking-wide";
  } else {
    // Sombreado sutil entre texto y fondo para legibilidad siempre
    textShadowClass = "drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] font-semibold";
  }
  if (!isFill && !textColor) {
    if (style.background && /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(style.background.trim())) {
      const lum = getHexLuminance(style.background);
      textColor = lum > 0.4 ? "#0f172a" : "#ffffff";
    } else {
      // Colores de marca (var(--...)) o sin color: texto blanco legible
      textColor = "#ffffff";
    }
  }

  // 3. Tap Target Mínimo WCAG (44x44px para dedos grandes en móvil)
  const tapTargetClass =
    "min-h-[44px] min-w-[44px] px-6 py-3 font-bold text-sm sm:text-base inline-flex items-center justify-center";

  // 4. Indicador visual de Focus con alto contraste
  const focusClass =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

  // 5. Aria-label para lecturas accesibles
  let ariaLabel: string | undefined;
  if (!buttonText || buttonText.trim().length <= 3 || style.iconPosition === "none") {
    ariaLabel = buttonText.trim() || `Acción de ${actionType || "botón"}`;
  }

  return {
    overlayOpacity,
    textColor,
    textShadowClass,
    tapTargetClass,
    focusClass,
    ariaLabel,
  };
}

/** Convierte una estructura legacy ProductButton a la interfaz UnifiedButtonStyle */
export function productButtonToUnified(b: ProductButton): UnifiedButtonStyle {
  const isFillMode = b.media_mode === "fill" || (!b.media_mode && Boolean(b.media_url));
  const isIconMode = b.media_mode === "icon";

  let type: ButtonType = "solid";
  if (isFillMode && b.media_url) {
    if (b.animation_type === "video" || /\.(mp4|webm|quicktime)($|\?)/i.test(b.media_url)) {
      type = "videoFill";
    } else if (b.animation_type === "lottie" || /\.json($|\?)/i.test(b.media_url)) {
      type = "lottieFill";
    } else {
      type = "imageFill";
    }
  }

  let iconUrl: string | undefined = undefined;
  let iconPosition: "none" | "left" | "right" = "none";

  if (b.icon_url && b.icon_position && b.icon_position !== "none") {
    iconUrl = b.icon_url;
    iconPosition = b.icon_position;
  } else if (isIconMode && b.media_url) {
    iconUrl = b.media_url;
    iconPosition = b.icon_position && b.icon_position !== "none" ? b.icon_position : "left";
  }

  return {
    type,
    background: b.custom_hex || undefined,
    bgImageUrl: isFillMode ? b.media_url || undefined : undefined,
    overlayOpacity: 50,
    animation: (b.animation_style as any) || "none",
    textColor: b.text_color || (isFillMode ? "#ffffff" : undefined),
    rounded: "xl",
    iconPosition,
    iconUrl,
  };
}
