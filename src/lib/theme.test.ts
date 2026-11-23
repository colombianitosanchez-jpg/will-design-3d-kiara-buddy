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
    expect(css).toContain("--background: #09090b;");
    expect(css).toContain("--brand-orange: #f59e0b;");
    expect(css).toContain("--brand-orange-deep: #f59e0b;");
    expect(css).toContain("--primary: #f59e0b;");
    expect(css).toContain("--primary-foreground: #09090b;");
    expect(css).toContain("--brand-teal: #10b981;");
    expect(css).toContain("--secondary: #10b981;");
    expect(css).toContain("--secondary-foreground: #ffffff;");
    expect(css).toContain("--brand-wine: #111827;");
    expect(css).toContain("--accent: #111827;");
    expect(css).toContain("--accent-foreground: #ffffff;");
    expect(css).toContain("--theme-color-brandOrange: #f59e0b;");
    expect(css).toContain("--foreground: #fafafa;");
    expect(css).toContain("--theme-heading-color: #fde68a;");
    expect(css).toContain("--muted-foreground: #a1a1aa;");
    expect(css).toContain("--card: #18181b;");
    expect(css).toContain("--theme-btn-text-color: #ffffff;");
    expect(css).toContain("h1, h2, h3, h4, h5, h6, .theme-heading { color: var(--theme-heading-color, var(--foreground)); }");
    expect(css).toContain("background-color: var(--primary);");
    expect(css).toContain("border-color: var(--secondary);");
  });

  it("inyecta CSS activo en head() de __root y precarga video/imagen de fondo", async () => {
    const { Route: RootRoute } = await import("@/routes/__root");
    type RootHeadFn = (ctx: { loaderData: { siteContent: Record<string, string> } }) => {
      links: Array<Record<string, unknown>>;
      styles?: Array<{ id?: string; children?: string }>;
    };

    const videoThemeContent = {
      active_theme_id: "custom_video",
      custom_themes: JSON.stringify([
        {
          id: "custom_video",
          name: "Video SSR",
          description: "Fondo en video",
          colors: {
            brandOrange: "#e11d48",
            brandTeal: "#0ea5e9",
            brandWine: "#312e81",
            background: "#020617",
          },
          background: {
            type: "video",
            mediaUrl: "https://cdn.example.com/hero.mp4",
          },
          buttonStyle: { animation: "none" },
        },
      ]),
    };

    const videoHead = (RootRoute.options.head as unknown as RootHeadFn)({
      loaderData: { siteContent: videoThemeContent },
    });
    expect(videoHead.styles).toHaveLength(1);
    expect(videoHead.styles?.[0].id).toBe("active-theme-custom-css");
    expect(videoHead.styles?.[0].children).toContain("--background: #020617;");
    expect(videoHead.styles?.[0].children).toContain("--primary: #e11d48;");
    expect(videoHead.links).toContainEqual({
      rel: "preload",
      as: "video",
      href: "https://cdn.example.com/hero.mp4",
      type: "video/mp4",
    });

    const imageThemeContent = {
      active_theme_id: "custom_img",
      custom_themes: JSON.stringify([
        {
          id: "custom_img",
          name: "Imagen SSR",
          description: "Fondo en imagen",
          colors: { background: "#111827" },
          background: {
            type: "image",
            mediaUrl: "https://cdn.example.com/bg.webp",
          },
          buttonStyle: { animation: "none" },
        },
      ]),
    };

    const imageHead = (RootRoute.options.head as unknown as RootHeadFn)({
      loaderData: { siteContent: imageThemeContent },
    });
    expect(imageHead.links).toContainEqual({
      rel: "preload",
      as: "image",
      href: "https://cdn.example.com/bg.webp",
      fetchPriority: "high",
    });
  }, 15000);

  it("AmbientBackdrop renderiza multimedia y efectos CSS en SSR sin bloquear, difiriendo solo SnowCanvas", async () => {
    const { renderToString } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { AmbientBackdrop } = await import("@/components/AmbientBackdrop");

    const videoGridHtml = renderToString(
      createElement(AmbientBackdrop, {
        background: {
          type: "video",
          mediaUrl: "https://cdn.example.com/loop.mp4",
          fit: "cover",
          overlayOpacity: 40,
          overlayColor: "#000000",
        },
        effect: "grid",
        intensity: 60,
      }),
    );
    expect(videoGridHtml).toContain("<video");
    expect(videoGridHtml).toContain('preload="auto"');
    expect(videoGridHtml).toContain("ambient-grid");
    expect(videoGridHtml).not.toContain("<canvas");

    const snowHtml = renderToString(
      createElement(AmbientBackdrop, {
        effect: "snow",
        intensity: 65,
      }),
    );
    expect(snowHtml).not.toContain("<canvas");
  });
});
