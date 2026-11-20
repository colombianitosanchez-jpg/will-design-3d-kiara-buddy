import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTACT_BLOCKS_ORDER,
  parseContactBlocksOrder,
  parseContactChannels,
  parseSocialLinks,
  resolvePrimaryWhatsappChannel,
  serializeContactBlocksOrder,
  serializeContactChannels,
  serializeSocialLinks,
} from "./contact-config";

describe("contact-config", () => {
  it("parseContactBlocksOrder devuelve orden por defecto y repara datos corruptos o parciales", () => {
    expect(parseContactBlocksOrder(null)).toEqual(DEFAULT_CONTACT_BLOCKS_ORDER);
    expect(parseContactBlocksOrder("")).toEqual(DEFAULT_CONTACT_BLOCKS_ORDER);
    expect(parseContactBlocksOrder("no-es-json{")).toEqual(DEFAULT_CONTACT_BLOCKS_ORDER);
    expect(parseContactBlocksOrder('{"not":"array"}')).toEqual(DEFAULT_CONTACT_BLOCKS_ORDER);

    expect(parseContactBlocksOrder('["mapa","redes","mapa","desconocido"]')).toEqual([
      "mapa",
      "redes",
      "canales",
      "formulario",
    ]);

    const serialized = serializeContactBlocksOrder(["formulario", "mapa", "formulario"] as never);
    expect(JSON.parse(serialized)).toEqual(["formulario", "mapa", "canales", "redes"]);
  });

  it("parseContactChannels recurre a campos legados cuando raw está vacío o inválido", () => {
    const legacy = {
      contact_whatsapp: "573156724474",
      contact_whatsapp_display: "+57 315 672 4474",
      contact_email: "hola@willdesign3d.co",
    };

    const fromNull = parseContactChannels(null, legacy);
    expect(fromNull).toEqual([
      {
        id: "legacy-whatsapp",
        type: "whatsapp",
        label: "WhatsApp",
        value: "573156724474",
        displayValue: "+57 315 672 4474",
        isPrimaryOrder: true,
      },
      {
        id: "legacy-email",
        type: "email",
        label: "Correo",
        value: "hola@willdesign3d.co",
        displayValue: "hola@willdesign3d.co",
      },
    ]);

    expect(parseContactChannels("corrupto", legacy)).toHaveLength(2);
    expect(parseContactChannels("[]", legacy)).toHaveLength(2);
  });

  it("parseContactChannels y serializeContactChannels conservan múltiples canales y canal principal", () => {
    const json = serializeContactChannels([
      {
        id: "wa-ventas",
        type: "whatsapp",
        label: "WhatsApp Ventas",
        value: "573001112233",
        displayValue: "+57 300 111 2233",
        isPrimaryOrder: false,
      },
      {
        id: "wa-taller",
        type: "whatsapp",
        label: "WhatsApp Taller",
        value: "573156724474",
        displayValue: "+57 315 672 4474",
        isPrimaryOrder: true,
      },
      {
        id: "tel-fijo",
        type: "phone",
        label: "Teléfono Fijo",
        value: "+576012345678",
        displayValue: "(601) 234 5678",
      },
      {
        id: "empty-invalid",
        type: "email",
        label: "Vacío",
        value: "   ",
      },
    ]);

    const parsed = parseContactChannels(json);
    expect(parsed).toHaveLength(3);
    expect(parsed[1]?.isPrimaryOrder).toBe(true);
    expect(resolvePrimaryWhatsappChannel(parsed, "573000000000")).toEqual({
      number: "573156724474",
      display: "+57 315 672 4474",
    });
  });

  it("parseSocialLinks usa fallback legado de Instagram y soporta redes múltiples en JSON", () => {
    const legacy = {
      contact_instagram_url: "https://www.instagram.com/will_design2020/",
      contact_instagram_handle: "@will_design2020",
    };

    expect(parseSocialLinks(undefined, legacy)).toEqual([
      {
        id: "legacy-instagram",
        platform: "instagram",
        label: "@will_design2020",
        url: "https://www.instagram.com/will_design2020/",
      },
    ]);

    const json = serializeSocialLinks([
      { id: "ig", platform: "instagram", label: "@will_design2020", url: "https://instagram.com/will_design2020" },
      { id: "tt", platform: "tiktok", label: "TikTok Taller", url: "tiktok.com/@willdesign3d" },
      { id: "bad", platform: "youtube", label: "Sin URL", url: "" },
    ]);

    const parsed = parseSocialLinks(json, legacy);
    expect(parsed).toEqual([
      {
        id: "ig",
        platform: "instagram",
        label: "@will_design2020",
        url: "https://instagram.com/will_design2020",
      },
      {
        id: "tt",
        platform: "tiktok",
        label: "TikTok Taller",
        url: "https://tiktok.com/@willdesign3d",
      },
    ]);
  });
});
