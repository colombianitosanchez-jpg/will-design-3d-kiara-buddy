import { describe, it, expect } from "vitest";
import { parseHeroButtons, type HeroButtonItem } from "./hero-buttons";

describe("Hero Buttons Parser and Normalizer", () => {
  it("debe retornar el botón por defecto si no hay configuración ni claves legadas con texto", () => {
    const buttons = parseHeroButtons({});
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toEqual({
      id: "hero_primary",
      text: "Cotizar Proyecto",
      action_type: "cotizador",
      action_value: "/cotizador",
      custom_hex: "var(--brand-orange)",
    });
  });

  it("debe migrar transparentemente el botón principal legado hero_cta_*", () => {
    const buttons = parseHeroButtons({
      hero_cta_text: "Mi Botón Principal",
      hero_cta_url: "https://ejemplo.com",
      hero_cta_action_type: "link",
      hero_cta_whatsapp_message: "Mensaje WA",
      hero_cta_whatsapp_image_url: "https://ejemplo.com/foto.jpg",
      hero_cta_whatsapp_image_logic: "custom",
      hero_cta_text_color: "#ffffff",
      hero_cta_custom_hex: "#ff5500",
      hero_cta_shade: "60",
      hero_cta_media_url: "https://ejemplo.com/bg.mp4",
      hero_cta_media_mode: "fill",
      hero_cta_media_fit: "cover",
      hero_cta_icon_url: "https://ejemplo.com/icon.png",
      hero_cta_icon_position: "left",
      hero_cta_icon_shape: "hexagon",
      hero_cta_width: "full",
    });

    expect(buttons).toHaveLength(1);
    const primary = buttons[0];
    expect(primary.id).toBe("hero_primary");
    expect(primary.text).toBe("Mi Botón Principal");
    expect(primary.action_type).toBe("link");
    expect(primary.action_value).toBe("https://ejemplo.com");
    expect(primary.whatsapp_message).toBe("Mensaje WA");
    expect(primary.whatsapp_image_url).toBe("https://ejemplo.com/foto.jpg");
    expect(primary.whatsapp_image_logic).toBe("custom");
    expect(primary.text_color).toBe("#ffffff");
    expect(primary.custom_hex).toBe("#ff5500");
    expect(primary.shade).toBe(60);
    expect(primary.media_url).toBe("https://ejemplo.com/bg.mp4");
    expect(primary.media_mode).toBe("fill");
    expect(primary.media_fit).toBe("cover");
    expect(primary.icon_url).toBe("https://ejemplo.com/icon.png");
    expect(primary.icon_position).toBe("left");
    expect(primary.icon_shape).toBe("hexagon");
    expect(primary.width).toBe("full");
  });

  it("debe migrar botón secundario cuando existe hero_secondary_cta_text o url", () => {
    const buttons = parseHeroButtons({
      hero_cta_text: "Cotizar",
      hero_cta_url: "/cotizador",
      hero_secondary_cta_text: "Ver Tienda",
      hero_secondary_cta_url: "/tienda",
      hero_secondary_cta_action_type: "link",
      hero_secondary_cta_custom_hex: "#990000",
    });

    expect(buttons).toHaveLength(2);
    expect(buttons[0].id).toBe("hero_primary");
    expect(buttons[0].text).toBe("Cotizar");
    expect(buttons[1].id).toBe("hero_secondary");
    expect(buttons[1].text).toBe("Ver Tienda");
    expect(buttons[1].action_value).toBe("/tienda");
    expect(buttons[1].custom_hex).toBe("#990000");
  });

  it("debe respetar el orden 'secondary,primary' para los botones legados", () => {
    const buttons = parseHeroButtons({
      hero_cta_text: "Cotizar",
      hero_cta_url: "/cotizador",
      hero_secondary_cta_text: "Ver Tienda",
      hero_secondary_cta_url: "/tienda",
      hero_buttons_order: "secondary,primary",
    });

    expect(buttons).toHaveLength(2);
    expect(buttons[0].id).toBe("hero_secondary");
    expect(buttons[0].text).toBe("Ver Tienda");
    expect(buttons[1].id).toBe("hero_primary");
    expect(buttons[1].text).toBe("Cotizar");
  });

  it("debe leer correctamente el JSON array hero_buttons cuando está presente", () => {
    const heroButtonsJson: HeroButtonItem[] = [
      {
        id: "hero_btn_1",
        text: "Botón Uno",
        action_type: "whatsapp",
        action_value: "573001234567",
        whatsapp_message: "Hola botón 1",
        whatsapp_image_url: "https://ejemplo.com/b1.jpg",
        whatsapp_image_logic: "auto",
        width: "auto",
      },
      {
        id: "hero_btn_2",
        text: "Botón Dos",
        action_type: "cotizador",
        action_value: "/cotizador",
        custom_hex: "#10b981",
        width: "full",
      },
      {
        id: "hero_btn_3",
        text: "Botón Tres",
        action_type: "link",
        action_value: "/nosotros",
      },
    ];

    const buttons = parseHeroButtons({
      hero_buttons: JSON.stringify(heroButtonsJson),
      // Claves legadas ignoradas si hero_buttons tiene elementos válidos
      hero_cta_text: "Texto Legado",
    });

    expect(buttons).toHaveLength(3);
    expect(buttons[0].id).toBe("hero_btn_1");
    expect(buttons[0].text).toBe("Botón Uno");
    expect(buttons[0].action_type).toBe("whatsapp");
    expect(buttons[0].whatsapp_image_url).toBe("https://ejemplo.com/b1.jpg");

    expect(buttons[1].id).toBe("hero_btn_2");
    expect(buttons[1].text).toBe("Botón Dos");
    expect(buttons[1].action_type).toBe("cotizador");
    expect(buttons[1].custom_hex).toBe("#10b981");
    expect(buttons[1].width).toBe("full");

    expect(buttons[2].id).toBe("hero_btn_3");
    expect(buttons[2].text).toBe("Botón Tres");
    expect(buttons[2].action_type).toBe("link");
    expect(buttons[2].action_value).toBe("/nosotros");
  });

  it("debe manejar JSON malformado o vacío cayendo en claves legadas", () => {
    const buttonsFromMalformed = parseHeroButtons({
      hero_buttons: "{ broken json: [",
      hero_cta_text: "Botón Legado Válido",
    });
    expect(buttonsFromMalformed).toHaveLength(1);
    expect(buttonsFromMalformed[0].id).toBe("hero_primary");
    expect(buttonsFromMalformed[0].text).toBe("Botón Legado Válido");

    const buttonsFromEmptyArray = parseHeroButtons({
      hero_buttons: "[]",
      hero_cta_text: "Botón Fallback",
    });
    expect(buttonsFromEmptyArray).toHaveLength(1);
    expect(buttonsFromEmptyArray[0].id).toBe("hero_primary");
    expect(buttonsFromEmptyArray[0].text).toBe("Botón Fallback");
  });

  it("debe sanitizar propiedades inválidas en hero_buttons JSON", () => {
    const rawButtons = [
      {
        id: "",
        text: "Botón Sanitizado",
        action_type: "invalid_action",
        media_mode: "invalid_mode",
        media_fit: "invalid_fit",
        icon_position: "invalid_pos",
        width: "invalid_width",
      },
    ];

    const buttons = parseHeroButtons({
      hero_buttons: JSON.stringify(rawButtons),
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0].id).toBe("hero_btn_1"); // Genera ID seguro si está vacío
    expect(buttons[0].action_type).toBe("link"); // Fallback seguro a link
    expect(buttons[0].media_mode).toBeUndefined();
    expect(buttons[0].media_fit).toBeUndefined();
    expect(buttons[0].icon_position).toBeUndefined();
    expect(buttons[0].width).toBeUndefined();
  });
});
