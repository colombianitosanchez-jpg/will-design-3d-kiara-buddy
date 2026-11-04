import { describe, expect, test } from "vitest";
import {
  getWhatsAppPayloadForButton,
  replaceTemplatePlaceholders,
  toAbsoluteUrl,
  isStorageMediaUrl,
} from "./whatsapp-buttons";
import { waLink } from "./catalog";

describe("getWhatsAppPayloadForButton & waLink CEO Rules", () => {
  test("Rule 1: Video only -> mediaToSend is logo.png (converted to absolute URL)", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "Hola Will, cotizar {media}" },
      "https://example.com/demo.mp4",
      "/custom-logo.png"
    );

    expect(payload.mediaToSend).toBe("https://will-design-3d.lovable.app/custom-logo.png");
    expect(payload.formattedText).toBe("Hola Will, cotizar https://will-design-3d.lovable.app/custom-logo.png");
  });

  test("Rule 2: Video and Image -> mediaToSend is image", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "Hola, me interesa {media}", whatsapp_image_logic: "auto" },
      "https://example.com/photo.jpg",
      "/custom-logo.png"
    );

    expect(payload.mediaToSend).toBe("https://example.com/photo.jpg");
    expect(payload.formattedText).toBe("Hola, me interesa https://example.com/photo.jpg");
  });

  test("Rule 3: No video and no image -> mediaToSend is logo.png (absolute URL)", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "Mensaje sin media" },
      "",
      "/site-logo.png"
    );

    expect(payload.mediaToSend).toBe("https://will-design-3d.lovable.app/site-logo.png");
    expect(payload.text).toBe("Mensaje sin media");
  });

  test("Logic Override: 'logo' forces logo even if image exists (absolute URL)", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "Forzando logo", whatsapp_image_logic: "logo" },
      "https://example.com/photo.png",
      "/logo-brand.png"
    );

    expect(payload.mediaToSend).toBe("https://will-design-3d.lovable.app/logo-brand.png");
  });

  test("waLink fallback message and placeholder replacement", () => {
    const link = waLink("573156724474", "Cotizar pieza {media}", {
      mediaToSend: "https://example.com/item.png",
    });

    expect(link).toBe("https://wa.me/573156724474?text=Cotizar%20pieza%20https%3A%2F%2Fexample.com%2Fitem.png");
  });

  test("waLink uses defaultMessage when message is empty", () => {
    const link = waLink("573156724474", "", {
      defaultMessage: "Hola Will Design 3D",
    });

    expect(link).toBe("https://wa.me/573156724474?text=Hola%20Will%20Design%203D");
  });

  test("Rule 4: Explicit whatsapp_image_url takes priority over background media or video", () => {
    const payload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Cotización con imagen {media}",
        whatsapp_image_url: "https://example.com/wa-attached.jpg",
      },
      "https://example.com/button-loop.mp4",
      "/site-logo.png"
    );

    expect(payload.mediaToSend).toBe("https://example.com/wa-attached.jpg");
    expect(payload.formattedText).toBe("Cotización con imagen https://example.com/wa-attached.jpg");
  });

  test("Global default message: applies when button has no message defined", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "" },
      "https://example.com/item.jpg",
      "/logo.png",
      "Fallback local",
      "Mensaje configurado en panel como whatsapp_default_message {media}"
    );

    expect(payload.formattedText).toBe("Mensaje configurado en panel como whatsapp_default_message https://example.com/item.jpg");
  });
});

describe("Storage Media and /ref Open Graph link generation", () => {
  const supabaseStorageUrl =
    "https://pizulwniobctfiedefiu.supabase.co/storage/v1/object/sign/site-media/stats/test-img.webp?token=xyz123";

  test("detects Supabase Storage URLs correctly", () => {
    expect(isStorageMediaUrl(supabaseStorageUrl)).toBe(true);
    expect(isStorageMediaUrl("https://example.com/photo.jpg")).toBe(false);
    expect(isStorageMediaUrl("/logo.png")).toBe(false);
    expect(isStorageMediaUrl("https://other.com/image.png?token=secret")).toBe(true);
  });

  test("generates friendly /ref URL replacing {media} when media is from Supabase Storage", () => {
    const payload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Hola Will, me interesa esta pieza: {media}",
        whatsapp_image_url: supabaseStorageUrl,
      },
      "",
      "/logo.png"
    );

    const expectedRef = `https://will-design-3d.lovable.app/ref?img=${encodeURIComponent(supabaseStorageUrl)}`;
    expect(payload.mediaToSend).toBe(supabaseStorageUrl);
    expect(payload.formattedText).toBe(`Hola Will, me interesa esta pieza: ${expectedRef}`);
  });

  test("generates friendly /ref URL replacing {{media_link}} when media is from Supabase Storage", () => {
    const payload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Consulta: {{media_link}}",
        whatsapp_image_url: supabaseStorageUrl,
      },
      "",
      "/logo.png"
    );

    const expectedRef = `https://will-design-3d.lovable.app/ref?img=${encodeURIComponent(supabaseStorageUrl)}`;
    expect(payload.formattedText).toBe(`Consulta: ${expectedRef}`);
  });

  test("appends friendly /ref URL on a new line when template has no {media} placeholder and media is from Storage", () => {
    const payload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Hola Will, me interesa cotizar una pieza",
        whatsapp_image_url: supabaseStorageUrl,
      },
      "",
      "/logo.png"
    );

    const expectedRef = `https://will-design-3d.lovable.app/ref?img=${encodeURIComponent(supabaseStorageUrl)}`;
    expect(payload.formattedText).toBe(`Hola Will, me interesa cotizar una pieza\n\n${expectedRef}`);
  });

  test("does not convert regular URLs to /ref", () => {
    const payload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Hola Will, mira esto: {media}",
        whatsapp_image_url: "https://example.com/simple.jpg",
      },
      "",
      "/logo.png"
    );

    expect(payload.formattedText).toBe("Hola Will, mira esto: https://example.com/simple.jpg");
  });
});

describe("replaceTemplatePlaceholders and toAbsoluteUrl", () => {
  test("replaces both single and double curly brackets", () => {
    const raw = "Hola, me interesa {producto} ({{variante}}) por {{precio}} con foto {media}";
    const res = replaceTemplatePlaceholders(raw, {
      producto: "Dragón Articulado",
      variante: "Seda Bicolor",
      precio: "$45.000 COP",
      media: "https://will-design-3d.lovable.app/dragon.jpg",
    });
    expect(res).toBe(
      "Hola, me interesa Dragón Articulado (Seda Bicolor) por $45.000 COP con foto https://will-design-3d.lovable.app/dragon.jpg"
    );
  });

  test("toAbsoluteUrl converts relative paths and keeps full URLs", () => {
    expect(toAbsoluteUrl("/logo.png")).toBe("https://will-design-3d.lovable.app/logo.png");
    expect(toAbsoluteUrl("logo.png")).toBe("https://will-design-3d.lovable.app/logo.png");
    expect(toAbsoluteUrl("https://supabase.co/img.png")).toBe("https://supabase.co/img.png");
    expect(toAbsoluteUrl("")).toBe("");
  });
});
