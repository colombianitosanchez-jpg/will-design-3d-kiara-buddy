import { describe, expect, it } from "vitest";
import { formatReadableOrderError, parseOrderRequestInput } from "./order-validation";
import { buildButtonWhatsappText } from "./product-buttons";
import { productShareLink } from "./product-share";
import { buildQuickOrderWhatsappMessage, buildWhatsAppApiUrl } from "./notification-templates";

const SAMPLE_PRODUCT_ID = "11111111-2222-4333-8444-555555555555";

describe("order-validation & captura rápida WhatsApp", () => {
  it("acepta pedido rápido sin variante aunque variant_id sea vacío, null o undefined", () => {
    for (const emptyVariant of [undefined, "", "   ", null]) {
      const parsed = parseOrderRequestInput({
        product_id: SAMPLE_PRODUCT_ID,
        variant_id: emptyVariant,
        quantity: 1,
        customer_name: "Laura",
        customer_phone: "3004150204",
        shipping_address: "cra 28, #86-13",
        shipping_city: "cra 28, #86-13",
        notes: "",
        quick_capture: true,
      });

      expect(parsed.product_id).toBe(SAMPLE_PRODUCT_ID);
      expect(parsed.variant_id).toBe("");
      expect(parsed.customer_name).toBe("Laura");
    }
  });

  it("acepta variantes con identificadores heredados o no-UUID (ej. var-abc123)", () => {
    const parsed = parseOrderRequestInput({
      product_id: SAMPLE_PRODUCT_ID,
      variant_id: "var-pla-azul-1",
      customer_name: "Carlos Méndez",
      customer_phone: "3156724474",
      quick_capture: true,
    });

    expect(parsed.variant_id).toBe("var-pla-azul-1");
  });

  it("acepta variantes con UUID válido", () => {
    const varUuid = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const parsed = parseOrderRequestInput({
      product_id: SAMPLE_PRODUCT_ID,
      variant_id: varUuid,
      customer_name: "Carlos Méndez",
      customer_phone: "3156724474",
      quick_capture: true,
    });

    expect(parsed.variant_id).toBe(varUuid);
  });

  it("rechaza con mensaje legible en español cuando falta teléfono válido o nombre", () => {
    expect(() =>
      parseOrderRequestInput({
        product_id: SAMPLE_PRODUCT_ID,
        customer_name: "Laura",
        customer_phone: "123",
        quick_capture: true,
      }),
    ).toThrow(/celular WhatsApp válido/i);

    expect(() =>
      parseOrderRequestInput({
        product_id: "no-es-uuid",
        customer_name: "Laura",
        customer_phone: "3004150204",
        quick_capture: true,
      }),
    ).toThrow(/identificador del producto/i);
  });

  it("formatReadableOrderError traduce arreglos JSON de Zod e Invalid uuid a español amigable", () => {
    const zodJsonErr = new Error(
      '[ { "validation": "uuid", "code": "invalid_string", "message": "Invalid uuid", "path": [ "variant_id" ] } ]',
    );
    expect(formatReadableOrderError(zodJsonErr)).toBe(
      "Verifica los datos del producto y tus datos de contacto e intenta de nuevo.",
    );

    const customZodErr = new Error(
      '[{"code":"custom","message":"Ingresa un número de celular WhatsApp válido (mínimo 7 dígitos).","path":["customer_phone"]}]',
    );
    expect(formatReadableOrderError(customZodErr)).toBe(
      "Ingresa un número de celular WhatsApp válido (mínimo 7 dígitos).",
    );

    expect(formatReadableOrderError(new Error("Variante no encontrada"))).toBe(
      "Variante no encontrada",
    );
  });

  it("preserva la plantilla preconfigurada del botón, el dominio oficial y la vista previa de foto en captura rápida", () => {
    const product = {
      slug: "pla-plus",
      image_url: "https://cdn.example.com/pla-cover.jpg",
      images: [],
      custom_buttons: [
        {
          id: "btn-buy",
          whatsapp_message:
            "¡Hola! Quiero comprar {{producto}} por {{precio}}. ¿Tienen stock inmediato?",
          whatsapp_image_url: "https://cdn.example.com/pla-btn.jpg",
        },
      ],
      variants: [],
    };
    const canonicalOrigin = "https://willdesign3d.co";
    const shareUrl = productShareLink(product as never, null, "btn-buy", canonicalOrigin);
    expect(shareUrl).toBe("https://willdesign3d.co/t/pla-plus--b1");

    const configuredMessage = buildButtonWhatsappText(
      product.custom_buttons[0],
      {
        name: "PLA +",
        price: "$ 84.000",
        share_url: shareUrl,
      },
      "",
      "",
      { site_canonical_domain: canonicalOrigin },
    );

    expect(configuredMessage).toBe(
      "¡Hola! Quiero comprar PLA + por $ 84.000. ¿Tienen stock inmediato?\n\nhttps://willdesign3d.co/t/pla-plus--b1",
    );

    const finalWhatsappMsg = buildQuickOrderWhatsappMessage({
      orderCode: "#WD-91A2B3C4",
      totalCop: 84000,
      productName: "PLA +",
      customerName: "Laura",
      shippingCity: "Bogotá",
      shareUrl,
      configuredMessage,
    });

    expect(finalWhatsappMsg).toBe(
      "¡Hola! Quiero comprar PLA + por $ 84.000. ¿Tienen stock inmediato?\n\nPedido: #WD-91A2B3C4\n\nhttps://willdesign3d.co/t/pla-plus--b1",
    );

    const apiUrl = buildWhatsAppApiUrl("3156724474", finalWhatsappMsg);
    expect(apiUrl).toBe(
      `https://api.whatsapp.com/send?phone=573156724474&text=${encodeURIComponent(finalWhatsappMsg)}`,
    );
  });

  it("no duplica extraNote en buildButtonWhatsappText cuando coincide con la plantilla del botón", () => {
    const txt = buildButtonWhatsappText(
      { whatsapp_message: "Hola, quiero cotizar Impresión Resina" },
      { name: "Impresión Resina", share_url: "" },
      "Hola, quiero cotizar Impresión Resina",
    );
    expect(txt).toBe("Hola, quiero cotizar Impresión Resina");
  });
});
