import { describe, expect, it } from "vitest";
import {
  PRESET_THEMES,
  buildThemeGlobalCss,
  clampAmbientIntensity,
  clampOverlayOpacity,
  getActiveTheme,
  normalizeTheme,
  resolveThemes,
} from "./theme";

describe("Sistema de Temas Vivos", () => {
  it("incluye el preset oficial de Navidad & Fin de Año con nieve y destello festivo", () => {
    const xmas = PRESET_THEMES.find((t) => t.id === "christmas_new_year");
    expect(xmas).toBeDefined();
    expect(xmas?.name).toContain("Navidad");
    expect(xmas?.ambient?.effect).toBe("snow");
    expect(xmas?.buttonStyle.animation).toBe("festive_sparkle");
    expect(xmas?.buttonStyle.globalRadius).toBe("round");
  });

  it("normaliza temas personalizados legados sin perder compatibilidad", () => {
    const legacyCustomJson = JSON.stringify([
      {
        id: "custom_legacy",
        name: "Mi Tema",
        description: "Tema guardado previamente",
        colors: { brandOrange: "#112233" },
        buttonStyle: { animation: "shimmer" },
      },
    ]);

    const themes = resolveThemes(legacyCustomJson);
    const legacy = themes.find((t) => t.id === "custom_legacy");
    expect(legacy).toBeDefined();
    expect(legacy?.buttonStyle.globalRadius).toBe("default");
    expect(legacy?.buttonStyle.visualStyle).toBe("solid");
    expect(legacy?.ambient?.effect).toBe("none");
    expect(legacy?.ambient?.intensity).toBe(55);
    expect(legacy?.background?.type).toBe("solid");
    expect(legacy?.background?.overlayOpacity).toBe(0);
  });

  it("buildThemeGlobalCss aplica el radio global --radius y --btn-radius", () => {
    const active = getActiveTheme({
      active_theme_id: "custom_glass",
      custom_themes: JSON.stringify([
        {
          id: "custom_glass",
          name: "Vidrio Neón",
          description: "Prueba",
          colors: { brandOrange: "#ff5500" },
          buttonStyle: {
            animation: "neon_glow",
            globalRadius: "square",
            visualStyle: "glass",
          },
          ambient: { effect: "aurora", intensity: 200 },
        },
      ]),
    });

    expect(active.ambient?.intensity).toBe(100);
    expect(clampAmbientIntensity(2)).toBe(10);
    const css = buildThemeGlobalCss(active);
    expect(css).toContain("--radius: 0px;");
    expect(css).toContain("--btn-radius: 0px;");
  });

  it("soporta fondo multimedia libre con velo de legibilidad y control total de textos", () => {
    expect(clampOverlayOpacity(120)).toBe(90);
    expect(clampOverlayOpacity(-5)).toBe(0);

    const custom = normalizeTheme({
      id: "custom_black_friday",
      name: "Black Friday Video",
      description: "Tema libre con video y textos dorados",
      colors: {
        palette: [{ id: "brandOrange", name: "Dorado", hex: "#f59e0b" }],
        brandOrange: "#f59e0b",
        brandTeal: "#10b981",
        brandWine: "#111827",
        background: "#09090b",
        foreground: "#fafafa",
        headingColor: "#fde68a",
        mutedForeground: "#a1a1aa",
        card: "#18181b",
        cardForeground: "#f4f4f5",
        primaryForeground: "#09090b",
      },
      background: {
        type: "video",
        mediaUrl: "https://cdn.example.com/bf-loop.mp4",
        fit: "cover",
        overlayOpacity: 95,
        overlayColor: "#000000",
      },
      buttonStyle: {
        animation: "none",
        globalRadius: "soft",
        visualStyle: "solid",
        mediaUrl: "https://cdn.example.com/btn-spark.gif",
        mediaType: "gif",
        mediaFit: "cover",
        overlayOpacity: 40,
        textColor: "#ffffff",
      },
    });

    expect(custom.background?.type).toBe("video");
    expect(custom.background?.overlayOpacity).toBe(90);
    expect(custom.background?.overlayColor).toBe("#000000");
    expect(custom.buttonStyle.mediaUrl).toBe("https://cdn.example.com/btn-spark.gif");

    const css = buildThemeGlobalCss(custom);
    expect(css).toContain("--foreground: #fafafa;");
    expect(css).toContain("--theme-heading-color: #fde68a;");
    expect(css).toContain("--muted-foreground: #a1a1aa;");
    expect(css).toContain("--card: #18181b;");
    expect(css).toContain("--theme-btn-text-color: #ffffff;");
  });
});
