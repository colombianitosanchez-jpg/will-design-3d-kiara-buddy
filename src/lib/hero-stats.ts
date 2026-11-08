import type { ButtonIconShape } from "@/lib/product-buttons";

export type HeroStatItem = {
  id: string;
  k: string;
  v: string;
  text_color?: string;
  custom_hex?: string;
  shade?: number;
  media_mode?: "fill" | "none";
  media_fit?: "cover" | "contain" | "fill";
  icon_url?: string;
  icon_shape?: ButtonIconShape;
  icon_position?: "none" | "left" | "right";
  width?: "auto" | "full";
  action_type?: "none" | "link" | "whatsapp" | "cotizador";
  action_value?: string;
  whatsapp_message?: string;
  whatsapp_image_url?: string;
  // Propiedades heredadas para compatibilidad con datos previos
  whatsapp_image_logic?: "auto" | "none" | "logo" | "product_image";
  color_id?: string;
  media_url?: string;
  animation_type?: "none" | "image" | "video" | "gif" | "lottie";
  animation_style?: string;
  type?: "solid" | "gradient" | "imageFill" | "videoFill";
  bgImageUrl?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  overlayOpacity?: number;
  iconPosition?: "none" | "left" | "right";
  rounded?: "rounded-xl" | "rounded-2xl" | "rounded-3xl" | "rounded-full";
};

/** Texto legible automático sobre un fondo: negro en fondos claros, blanco en oscuros o no HEX. */
export function contrastText(bg: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec((bg || "").trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111111" : "#ffffff";
}

/** Colores rápidos de la paleta aptos para tarjetas/botones (sin el fondo de página). */
export function accentPalette<T extends { id: string }>(palette: T[]): T[] {
  return palette.filter((p) => p.id !== "background");
}

export function parseHeroStats(values: Record<string, string>): HeroStatItem[] {
  if (values.hero_stats) {
    try {
      const parsed = JSON.parse(values.hero_stats);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => {
          const bgUrl = item.media_url || item.bgImageUrl || "";
          const iconUrl = item.icon_url || (item.iconPosition && item.iconPosition !== "none" ? item.bgImageUrl : undefined) || "";
          const isVid = /\.(mp4|webm|quicktime)($|\?)/i.test(bgUrl);
          const legacyShade = typeof item.shade === "number" ? item.shade : (typeof item.overlayOpacity === "number" ? item.overlayOpacity : undefined);
          const iconPos = item.icon_position || item.iconPosition || "none";
          const mediaMode = item.media_mode || (bgUrl && item.type !== "solid" ? "fill" : (bgUrl ? "fill" : "none"));

          return {
            ...item,
            media_mode: mediaMode,
            media_fit: item.media_fit || "cover",
            icon_position: iconPos,
            iconPosition: iconPos,
            icon_shape: item.icon_shape || "circle",
            width: item.width || "auto",
            shade: legacyShade,
            overlayOpacity: legacyShade ?? 45,
            media_url: bgUrl,
            bgImageUrl: bgUrl,
            icon_url: iconUrl,
            type: item.type || (bgUrl ? (isVid ? "videoFill" : "imageFill") : "solid"),
            gradientFrom: item.gradientFrom || "#f97316",
            gradientTo: item.gradientTo || "#db2777",
            gradientAngle: item.gradientAngle ?? 135,
            rounded: item.rounded || "rounded-2xl",
          };
        });
      }
    } catch {
      // fallback
    }
  }

  const legacy: HeroStatItem[] = [];
  for (let i = 1; i <= 6; i++) {
    const k = values[`hero_stat_${i}_k`]?.trim();
    const v = values[`hero_stat_${i}_v`]?.trim();
    if (k || v) {
      legacy.push({
        id: `stat_${i}`,
        k: k || "",
        v: v || "",
        action_type: "none",
        action_value: "",
        animation_type: "none",
        type: "solid",
        media_mode: "none",
        media_fit: "cover",
        icon_position: "none",
        iconPosition: "none",
        icon_shape: "circle",
        width: "auto",
        rounded: "rounded-2xl",
      });
    }
  }
  return legacy.length > 0
    ? legacy
    : [
        { id: "stat_1", k: "50×50", v: "cm mínimo", action_type: "none", type: "solid", media_mode: "none", media_fit: "cover", icon_position: "none", iconPosition: "none", icon_shape: "circle", width: "auto", rounded: "rounded-2xl" },
        { id: "stat_2", k: "1.8 m", v: "en una sola pieza", action_type: "none", type: "solid", media_mode: "none", media_fit: "cover", icon_position: "none", iconPosition: "none", icon_shape: "circle", width: "auto", rounded: "rounded-2xl" },
        { id: "stat_3", k: "24/7", v: "atención y cotización", action_type: "none", type: "solid", media_mode: "none", media_fit: "cover", icon_position: "none", iconPosition: "none", icon_shape: "circle", width: "auto", rounded: "rounded-2xl" },
      ];
}
