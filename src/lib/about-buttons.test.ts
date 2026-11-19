import { describe, it, expect } from "vitest";
import { parseAboutButtons, type AboutButtonItem } from "./about-buttons";

describe("About Buttons Parser and Normalizer", () => {
  it("debe retornar el botón por defecto si no hay configuración ni claves legadas", () => {
    const buttons = parseAboutButtons({});
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toEqual({
      id: "about_primary",
      text: "Conoce más sobre nosotros",
      action_type: "link",
      action_value: "/nosotros",
      media_fit: "cover",
    });
  });

  it("debe migrar transparentemente el botón legado about_cta_*", () => {
    const buttons = parseAboutButtons({
      about_cta_text: "Ver nuestro taller",
      about_cta_url: "https://ejemplo.com/taller",
      about_cta_action_type: "link",
      about_cta_whatsapp_message: "Hola taller",
      about_cta_whatsapp_image_url: "https://ejemplo.com/taller.jpg",
      about_cta_whatsapp_image_logic: "custom",
      about_cta_text_color: "#ffffff",
      about_cta_custom_hex: "#0d9488",
      about_cta_shade: "40",
      about_cta_media_url: "https://ejemplo.com/bg.mp4",
      about_cta_media_mode: "fill",
      about_cta_media_fit: "contain",
      about_cta_icon_url: "https://ejemplo.com/icon.png",
      about_cta_icon_position: "left",
      about_cta_icon_shape: "hexagon",
      about_cta_width: "full",
    });

    expect(buttons).toHaveLength(1);
    const primary = buttons[0];
    expect(primary.id).toBe("about_primary");
    expect(primary.text).toBe("Ver nuestro taller");
    expect(primary.action_type).toBe("link");
    expect(primary.action_value).toBe("https://ejemplo.com/taller");
    expect(primary.whatsapp_message).toBe("Hola taller");
    expect(primary.whatsapp_image_url).toBe("https://ejemplo.com/taller.jpg");
    expect(primary.whatsapp_image_logic).toBe("custom");
    expect(primary.text_color).toBe("#ffffff");
    expect(primary.custom_hex).toBe("#0d9488");
    expect(primary.shade).toBe(40);
    expect(primary.media_url).toBe("https://ejemplo.com/bg.mp4");
    expect(primary.media_mode).toBe("fill");
    expect(primary.media_fit).toBe("contain");
    expect(primary.icon_url).toBe("https://ejemplo.com/icon.png");
    expect(primary.icon_position).toBe("left");
    expect(primary.icon_shape).toBe("hexagon");
    expect(primary.width).toBe("full");
  });

  it("debe parsear correctamente JSON con múltiples botones en about_buttons", () => {
    const aboutButtonsJson: AboutButtonItem[] = [
      {
        id: "about_btn_1",
        text: "Conoce el Taller",
        action_type: "link",
        action_value: "/nosotros",
        custom_hex: "#f97316",
      },
      {
        id: "about_btn_2",
        text: "Hablar por WhatsApp",
        action_type: "whatsapp",
        whatsapp_number: "573156724474",
        whatsapp_message: "Hola desde Nosotros",
        whatsapp_image_url: "https://ejemplo.com/foto.jpg",
        whatsapp_image_logic: "auto",
        width: "auto",
      },
      {
        id: "about_btn_3",
        text: "Ir al Cotizador",
        action_type: "cotizador",
        action_value: "/cotizador",
        width: "full",
      },
    ];

    const buttons = parseAboutButtons({
      about_buttons: JSON.stringify(aboutButtonsJson),
      about_cta_text: "Texto Legado Ignorado",
    });

    expect(buttons).toHaveLength(3);
    expect(buttons[0].id).toBe("about_btn_1");
    expect(buttons[0].text).toBe("Conoce el Taller");
    expect(buttons[1].id).toBe("about_btn_2");
    expect(buttons[1].action_type).toBe("whatsapp");
    expect(buttons[1].whatsapp_number).toBe("573156724474");
    expect(buttons[2].id).toBe("about_btn_3");
    expect(buttons[2].action_type).toBe("cotizador");
    expect(buttons[2].width).toBe("full");
  });

  it("debe ser resiliente ante JSON corrupto o array vacío cayendo en claves legadas", () => {
    const malformed = parseAboutButtons({
      about_buttons: "{ json roto [",
      about_cta_text: "Botón Legado",
      about_cta_url: "/contacto",
    });
    expect(malformed).toHaveLength(1);
    expect(malformed[0].id).toBe("about_primary");
    expect(malformed[0].text).toBe("Botón Legado");
    expect(malformed[0].action_value).toBe("/contacto");

    const emptyArr = parseAboutButtons({
      about_buttons: "[]",
      about_cta_text: "Otro Fallback",
    });
    expect(emptyArr).toHaveLength(1);
    expect(emptyArr[0].text).toBe("Otro Fallback");
  });

  it("debe sanitizar propiedades inválidas en about_buttons JSON", () => {
    const raw = [
      {
        id: "   ",
        text: 123,
        action_type: "otro",
        whatsapp_image_logic: "desconocida",
        media_mode: "invalid",
        media_fit: "stretched",
        icon_position: "top",
        width: "gigante",
        shade: 150,
      },
    ];

    const buttons = parseAboutButtons({
      about_buttons: JSON.stringify(raw),
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0].id).toBe("about_btn_1");
    expect(buttons[0].text).toBe("");
    expect(buttons[0].action_type).toBe("link");
    expect(buttons[0].whatsapp_image_logic).toBeUndefined();
    expect(buttons[0].media_mode).toBeUndefined();
    expect(buttons[0].media_fit).toBe("cover");
    expect(buttons[0].icon_position).toBeUndefined();
    expect(buttons[0].width).toBeUndefined();
    expect(buttons[0].shade).toBe(100);
  });
});
