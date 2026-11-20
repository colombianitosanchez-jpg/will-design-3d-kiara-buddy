/**
 * Sistema de Temas Vivos y Estilos Dinámicos (Estándar, Cyberpunk, Temporada, Navidad & Personalizados)
 */

export type ThemeAnimation = "none" | "neon_glow" | "cyber_pulse" | "shimmer" | "festive_sparkle";
export type ThemeBorderRadius = "square" | "soft" | "default" | "round" | "pill";
export type ThemeButtonStyle = "solid" | "glass" | "neon" | "cyber_bevel";
export type AmbientEffectType = "none" | "snow" | "grid" | "aurora";

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
    globalRadius?: ThemeBorderRadius;
    visualStyle?: ThemeButtonStyle;
    mediaUrl?: string; // GIF, MP4, WebM, Lottie o Imagen
    mediaType?: "gif" | "video" | "image" | "lottie";
  };
  ambient?: {
    effect: AmbientEffectType;
    intensity?: number; // 10 a 100
  };
  customCss?: string;
};

export const THEME_RADIUS_TOKENS: Record<
  ThemeBorderRadius,
  { label: string; cssRadius: string; buttonRadius: string }
> = {
  square: { label: "Cuadrado (0px)", cssRadius: "0px", buttonRadius: "0px" },
  soft: { label: "Suave (8px)", cssRadius: "0.45rem", buttonRadius: "0.5rem" },
  default: { label: "Estándar (12px)", cssRadius: "0.75rem", buttonRadius: "9999px" },
  round: { label: "Redondeado (18px)", cssRadius: "1.15rem", buttonRadius: "1.15rem" },
  pill: { label: "Píldora (24px)", cssRadius: "1.5rem", buttonRadius: "9999px" },
};

export const THEME_BUTTON_STYLE_LABELS: Record<ThemeButtonStyle, string> = {
  solid: "Sólido clásico",
  glass: "Vidrio (Glassmorphism)",
  neon: "Resplandor Neón",
  cyber_bevel: "Cyberpunk Biselado",
};

export const AMBIENT_EFFECT_LABELS: Record<AmbientEffectType, string> = {
  none: "Sin efecto ambiental",
  snow: "Nieve Navideña ❄️",
  grid: "Cyber Grid ⚡",
  aurora: "Aurora Boreal 🌌",
};

const VALID_ANIMATIONS = new Set<ThemeAnimation>([
  "none",
  "neon_glow",
  "cyber_pulse",
  "shimmer",
  "festive_sparkle",
]);

const VALID_RADII = new Set<ThemeBorderRadius>([
  "square",
  "soft",
  "default",
  "round",
  "pill",
]);

const VALID_BUTTON_STYLES = new Set<ThemeButtonStyle>([
  "solid",
  "glass",
  "neon",
  "cyber_bevel",
]);

const VALID_AMBIENT = new Set<AmbientEffectType>(["none", "snow", "grid", "aurora"]);

export function clampAmbientIntensity(intensity?: number): number {
  if (typeof intensity !== "number" || !Number.isFinite(intensity)) return 55;
  return Math.max(10, Math.min(100, Math.round(intensity)));
}

export function normalizeTheme(theme: SiteTheme): SiteTheme {
  const rawBtn = (theme.buttonStyle ?? {}) as Partial<SiteTheme["buttonStyle"]>;
  const animation: ThemeAnimation = VALID_ANIMATIONS.has(rawBtn.animation as ThemeAnimation)
    ? (rawBtn.animation as ThemeAnimation)
    : "none";
  const globalRadius: ThemeBorderRadius = VALID_RADII.has(rawBtn.globalRadius as ThemeBorderRadius)
    ? (rawBtn.globalRadius as ThemeBorderRadius)
    : "default";
  const visualStyle: ThemeButtonStyle = VALID_BUTTON_STYLES.has(rawBtn.visualStyle as ThemeButtonStyle)
    ? (rawBtn.visualStyle as ThemeButtonStyle)
    : "solid";

  const rawAmbient = (theme.ambient ?? {}) as Partial<NonNullable<SiteTheme["ambient"]>>;
  const effect: AmbientEffectType = VALID_AMBIENT.has(rawAmbient.effect as AmbientEffectType)
    ? (rawAmbient.effect as AmbientEffectType)
    : "none";

  return {
    ...theme,
    colors: ensureThemePalette(theme.colors || {}),
    buttonStyle: {
      ...rawBtn,
      animation,
      globalRadius,
      visualStyle,
    },
    ambient: {
      effect,
      intensity: clampAmbientIntensity(rawAmbient.intensity),
    },
  };
}

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
      globalRadius: "default",
      visualStyle: "solid",
    },
    ambient: {
      effect: "none",
      intensity: 50,
    },
  },
  {
    id: "christmas_new_year",
    name: "Navidad & Fin de Año 🎄",
    description: "Edición decembrina oficial con rojo navideño, verde pino, acentos dorados y nieve suave en vivo.",
    isPreset: true,
    colors: ensureThemePalette({
      brandOrange: "#c81e1e",
      brandTeal: "#15803d",
      brandWine: "#b45309",
      background: "#fffdf8",
      palette: [
        { id: "brandOrange", name: "Rojo Navideño", hex: "#c81e1e" },
        { id: "brandTeal", name: "Verde Pino", hex: "#15803d" },
        { id: "brandWine", name: "Dorado Festivo", hex: "#b45309" },
        { id: "background", name: "Blanco Nieve", hex: "#fffdf8" },
      ],
    }),
    buttonStyle: {
      animation: "festive_sparkle",
      globalRadius: "round",
      visualStyle: "solid",
    },
    ambient: {
      effect: "snow",
      intensity: 65,
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon ⚡",
    description: "Estilo futurista de alto impacto: fondo oscuro obsidiana, bordes neón cyan/magenta y Cyber Grid.",
    isPreset: true,
    colors: ensureThemePalette({
      brandOrange: "#00f3ff",
      brandTeal: "#ff0055",
      brandWine: "#9d00ff",
      background: "#0f172a",
      foreground: "#f8fafc",
      card: "#1e293b",
      cardForeground: "#f8fafc",
      muted: "#1e293b",
      mutedForeground: "#94a3b8",
      border: "#334155",
      palette: [
        { id: "brandOrange", name: "Cyan Neón", hex: "#00f3ff" },
        { id: "brandTeal", name: "Magenta Neón", hex: "#ff0055" },
        { id: "brandWine", name: "Púrpura Eléctrico", hex: "#9d00ff" },
        { id: "background", name: "Obsidiana Oscuro", hex: "#0f172a" },
      ],
    }),
    buttonStyle: {
      animation: "neon_glow",
      globalRadius: "square",
      visualStyle: "cyber_bevel",
    },
    ambient: {
      effect: "grid",
      intensity: 60,
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
    description: "Edición especial con dorados brillantes, rojo carmesí y aurora boreal ambiental.",
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
      globalRadius: "round",
      visualStyle: "glass",
    },
    ambient: {
      effect: "aurora",
      intensity: 55,
    },
  },
];

