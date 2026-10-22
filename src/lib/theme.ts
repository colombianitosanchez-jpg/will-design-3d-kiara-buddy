/**
 * Sistema de Temas y Estilos Dinámicos (Cyberpunk, Temporada, Estándar y Personalizados)
 */

export type ThemeAnimation = "none" | "neon_glow" | "cyber_pulse" | "shimmer" | "festive_sparkle";

export type ColorToken = {
  id: string;
  name: string;
  hex: string;
  oklch?: string;
};

export type ThemeColors = {
  palette: ColorToken[];
  brandOrange: string;
  brandTeal: string;
  brandWine: string;
  background: string;
  foreground?: string;
  card?: string;
  cardForeground?: string;
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
  muted?: string;
  mutedForeground?: string;
  accent?: string;
  accentForeground?: string;
  border?: string;
  ring?: string;
};

export type SiteTheme = {
  id: string;
  name: string;
  description: string;
  isPreset?: boolean;
  colors: ThemeColors;
  buttonStyle: {
    animation: ThemeAnimation;
    mediaUrl?: string; // GIF, MP4, WebM, Lottie o Imagen
    mediaType?: "gif" | "video" | "image" | "lottie";
  };
  customCss?: string;
};

export function ensureThemePalette(colors: Partial<ThemeColors>): ThemeColors {
  const brandOrange = colors.brandOrange || "#f97316";
  const brandTeal = colors.brandTeal || "#14b8a6";
  const brandWine = colors.brandWine || "#881337";
  const background = colors.background || "#ffffff";

  let palette = Array.isArray(colors.palette) ? colors.palette : [];

  if (palette.length === 0) {
    palette = [
      { id: "brandOrange", name: "Naranja Principal", hex: brandOrange.startsWith("#") ? brandOrange : "#f97316" },
      { id: "brandTeal", name: "Teal Secundario", hex: brandTeal.startsWith("#") ? brandTeal : "#14b8a6" },
      { id: "brandWine", name: "Burgundy Acento", hex: brandWine.startsWith("#") ? brandWine : "#881337" },
      { id: "background", name: "Fondo de Página", hex: background.startsWith("#") ? background : "#ffffff" },
    ];
  }

  return {
    ...colors,
    brandOrange,
    brandTeal,
    brandWine,
    background,
    palette,
  };
}

export const PRESET_THEMES: SiteTheme[] = [
  {
    id: "default",
    name: "Will Design Estándar",
    description: "Paleta oficial limpia y moderna basada en los colores de marca original.",
    isPreset: true,
    colors: ensureThemePalette({
      brandOrange: "#f97316",
      brandTeal: "#14b8a6",
      brandWine: "#881337",
      background: "#ffffff",
      palette: [
        { id: "brandOrange", name: "Naranja Principal", hex: "#f97316" },
        { id: "brandTeal", name: "Teal Secundario", hex: "#14b8a6" },
        { id: "brandWine", name: "Burgundy Acento", hex: "#881337" },
        { id: "background", name: "Fondo de Página", hex: "#ffffff" },
      ],
    }),
    buttonStyle: {
      animation: "none",
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon ⚡",
    description: "Estilo futurista de alto impacto: fondo oscuro obsidiana, bordes neón cyan/magenta y animaciones electro.",
    isPreset: true,
    colors: ensureThemePalette({
      brandOrange: "#00f3ff",
      brandTeal: "#ff0055",
      brandWine: "#9d00ff",
      background: "#0f172a",
      palette: [
        { id: "brandOrange", name: "Cyan Neón", hex: "#00f3ff" },
        { id: "brandTeal", name: "Magenta Neón", hex: "#ff0055" },
        { id: "brandWine", name: "Púrpura Eléctrico", hex: "#9d00ff" },
        { id: "background", name: "Obsidiana Oscuro", hex: "#0f172a" },
      ],
    }),
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
    colors: ensureThemePalette({
      brandOrange: "#eab308",
      brandTeal: "#dc2626",
      brandWine: "#450a0a",
      background: "#fefce8",
      palette: [
        { id: "brandOrange", name: "Dorado Ámbar", hex: "#eab308" },
        { id: "brandTeal", name: "Rojo Carmesí", hex: "#dc2626" },
        { id: "brandWine", name: "Noche Profunda", hex: "#450a0a" },
        { id: "background", name: "Fondo Calidez", hex: "#fefce8" },
      ],
    }),
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
        customThemes = parsed.map((t) => ({
          ...t,
          colors: ensureThemePalette(t.colors || {}),
        }));
      }
    } catch {
      customThemes = [];
    }
  }

  const presets = PRESET_THEMES.map((t) => ({
    ...t,
    colors: ensureThemePalette(t.colors),
  }));

  return [...presets, ...customThemes];
}

export function getActiveTheme(content?: Record<string, string>): SiteTheme {
  const activeId = content?.active_theme_id || "default";
  const allThemes = resolveThemes(content?.custom_themes);
  const matched = allThemes.find((t) => t.id === activeId) || PRESET_THEMES[0];
  return {
    ...matched,
    colors: ensureThemePalette(matched.colors),
  };
}

export function applyThemeToDocument(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const c = ensureThemePalette(theme.colors);
  root.style.setProperty("--brand-orange", c.brandOrange);
  root.style.setProperty("--brand-teal", c.brandTeal);
  root.style.setProperty("--brand-wine", c.brandWine);
  root.style.setProperty("--background", c.background);

  if (c.foreground) root.style.setProperty("--foreground", c.foreground);
  if (c.card) root.style.setProperty("--card", c.card);
  if (c.cardForeground) root.style.setProperty("--card-foreground", c.cardForeground);
  if (c.primary) root.style.setProperty("--primary", c.primary);
  if (c.primaryForeground) root.style.setProperty("--primary-foreground", c.primaryForeground);
  if (c.secondary) root.style.setProperty("--secondary", c.secondary);
  if (c.secondaryForeground) root.style.setProperty("--secondary-foreground", c.secondaryForeground);
  if (c.muted) root.style.setProperty("--muted", c.muted);
  if (c.mutedForeground) root.style.setProperty("--muted-foreground", c.mutedForeground);
  if (c.accent) root.style.setProperty("--accent", c.accent);
  if (c.accentForeground) root.style.setProperty("--accent-foreground", c.accentForeground);
  if (c.border) root.style.setProperty("--border", c.border);
  if (c.ring) root.style.setProperty("--ring", c.ring);

  c.palette.forEach((token) => {
    root.style.setProperty(`--theme-color-${token.id}`, token.hex);
  });

  // Inyectar / actualizar el bloque de CSS personalizado del tema activo
  let styleEl = document.getElementById("active-theme-custom-css");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "active-theme-custom-css";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = theme.customCss || "";
}
