import { describe, expect, it } from "vitest";
import { getBestAccessibility, getHexLuminance, productButtonToUnified } from "./unifiedButton";
import { newProductButton, duplicateProductButton, parseProductButtons, BUTTON_ICON_SHAPES } from "./product-buttons";
import { getIconShapeStyle } from "@/components/UnifiedButton";

describe("unifiedButton accessibility engine", () => {
  it("calculates luminance correctly for hex colors", () => {
    expect(getHexLuminance("#ffffff")).toBeGreaterThan(0.9);
    expect(getHexLuminance("#000000")).toBeLessThan(0.1);
  });

  it("enforces minimum 45% overlay opacity on live fill buttons", () => {
    const resLow = getBestAccessibility(
      { type: "videoFill", bgImageUrl: "https://example.com/video.mp4", overlayOpacity: 20 },
      "Comprar Ahora",
    );
    expect(resLow.overlayOpacity).toBe(45);

    const resHigh = getBestAccessibility(
      { type: "imageFill", bgImageUrl: "https://example.com/img.jpg", overlayOpacity: 60 },
      "Comprar Ahora",
    );
    expect(resHigh.overlayOpacity).toBe(60);
  });

  it("applies 44px tap target and text shadow for live buttons", () => {
    const res = getBestAccessibility(
      { type: "videoFill", bgImageUrl: "https://example.com/video.mp4" },
      "Cotizar en WhatsApp",
      "whatsapp",
    );
    expect(res.textColor).toBe("#ffffff");
    expect(res.tapTargetClass).toContain("min-h-[44px]");
    expect(res.tapTargetClass).toContain("min-w-[44px]");
    expect(res.textShadowClass).toContain("drop-shadow");
  });

  it("converts product button with circular icon, background fill and custom text color", () => {
    const btn = newProductButton();
    btn.media_url = "https://example.com/live-bg.mp4";
    btn.media_mode = "fill";
    btn.icon_url = "https://example.com/logo.png";
    btn.icon_position = "left";
    btn.text_color = "#fef08a";

    const style = productButtonToUnified(btn);
    expect(style.type).toBe("videoFill");
    expect(style.bgImageUrl).toBe("https://example.com/live-bg.mp4");
    expect(style.iconPosition).toBe("left");
    expect(style.iconUrl).toBe("https://example.com/logo.png");
    expect(style.textColor).toBe("#fef08a");
  });

  it("duplicates product button with unique id and suffix", () => {
    const original = newProductButton();
    original.text = "Cotizar Ahora";
    original.action_type = "whatsapp";
    original.media_url = "https://example.com/video.mp4";

    const copy = duplicateProductButton(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.text).toBe("Cotizar Ahora (Copia)");
    expect(copy.action_type).toBe("whatsapp");
    expect(copy.media_url).toBe("https://example.com/video.mp4");
  });
});

describe("color y sombreado elegidos en el panel", () => {
  it("respeta el color de texto configurado aunque haya fondo animado", () => {
    const res = getBestAccessibility({ type: "videoFill", bgImageUrl: "https://e.com/v.mp4", textColor: "#fbbf24" });
    expect(res.textColor).toBe("#fbbf24");
  });
  it("usa el sombreado exacto del panel, incluido 0%", () => {
    expect(getBestAccessibility({ type: "videoFill", bgImageUrl: "https://e.com/v.mp4", shade: 0 }).overlayOpacity).toBe(0);
    expect(getBestAccessibility({ type: "solid", shade: 30 }).overlayOpacity).toBe(30);
  });
});

import { getBestAccessibility as gba2 } from "./unifiedButton";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("texto sobre color de marca", () => {
  i2("usa blanco cuando el fondo es var(--brand-*)", () => {
    e2(gba2({ background: "var(--brand-wine)" }).textColor).toBe("#ffffff");
  });
  i2("respeta color del panel aunque haya fondo vivo", () => {
    e2(gba2({ bgImageUrl: "x.mp4", textColor: "#ff0000" }).textColor).toBe("#ff0000");
  });
});

describe("getIconShapeStyle geometric shapes catalog", () => {
  it("contiene las 9 figuras geométricas requeridas", () => {
    expect(BUTTON_ICON_SHAPES).toEqual([
      "circle",
      "square",
      "rounded",
      "hexagon",
      "diamond",
      "star",
      "shield",
      "octagon",
      "original",
    ]);
  });

  it("recorta hexagon con clip-path nítido y object-cover", () => {
    const res = getIconShapeStyle("hexagon");
    expect(res.className).toContain("object-cover");
    expect(res.style?.clipPath).toContain("polygon");
    expect(res.style?.clipPath).toContain("100% 25%");
  });

  it("recorta diamond con clip-path nítido y object-cover", () => {
    const res = getIconShapeStyle("diamond");
    expect(res.className).toContain("object-cover");
    expect(res.style?.clipPath).toContain("50% 0%");
    expect(res.style?.clipPath).toContain("100% 50%");
  });

  it("recorta star con clip-path nítido y object-cover", () => {
    const res = getIconShapeStyle("star");
    expect(res.className).toContain("object-cover");
    expect(res.style?.clipPath).toContain("98% 35%");
  });

  it("recorta shield con clip-path nítido y object-cover", () => {
    const res = getIconShapeStyle("shield");
    expect(res.className).toContain("object-cover");
    expect(res.style?.clipPath).toContain("100% 15%");
  });

  it("recorta octagon con clip-path nítido y object-cover", () => {
    const res = getIconShapeStyle("octagon");
    expect(res.className).toContain("object-cover");
    expect(res.style?.clipPath).toContain("30% 0%");
  });

  it("aplica clases estándar para square, rounded, circle y original", () => {
    expect(getIconShapeStyle("circle").className).toBe("rounded-full object-cover");
    expect(getIconShapeStyle("square").className).toBe("rounded-none object-cover");
    expect(getIconShapeStyle("rounded").className).toBe("rounded-md object-cover");
    expect(getIconShapeStyle("original").className).toBe("object-contain");
  });

  it("parseProductButtons preserva icon_shape geométrico", () => {
    const parsed = parseProductButtons([
      { text: "Hex Button", icon_shape: "hexagon" },
      { text: "Star Button", icon_shape: "star" },
    ]);
    expect(parsed[0].icon_shape).toBe("hexagon");
    expect(parsed[1].icon_shape).toBe("star");
  });
});
