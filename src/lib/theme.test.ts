import { describe, expect, it } from "vitest";
import {
  PRESET_THEMES,
  buildThemeGlobalCss,
  clampAmbientIntensity,
  getActiveTheme,
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
});
