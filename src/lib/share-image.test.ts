import { describe, expect, it } from "vitest";
import { firstStaticShareImage } from "./share-image";
import { getSeo, buildSeoFromContent } from "./seo";
import { buildButtonWhatsappText } from "./product-buttons";

describe("static share images", () => {
  it("standalone button with GIF produces plain text rather than an unusable media link", () => {
    expect(buildButtonWhatsappText({ whatsapp_message: "Consulta {media}", whatsapp_image_url: "https://example.com/button.gif" }, { name: "PLA" })).toBe("Consulta");
  });
  it.each(["gif", "GIF", "jfif", "JFIF", "mp4", "webm", "mov", "m4v", "ogv", "avi", "mkv"])("skips %s covers including query and fragment", (ext) => {
    expect(firstStaticShareImage([` https://example.com/cover.${ext}?download=1#media `, "https://example.com/second.jpg"])).toBe("https://example.com/second.jpg");
  });
  it("detects encoded GIF filenames without treating query values as extensions", () => {
    expect(firstStaticShareImage(["https://example.com/cover%2Egif", "https://example.com/photo.png?label=cover.gif"])).toBe("https://example.com/photo.png?label=cover.gif");
  });
  it("does not invent an image when every candidate is animated or absent", () => {
    expect(firstStaticShareImage([null, " ", "https://example.com/cover.gif", "https://example.com/clip.mp4"])).toBe("");
  });
  it("page metadata falls back to a static global image", () => {
    expect(getSeo({ image: "https://example.com/cover.gif" }, { site_meta_thumbnail_url: "https://example.com/share.jpg" }).image).toBe("https://example.com/share.jpg");
  });
  it("product metadata uses the second photo after an animated cover", () => {
    expect(buildSeoFromContent("producto", {}, { image_url: "https://example.com/cover.gif", images: ["https://example.com/clip.mp4", "https://example.com/second.jpg"] }).image).toBe("https://example.com/second.jpg");
  });
});