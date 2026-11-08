import { describe, expect, test } from "vitest";
import { contrastText, accentPalette } from "./hero-stats";
import { getWhatsAppPayloadForButton } from "./whatsapp-buttons";

describe("estadísticas del hero", () => {
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
        whatsapp_image_key: "stat_123",
      },
      "",
      ""
    );
    expect(p.formattedText).toBe("Me interesa PLA\n\nhttps://will-design-3d.lovable.app/ref?k=stat_123");
  });
});