export function resolveThemes(customThemesRaw?: string | null): SiteTheme[] {
  let customThemes: SiteTheme[] = [];
  if (customThemesRaw) {
    try {
      const parsed = JSON.parse(customThemesRaw);
      if (Array.isArray(parsed)) {
        customThemes = parsed
          .filter((t): t is SiteTheme => Boolean(t && typeof t === "object" && typeof t.id === "string"))
          .map((t) => normalizeTheme({ ...t, isPreset: false }));
      }
    } catch {
      customThemes = [];
    }
  }

  const presets = PRESET_THEMES.map((t) => normalizeTheme(t));

  return [...presets, ...customThemes];
}

export function getActiveTheme(content?: Record<string, string>): SiteTheme {
  const activeId = content?.active_theme_id || "default";
  const allThemes = resolveThemes(content?.custom_themes);
  const matched = allThemes.find((t) => t.id === activeId) || PRESET_THEMES[0];
  return normalizeTheme(matched);
}

export function buildThemeGlobalCss(theme: SiteTheme): string {
  const normalized = normalizeTheme(theme);
  const radiusKey = normalized.buttonStyle.globalRadius ?? "default";
  const radiusToken = THEME_RADIUS_TOKENS[radiusKey] ?? THEME_RADIUS_TOKENS.default;
  const parts: string[] = [
    `:root { --radius: ${radiusToken.cssRadius}; --btn-radius: ${radiusToken.buttonRadius}; }`,
  ];
  if (normalized.customCss?.trim()) {
    parts.push(normalized.customCss);
  }
  return parts.join("\n");
}

export function applyThemeToDocument(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  const normalized = normalizeTheme(theme);
  const root = document.documentElement;

  const c = normalized.colors;
  root.style.setProperty("--brand-orange", c.brandOrange);
  root.style.setProperty("--brand-teal", c.brandTeal);
  root.style.setProperty("--brand-wine", c.brandWine);
  root.style.setProperty("--background", c.background);

  const radiusKey = normalized.buttonStyle.globalRadius ?? "default";
  const radiusToken = THEME_RADIUS_TOKENS[radiusKey] ?? THEME_RADIUS_TOKENS.default;
  root.style.setProperty("--radius", radiusToken.cssRadius);
  root.style.setProperty("--btn-radius", radiusToken.buttonRadius);

  root.dataset.themeId = normalized.id;
  root.dataset.themeRadius = radiusKey;
  root.dataset.themeButtonStyle = normalized.buttonStyle.visualStyle ?? "solid";
  root.dataset.themeAnimation = normalized.buttonStyle.animation ?? "none";
  root.dataset.themeAmbient = normalized.ambient?.effect ?? "none";

  const optionalVarPairs: Array<[string, string | undefined]> = [
    ["--foreground", c.foreground],
    ["--card", c.card],
    ["--card-foreground", c.cardForeground],
    ["--primary", c.primary],
    ["--primary-foreground", c.primaryForeground],
    ["--secondary", c.secondary],
    ["--secondary-foreground", c.secondaryForeground],
    ["--muted", c.muted],
    ["--muted-foreground", c.mutedForeground],
    ["--accent", c.accent],
    ["--accent-foreground", c.accentForeground],
    ["--border", c.border],
    ["--ring", c.ring],
  ];

  for (const [cssVar, val] of optionalVarPairs) {
    if (val) {
      root.style.setProperty(cssVar, val);
    } else {
      root.style.removeProperty(cssVar);
    }
  }

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
  styleEl.textContent = buildThemeGlobalCss(normalized);
}
