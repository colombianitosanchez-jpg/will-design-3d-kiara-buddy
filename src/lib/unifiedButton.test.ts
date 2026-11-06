import { describe, expect, it } from "vitest";
import { getBestAccessibility, getHexLuminance, productButtonToUnified } from "./unifiedButton";
import { newProductButton, duplicateProductButton } from "./product-buttons";

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
