import { describe, expect, it } from "bun:test";
import { getBestAccessibility, getHexLuminance } from "./unifiedButton";

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
});
