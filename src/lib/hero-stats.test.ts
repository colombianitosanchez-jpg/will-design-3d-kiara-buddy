import { describe, expect, test } from "vitest";
import { contrastText, accentPalette, parseHeroStats, parseStatItems, statShareKey } from "./hero-stats";
import { getWhatsAppPayloadForButton } from "./whatsapp-buttons";

describe("estadísticas del hero", () => {
  test("borrar todas las estadísticas no resucita claves antiguas", () => {
    expect(parseHeroStats({ hero_stats: "[]", hero_stat_1_k: "Idea", hero_stat_1_v: "En grande" })).toEqual([]);
  });
  test("Nosotros vacío nunca hereda métricas del Hero", () => {
    expect(parseStatItems("")).toEqual([]);
    expect(parseStatItems("[]")).toEqual([]);
    expect(parseHeroStats({})).toEqual([]);
  });
  test("conserva métricas antiguas solo si no existe colección moderna", () => {
    expect(parseHeroStats({ hero_stat_1_k: "Idea" }).map(s => s.k)).toEqual(["Idea"]);
    expect(parseHeroStats({ hero_stats: "{invalid", hero_stat_1_k: "Idea" })).toEqual([]);
  });
  test("cada colección tiene su propio enlace aunque comparta posición", () => {
    expect([statShareKey("hero_stats", 0), statShareKey("about_stats", 0), statShareKey("about_values_items", 0), statShareKey("about_workshop_items", 0)]).toEqual(["s1", "a1", "v1", "t1"]);
  });
  test("descarta entradas malformadas sin perder elementos válidos", () => {
    expect(parseStatItems('[null,12,{"id":"ok","k":"Real"}]').map(s => s.k)).toEqual(["Real"]);
  });
  test("texto automático: negro sobre fondo claro, blanco sobre oscuro", () => {
    expect(contrastText("#ffffff")).toBe("#111111");
    expect(contrastText("#881337")).toBe("#ffffff");
  });

  test("la paleta rápida no incluye el fondo de página", () => {
    const p = accentPalette([{ id: "brandOrange" }, { id: "background" }]);
    expect(p.map((x) => x.id)).toEqual(["brandOrange"]);
  });

  test("WhatsApp de una estadística con foto usa enlace corto, nunca la URL larga", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Me interesa PLA",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/sign/site-media/a.jpg?token=abc",
        whatsapp_image_key: "s1",
      },
      "",
      ""
    );
    expect(p.formattedText).toBe("Me interesa PLA\n\nhttps://will-design-3d.lovable.app/r/s1");
  });

  test("WhatsApp de una estadística con ID directo de estadística usa /r/stat_id", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Me interesa PLA",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/sign/site-media/a.jpg?token=abc",
        whatsapp_image_key: "stat_123",
      },
      "",
      ""
    );
    expect(p.formattedText).toBe("Me interesa PLA\n\nhttps://will-design-3d.lovable.app/r/stat_123");
  });

  test("parseHeroStats normaliza animation_style cuando type es solid o tiene custom_hex", () => {
    const rawData = {
      hero_stats: JSON.stringify([
        {
          id: "stat_1",
          k: "50×50",
          v: "cm",
          custom_hex: "#15F95A",
          text_color: "#1E2BDC",
          type: "solid",
          animation_style: "shimmer",
        },
        {
          id: "stat_2",
          k: "1.8 m",
          v: "pieza",
          type: "imageFill",
          media_url: "https://example.com/video.mp4",
          animation_style: "shimmer",
        },
      ]),
    };

    const stats = import("./hero-stats").then((m) => {
      const parsed = m.parseHeroStats(rawData);
      expect(parsed[0].animation_style).toBe("none");
      expect(parsed[0].custom_hex).toBe("#15F95A");
      expect(parsed[0].text_color).toBe("#1E2BDC");
      expect(parsed[1].animation_style).toBe("shimmer");
    });
    return stats;
  });

  test("eliminar media_url o icon_url respeta string vacío y no revive bgImageUrl residual", async () => {
    const rawData = {
      hero_stats: JSON.stringify([
        {
          id: "stat_1",
          k: "50×50",
          v: "cm",
          media_url: "",
          bgImageUrl: "https://example.com/old-bg.jpg",
          icon_url: "",
          icon_position: "left",
        },
      ]),
    };

    const parsed = parseHeroStats(rawData);
    expect(parsed[0].media_url).toBe("");
    expect(parsed[0].icon_url).toBe("");
  });
});
