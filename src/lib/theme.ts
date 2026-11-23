/**
 * Sistema de Temas Vivos y Estilos Dinámicos (Estándar, Cyberpunk, Temporada, Navidad & Personalizados)
 */

export type ThemeAnimation = "none" | "neon_glow" | "cyber_pulse" | "shimmer" | "festive_sparkle";
export type ThemeBorderRadius = "square" | "soft" | "default" | "round" | "pill";
export type ThemeButtonStyle = "solid" | "glass" | "neon" | "cyber_bevel";
export type AmbientEffectType = "none" | "snow" | "grid" | "aurora";
export type ThemeBackgroundType = "solid" | "image" | "gif" | "video" | "pattern";
export type ThemeBackgroundFit = "cover" | "contain" | "repeat";

export type ThemeBackground = {
  type: ThemeBackgroundType;
  mediaUrl?: string; // URL firmada de site-media (PNG, JPG, WEBP, GIF, MP4, WebM)
  fit?: ThemeBackgroundFit; // Ajuste: Pantalla completa (cover), contenido (contain) o mosaico (repeat)
  overlayOpacity?: number; // 0 a 90% (velo para garantizar legibilidad de textos)
  overlayColor?: string; // Color del velo (ej: "#000000" para temas oscuros, "#ffffff" para claros)
};

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
  headingColor?: string;
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
  background?: ThemeBackground;
  buttonStyle: {
    animation: ThemeAnimation;
    globalRadius?: ThemeBorderRadius;
    visualStyle?: ThemeButtonStyle;
    mediaUrl?: string; // GIF, MP4, WebM, Lottie o Imagen
    mediaType?: "gif" | "video" | "image" | "lottie";
    mediaFit?: "cover" | "contain" | "fill";
    overlayOpacity?: number; // 0 a 85% velo de legibilidad en botones multimedia
    textColor?: string;
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
  snow: "Nieve en vivo",
  grid: "Cyber Grid",
  aurora: "Aurora Boreal",
};

export const THEME_BACKGROUND_TYPE_LABELS: Record<ThemeBackgroundType, string> = {
  solid: "Color sólido",
  image: "Imagen (PNG / JPG / WEBP)",
  gif: "GIF animado",
  video: "Video en bucle (MP4 / WebM)",
  pattern: "Textura / Patrón en mosaico",
};

