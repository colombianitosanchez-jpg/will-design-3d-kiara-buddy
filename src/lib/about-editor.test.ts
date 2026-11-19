import { describe, expect, it } from "vitest";
import { ABOUT_BLOCKS, getAboutBlocksSummary, getAboutBlockStatus } from "./about-editor";

describe("about-editor metadata y resumen de estado", () => {
  it("define exactamente los 7 bloques temáticos y conserva todas las claves requeridas", () => {
    expect(ABOUT_BLOCKS.map((b) => b.id)).toEqual([
      "story",
      "stats",
      "mission",
      "vision",
      "values",
      "kiara",
      "workshop",
    ]);

    const allFieldKeys = ABOUT_BLOCKS.flatMap((b) => b.fieldKeys);
    expect(allFieldKeys).toEqual([
      "about_chip",
      "about_title",
      "about_subtitle",
      "about_short",
      "about_long",
      "about_image_url",
      "about_buttons",
      "about_stats",
      "about_mission_title",
      "about_mission_text",
      "about_mission_image_url",
      "about_mission_cta_text",
      "about_vision_title",
      "about_vision_text",
      "about_vision_image_url",
      "about_vision_cta_text",
      "about_values_title",
      "about_values_text",
      "about_values_items",
      "about_values_image_url",
      "about_values_cta_text",
      "about_kiara_title",
      "about_kiara_subtitle",
      "about_kiara_text",
      "about_kiara_image_url",
      "about_kiara_cta_text",
      "about_workshop_title",
      "about_workshop_text",
      "about_workshop_items",
      "about_workshop_image_url",
      "about_workshop_address",
      "about_workshop_cta_text",
    ]);
  });

  it("marca todos los bloques como predeterminados cuando site_content está vacío o solo tiene espacios", () => {
    const summary = getAboutBlocksSummary({
      about_title: "   ",
      about_buttons: "[]",
      about_stats: "[]",
      about_values_items: "",
      about_workshop_items: "invalid-json",
    });

    expect(summary.totalCount).toBe(7);
    expect(summary.customizedCount).toBe(0);
    expect(summary.blocks.every((b) => !b.isCustomized)).toBe(true);
  });

  it("detecta bloques personalizados por campos de texto/multimedia, botones CTA y colecciones", () => {
    const summary = getAboutBlocksSummary({
      about_buttons: JSON.stringify([{ id: "b1", text: "Ver más", action_type: "link" }]),
      about_stats: JSON.stringify([{ id: "a1", k: "50x50", v: "cm" }]),
      about_mission_cta_whatsapp_message: "Hola misión",
      about_values_cta_text: "Consultar valores",
      about_kiara_cta_whatsapp_message: "Hola Kiara",
      about_workshop_cta_url: "/cotizador",
    });

    expect(summary.customizedCount).toBe(6);
    const byId = Object.fromEntries(summary.blocks.map((b) => [b.id, b]));
    expect(byId.story.isCustomized).toBe(true);
    expect(byId.stats.isCustomized).toBe(true);
    expect(byId.stats.itemCount).toBe(1);
    expect(byId.mission.isCustomized).toBe(true);
    expect(byId.vision.isCustomized).toBe(false);
    expect(byId.values.isCustomized).toBe(true);
    expect(byId.kiara.isCustomized).toBe(true);
    expect(byId.workshop.isCustomized).toBe(true);
  });

  it("ignora ítems vacíos dentro de colecciones para el estado de personalización", () => {
    const statsBlock = ABOUT_BLOCKS.find((b) => b.id === "stats")!;
    const status = getAboutBlockStatus(statsBlock, {
      about_stats: JSON.stringify([{ id: "empty_1", k: "", v: "   " }]),
    });

    expect(status.isCustomized).toBe(false);
    expect(status.itemCount).toBe(0);
  });
});
