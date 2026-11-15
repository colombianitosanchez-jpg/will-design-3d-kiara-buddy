import { describe, expect, test } from "vitest";
import { resolveStatShareImage } from "./stat-share-image";

describe("independent shared images", () => {
  test("una estadística con GIF no toma la foto de otra colección", () => {
    expect(resolveStatShareImage("s1", { hero_stats: JSON.stringify([{ whatsapp_image_url: "https://example.com/stat.gif" }]), about_stats: JSON.stringify([{ whatsapp_image_url: "https://example.com/about.jpg" }]) })).toBe("");
  });
  const content = {
    hero_stats: JSON.stringify([{ id: "stat_1", k: "", whatsapp_image_url: "" }, { id: "stat_2", k: "Hero", whatsapp_image_url: "https://example.com/hero.jpg" }]),
    about_stats: JSON.stringify([{ id: "stat_2", k: "About", whatsapp_image_url: "https://example.com/about.jpg" }]),
    about_values_items: JSON.stringify([{ id: "stat_2", whatsapp_image_url: "https://example.com/values.jpg" }]),
    about_workshop_items: JSON.stringify([{ id: "stat_2", whatsapp_image_url: "https://example.com/workshop.jpg" }]),
  };
  test("same IDs in different sections never collide", () => {
    expect(resolveStatShareImage("stat_2", content)).toBe("https://example.com/hero.jpg");
    expect(resolveStatShareImage("a1", content)).toBe("https://example.com/about.jpg");
    expect(resolveStatShareImage("v1", content)).toBe("https://example.com/values.jpg");
    expect(resolveStatShareImage("t1", content)).toBe("https://example.com/workshop.jpg");
  });
  test("empty or missing positions do not borrow another image", () => {
    expect(resolveStatShareImage("s1", content)).toBe("");
    expect(resolveStatShareImage("s2", content)).toBe("https://example.com/hero.jpg");
    expect(resolveStatShareImage("s3", content)).toBe("");
    expect(resolveStatShareImage("stat_2", { ...content, hero_stats: "[]" })).toBe("");
  });
});