export const THEME_BACKGROUND_FIT_LABELS: Record<ThemeBackgroundFit, string> = {
  cover: "Pantalla completa (Cover)",
  contain: "Contenido centrado (Contain)",
  repeat: "Mosaico repetido (Repeat)",
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

const VALID_BG_TYPES = new Set<ThemeBackgroundType>([
  "solid",
  "image",
  "gif",
  "video",
  "pattern",
]);

const VALID_BG_FITS = new Set<ThemeBackgroundFit>(["cover", "contain", "repeat"]);

export function clampAmbientIntensity(intensity?: number): number {
  if (typeof intensity !== "number" || !Number.isFinite(intensity)) return 55;
  return Math.max(10, Math.min(100, Math.round(intensity)));
}

export function clampOverlayOpacity(opacity?: number, fallback = 45): number {
  if (typeof opacity !== "number" || !Number.isFinite(opacity)) return fallback;
  return Math.max(0, Math.min(90, Math.round(opacity)));
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

  const rawBg = (theme.background ?? {}) as Partial<ThemeBackground>;
  const bgType: ThemeBackgroundType = VALID_BG_TYPES.has(rawBg.type as ThemeBackgroundType)
    ? (rawBg.type as ThemeBackgroundType)
    : "solid";
  const bgFit: ThemeBackgroundFit = VALID_BG_FITS.has(rawBg.fit as ThemeBackgroundFit)
    ? (rawBg.fit as ThemeBackgroundFit)
    : bgType === "pattern"
      ? "repeat"
      : "cover";

  return {
    ...theme,
    colors: ensureThemePalette(theme.colors || {}),
    background: {
      type: bgType,
      mediaUrl: typeof rawBg.mediaUrl === "string" ? rawBg.mediaUrl : "",
      fit: bgFit,
      overlayOpacity: clampOverlayOpacity(rawBg.overlayOpacity, bgType === "solid" ? 0 : 45),
      overlayColor:
        typeof rawBg.overlayColor === "string" && rawBg.overlayColor.trim()
          ? rawBg.overlayColor
          : "#000000",
    },
    buttonStyle: {
      ...rawBtn,
      animation,
      globalRadius,
      visualStyle,
      mediaFit:
        rawBtn.mediaFit === "contain" || rawBtn.mediaFit === "fill" || rawBtn.mediaFit === "cover"
          ? rawBtn.mediaFit
          : "cover",
      overlayOpacity:
        typeof rawBtn.overlayOpacity === "number" && Number.isFinite(rawBtn.overlayOpacity)
          ? Math.max(0, Math.min(85, Math.round(rawBtn.overlayOpacity)))
          : undefined,
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
    background: {
      type: "solid",
      mediaUrl: "",
      fit: "cover",
      overlayOpacity: 0,
      overlayColor: "#000000",
    },
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
    description: "Edición decembrina base personalizable: agrega tu propio video o imagen festiva y ajusta los textos.",
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
    background: {
      type: "solid",
      mediaUrl: "",
      fit: "cover",
      overlayOpacity: 0,
      overlayColor: "#000000",
    },
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
      headingColor: "#f8fafc",
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
    background: {
      type: "solid",
      mediaUrl: "",
      fit: "cover",
      overlayOpacity: 0,
      overlayColor: "#000000",
    },
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
    background: {
      type: "solid",
      mediaUrl: "",
      fit: "cover",
      overlayOpacity: 0,
      overlayColor: "#000000",
    },
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
  const c = normalized.colors;
  const primaryColor = c.primary || c.brandOrange;
  const primaryFg = c.primaryForeground || normalized.buttonStyle.textColor || "#ffffff";
  const secondaryColor = c.secondary || c.brandTeal;
  const secondaryFg = c.secondaryForeground || "#ffffff";
  const accentColor = c.accent || c.brandWine;
  const accentFg = c.accentForeground || "#ffffff";

  const rootVars: string[] = [
    `--background: ${c.background};`,
    `--brand-orange: ${c.brandOrange};`,
    `--brand-orange-deep: ${c.brandOrange};`,
    `--primary: ${primaryColor};`,
    `--primary-foreground: ${primaryFg};`,
    `--brand-teal: ${c.brandTeal};`,
    `--secondary: ${secondaryColor};`,
    `--secondary-foreground: ${secondaryFg};`,
    `--brand-wine: ${c.brandWine};`,
    `--accent: ${accentColor};`,
    `--accent-foreground: ${accentFg};`,
    `--radius: ${radiusToken.cssRadius};`,
    `--btn-radius: ${radiusToken.buttonRadius};`,
  ];

  c.palette.forEach((token) => {
    if (token?.id && token?.hex) {
      rootVars.push(`--theme-color-${token.id}: ${token.hex};`);
    }
  });

  if (c.foreground) rootVars.push(`--foreground: ${c.foreground};`);
  if (c.headingColor) rootVars.push(`--theme-heading-color: ${c.headingColor};`);
  if (c.muted) rootVars.push(`--muted: ${c.muted};`);
  if (c.mutedForeground) rootVars.push(`--muted-foreground: ${c.mutedForeground};`);
  if (c.card) rootVars.push(`--card: ${c.card};`);
  if (c.cardForeground) rootVars.push(`--card-foreground: ${c.cardForeground};`);
  if (c.border) rootVars.push(`--border: ${c.border};`);
  if (c.ring) rootVars.push(`--ring: ${c.ring};`);
  if (normalized.buttonStyle.textColor) {
    rootVars.push(`--theme-btn-text-color: ${normalized.buttonStyle.textColor};`);
  }

  const parts: string[] = [`:root { ${rootVars.join(" ")} }`];

  parts.push(
    `h1, h2, h3, h4, h5, h6, .theme-heading { color: var(--theme-heading-color, var(--foreground)); }`,
  );
  parts.push(
    `.btn-primary, .unified-theme-btn {\n  background-color: var(--primary);\n  color: var(--primary-foreground);\n  border-radius: var(--btn-radius, 9999px);\n}`,
  );
  if (normalized.buttonStyle.textColor) {
    parts.push(`.btn-primary, .unified-theme-btn { color: var(--theme-btn-text-color); }`);
  }
  parts.push(
    `.btn-outline {\n  background-color: transparent;\n  border-color: var(--secondary);\n  color: var(--secondary);\n  border-radius: var(--btn-radius, 9999px);\n}`,
  );

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
  root.dataset.themeBgType = normalized.background?.type ?? "solid";

  const optionalVarPairs: Array<[string, string | undefined]> = [
    ["--foreground", c.foreground],
    ["--theme-heading-color", c.headingColor],
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
    ["--theme-btn-text-color", normalized.buttonStyle.textColor],
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
