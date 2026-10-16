/**
 * Sistema de Temas y Estilos Dinámicos (Cyberpunk, Temporada, Estándar y Personalizados)
 */

export type ThemeAnimation = "none" | "neon_glow" | "cyber_pulse" | "shimmer" | "festive_sparkle";

export type ThemeColors = {
  brandOrange: string;
  brandTeal: string;
  brandWine: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  ring: string;
};

export type SiteTheme = {
  id: string;
  name: string;
  description: string;
  isPreset?: boolean;
  colors: ThemeColors;
  buttonStyle: {
    animation: ThemeAnimation;
    mediaUrl?: string; // GIF, MP4, WebM o Imagen
    mediaType?: "gif" | "video" | "image";
  };
  customCss?: string;
};

export const PRESET_THEMES: SiteTheme[] = [
  {
    id: "default",
    name: "Will Design Estándar",
    description: "Paleta oficial limpia y moderna basada en los colores de marca original.",
    isPreset: true,
    colors: {
      brandOrange: "oklch(0.74 0.17 55)",
      brandTeal: "oklch(0.62 0.11 200)",
      brandWine: "oklch(0.42 0.13 20)",
      background: "oklch(0.99 0.005 90)",
      foreground: "oklch(0.22 0.03 25)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.22 0.03 25)",
      primary: "oklch(0.74 0.17 55)",
      primaryForeground: "oklch(0.99 0.005 90)",
      secondary: "oklch(0.62 0.11 200)",
      secondaryForeground: "oklch(0.99 0.005 90)",
      muted: "oklch(0.96 0.01 80)",
      mutedForeground: "oklch(0.45 0.03 30)",
      accent: "oklch(0.42 0.13 20)",
      accentForeground: "oklch(0.99 0.005 90)",
      border: "oklch(0.9 0.015 60)",
      ring: "oklch(0.74 0.17 55)",
    },
    buttonStyle: {
      animation: "none",
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon ⚡",
    description: "Estilo futurista de alto impacto: fondo oscuro obsidiana, bordes neón cyan/magenta y animaciones electro.",
    isPreset: true,
    colors: {
      brandOrange: "oklch(0.75 0.25 140)", // Cyan Neón
      brandTeal: "oklch(0.68 0.28 320)", // Magenta Neón
      brandWine: "oklch(0.55 0.25 280)", // Púrpura eléctrico
      background: "oklch(0.12 0.03 260)", // Obsidiana ultra oscuro
      foreground: "oklch(0.96 0.05 200)", // Texto cyan claro brillante
      card: "oklch(0.16 0.04 260)",
      cardForeground: "oklch(0.96 0.05 200)",
      primary: "oklch(0.75 0.25 140)",
      primaryForeground: "oklch(0.1 0.05 260)",
      secondary: "oklch(0.68 0.28 320)",
      secondaryForeground: "oklch(0.98 0 0)",
      muted: "oklch(0.22 0.05 260)",
      mutedForeground: "oklch(0.75 0.08 200)",
      accent: "oklch(0.55 0.25 280)",
      accentForeground: "oklch(0.98 0 0)",
      border: "oklch(0.35 0.12 280)",
      ring: "oklch(0.75 0.25 140)",
    },
    buttonStyle: {
      animation: "neon_glow",
    },
    customCss: `
      .chip-teal { background: rgba(0, 243, 255, 0.15) !important; color: #00f3ff !important; border: 1px solid rgba(0, 243, 255, 0.4); }
      .btn-primary { box-shadow: 0 0 18px rgba(0, 243, 255, 0.6) !important; border: 1px solid #00f3ff; }
      .btn-primary:hover { box-shadow: 0 0 28px rgba(255, 0, 85, 0.8) !important; }
    `,
  },
  {
    id: "seasonal_gold",
    name: "Temporada & Festivo 🌟",
    description: "Edición especial con dorados brillantes, rojo carmesí y elegancia nocturna.",
    isPreset: true,
    colors: {
      brandOrange: "oklch(0.78 0.18 80)", // Dorado ámbar
      brandTeal: "oklch(0.5 0.2 25)", // Rojo Carmesí
      brandWine: "oklch(0.3 0.12 25)", // Noche profunda
      background: "oklch(0.98 0.02 85)",
      foreground: "oklch(0.2 0.05 30)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.2 0.05 30)",
      primary: "oklch(0.78 0.18 80)",
      primaryForeground: "oklch(0.15 0.05 30)",
      secondary: "oklch(0.5 0.2 25)",
      secondaryForeground: "oklch(0.98 0 0)",
      muted: "oklch(0.94 0.03 85)",
      mutedForeground: "oklch(0.45 0.05 30)",
      accent: "oklch(0.3 0.12 25)",
      accentForeground: "oklch(0.98 0 0)",
      border: "oklch(0.88 0.04 80)",
      ring: "oklch(0.78 0.18 80)",
    },
    buttonStyle: {
      animation: "festive_sparkle",
    },
  },
];

export function resolveThemes(customThemesRaw?: string | null): SiteTheme[] {
  let customThemes: SiteTheme[] = [];
  if (customThemesRaw) {
    try {
      const parsed = JSON.parse(customThemesRaw);
      if (Array.isArray(parsed)) {
        customThemes = parsed;
      }
    } catch {
      customThemes = [];
    }
  }
  return [...PRESET_THEMES, ...customThemes];
}

export function getActiveTheme(content?: Record<string, string>): SiteTheme {
  const activeId = content?.active_theme_id || "default";
  const allThemes = resolveThemes(content?.custom_themes);
  return allThemes.find((t) => t.id === activeId) || PRESET_THEMES[0];
}

export function applyThemeToDocument(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const c = theme.colors;
  root.style.setProperty("--brand-orange", c.brandOrange);
  root.style.setProperty("--brand-teal", c.brandTeal);
  root.style.setProperty("--brand-wine", c.brandWine);
  root.style.setProperty("--background", c.background);
  root.style.setProperty("--foreground", c.foreground);
  root.style.setProperty("--card", c.card);
  root.style.setProperty("--card-foreground", c.cardForeground);
  root.style.setProperty("--primary", c.primary);
  root.style.setProperty("--primary-foreground", c.primaryForeground);
  root.style.setProperty("--secondary", c.secondary);
  root.style.setProperty("--secondary-foreground", c.secondaryForeground);
  root.style.setProperty("--muted", c.muted);
  root.style.setProperty("--muted-foreground", c.mutedForeground);
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--accent-foreground", c.accentForeground);
  root.style.setProperty("--border", c.border);
  root.style.setProperty("--ring", c.ring);

  // Inyectar / actualizar el bloque de CSS personalizado del tema activo
  let styleEl = document.getElementById("active-theme-custom-css");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "active-theme-custom-css";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = theme.customCss || "";
}
