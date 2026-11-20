import { describe, expect, test } from "vitest";
import {
  getWhatsAppPayloadForButton,
  replaceTemplatePlaceholders,
  resolvePublicSiteOrigin,
  toAbsoluteUrl,
  isStorageMediaUrl,
  WHATSAPP_REF_ALIASES,
  REVERSE_REF_ALIASES,
} from "./whatsapp-buttons";
import { waLink } from "./catalog";

describe("getWhatsAppPayloadForButton Simplified Logic", () => {
  test("Sin imagen configurada: genera texto plano limpio sin ningún enlace ni logo", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "Hola Will, cotizar pieza" },
      "https://example.com/demo.mp4",
      "/custom-logo.png"
    );

    expect(payload.mediaToSend).toBe("");
    expect(payload.formattedText).toBe("Hola Will, cotizar pieza");
  });

  test("Sin imagen configurada con placeholder {media}: limpia el marcador sin dejar enlaces vacíos", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "Hola, me interesa {media}", whatsapp_image_logic: "auto" },
      "",
      "/custom-logo.png"
    );

    expect(payload.mediaToSend).toBe("");
    expect(payload.formattedText).toBe("Hola, me interesa");
  });

  test("Sin imagen explícita configurada en whatsapp_image_url: siempre retorna texto limpio", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "Mensaje sin media" },
      "",
      "/site-logo.png"
    );

    expect(payload.mediaToSend).toBe("");
    expect(payload.text).toBe("Mensaje sin media");
    expect(payload.formattedText).toBe("Mensaje sin media");
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

  test("Imagen explícita whatsapp_image_url: genera enlace para WhatsApp", () => {
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

  test("Global default message: applies when button has no message defined and includes image", () => {
    const payload = getWhatsAppPayloadForButton(
      { whatsapp_message: "", whatsapp_image_url: "https://example.com/item.jpg" },
      "",
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

  test("generates friendly /ref URL replacing {media} when media is from Supabase Storage and no key exists", () => {
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

  test("generates friendly /ref URL replacing {{media_link}} when media is from Supabase Storage and no key exists", () => {
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

  test("automatically appends image url when user did not type {media} and message is custom", () => {
    const payload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Hola Will, me gustaría una cotización de esta figura",
        whatsapp_image_url: "https://example.com/figura.jpg",
      },
      "",
      "/logo.png"
    );

    expect(payload.formattedText).toBe("Hola Will, me gustaría una cotización de esta figura\n\nhttps://example.com/figura.jpg");
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

describe("enlace ultra corto /r/ con alias limpios", () => {
  test("hero_cta_whatsapp_image_url genera ruta ultra corta /r/hero", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Hola Will, me interesa cotizar esta pieza:",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/sign/site-media/a.webp?token=abc",
        whatsapp_image_key: "hero_cta_whatsapp_image_url",
      },
      "",
      "/logo.png"
    );
    expect(p.formattedText).toBe(
      "Hola Will, me interesa cotizar esta pieza:\n\nhttps://will-design-3d.lovable.app/r/hero"
    );
  });

  test("hero_secondary_cta_whatsapp_image_url genera ruta ultra corta /r/hero2", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Hola Will, quisiera ver la tienda",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/sign/site-media/b.webp?token=xyz",
        whatsapp_image_key: "hero_secondary_cta_whatsapp_image_url",
      },
      "",
      "/logo.png"
    );
    expect(p.formattedText).toBe(
      "Hola Will, quisiera ver la tienda\n\nhttps://will-design-3d.lovable.app/r/hero2"
    );
  });

  test("estadística con s1 genera ruta ultra corta /r/s1", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Consulta PLA",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/stat.jpg",
        whatsapp_image_key: "s1",
      },
      "",
      "/logo.png"
    );
    expect(p.formattedText).toBe(
      "Consulta PLA\n\nhttps://will-design-3d.lovable.app/r/s1"
    );
  });

  test("estadística con s2 genera ruta ultra corta /r/s2", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Consulta 1.8m",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/stat2.jpg",
        whatsapp_image_key: "s2",
      },
      "",
      "/logo.png"
    );
    expect(p.formattedText).toBe(
      "Consulta 1.8m\n\nhttps://will-design-3d.lovable.app/r/s2"
    );
  });

  test("estadística con stat_id genera ruta ultra corta /r/stat_id", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Consulta stat",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/stat.jpg",
        whatsapp_image_key: "stat_1792688101861",
      },
      "",
      "/logo.png"
    );
    expect(p.formattedText).toBe(
      "Consulta stat\n\nhttps://will-design-3d.lovable.app/r/stat_1792688101861"
    );
  });

  test("nosotros / about_cta_whatsapp_image_url genera alias /r/nosotros", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Nosotros:",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/about.jpg",
        whatsapp_image_key: "about_cta_whatsapp_image_url",
      },
      "",
      "/logo.png"
    );
    expect(p.formattedText).toBe(
      "Nosotros:\n\nhttps://will-design-3d.lovable.app/r/nosotros"
    );
  });

  test("mision y vision generan alias /r/mision y /r/vision", () => {
    const pMision = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Mision:",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/mision.jpg",
        whatsapp_image_key: "about_mission_cta_whatsapp_image_url",
      },
      "",
      "/logo.png"
    );
    expect(pMision.formattedText).toBe(
      "Mision:\n\nhttps://will-design-3d.lovable.app/r/mision"
    );

    const pVision = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Vision:",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/vision.jpg",
        whatsapp_image_key: "about_vision_cta_whatsapp_image_url",
      },
      "",
      "/logo.png"
    );
    expect(pVision.formattedText).toBe(
      "Vision:\n\nhttps://will-design-3d.lovable.app/r/vision"
    );
  });

  test("site_logo_url genera alias /r/logo", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Logo:",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/logo.png",
        whatsapp_image_key: "site_logo_url",
      },
      "",
      "/logo.png"
    );
    expect(p.formattedText).toBe(
      "Logo:\n\nhttps://will-design-3d.lovable.app/r/logo"
    );
  });

  test("clave no mapeada mantiene la clave original en /r/", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Custom key:",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/other.jpg",
        whatsapp_image_key: "custom_unmapped_image_url",
      },
      "",
      "/logo.png"
    );
    expect(p.formattedText).toBe(
      "Custom key:\n\nhttps://will-design-3d.lovable.app/r/custom_unmapped_image_url"
    );
  });

  test("REVERSE_REF_ALIASES mapea correctamente alias directos y alternativos", () => {
    expect(REVERSE_REF_ALIASES["hero"]).toBe("hero_cta_whatsapp_image_url");
    expect(REVERSE_REF_ALIASES["h1"]).toBe("hero_cta_whatsapp_image_url");
    expect(REVERSE_REF_ALIASES["hero2"]).toBe("hero_secondary_cta_whatsapp_image_url");
    expect(REVERSE_REF_ALIASES["h2"]).toBe("hero_secondary_cta_whatsapp_image_url");
    expect(REVERSE_REF_ALIASES["nosotros"]).toBe("nosotros_whatsapp_image_url");
    expect(REVERSE_REF_ALIASES["mision"]).toBe("mision_whatsapp_image_url");
    expect(REVERSE_REF_ALIASES["vision"]).toBe("vision_whatsapp_image_url");
    expect(REVERSE_REF_ALIASES["logo"]).toBe("site_logo_url");
  });
});

describe("mensaje limpio (solo texto)", () => {
  test("GIF explícito no genera enlace ni toma fotos de otra sección", () => {
    const payload = getWhatsAppPayloadForButton({ whatsapp_message: "Consulta {media}", whatsapp_image_url: "https://example.com/button.gif", whatsapp_image_key: "s1" }, "https://example.com/section.jpg", "https://example.com/logo.png");
    expect(payload.mediaToSend).toBe("");
    expect(payload.formattedText).toBe("Consulta");
  });
  test("no incluye ningún enlace cuando la lógica es none", () => {
    const p = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Hola Will {media}",
        whatsapp_image_logic: "none",
        whatsapp_image_url: "https://x.supabase.co/storage/v1/object/a.png?token=1",
      },
      "https://x.supabase.co/a.png",
      null
    );
    expect(p.formattedText).toBe("Hola Will");
    expect(p.mediaToSend).toBe("");
  });

  test("cuando no hay whatsapp_image_url retorna texto limpio sin enlaces aunque haya logo o media de sección", () => {
    const p = getWhatsAppPayloadForButton(
      { whatsapp_message: "Hola Will" },
      "https://x.supabase.co/storage/v1/object/hero.jpg",
      "https://x.supabase.co/storage/v1/object/logo.png?token=abc"
    );
    expect(p.formattedText).toBe("Hola Will");
    expect(p.mediaToSend).toBe("");
  });
});

describe("Dominio dinámico en enlaces de WhatsApp", () => {
  test("resolvePublicSiteOrigin usa site_canonical_domain del panel o fallback oficial", () => {
    expect(resolvePublicSiteOrigin(undefined)).toBe("https://will-design-3d.lovable.app");
    expect(resolvePublicSiteOrigin({})).toBe("https://will-design-3d.lovable.app");
    expect(
      resolvePublicSiteOrigin({ site_canonical_domain: "https://willdesign3d.co///" }),
    ).toBe("https://willdesign3d.co");
    expect(resolvePublicSiteOrigin({ site_url: "tienda3d.com/" })).toBe("https://tienda3d.com");
  });

  test("enlaces /r/... y /ref?img=... usan el dominio canónico oficial cuando se pasa siteContent", () => {
    const customSite = { site_canonical_domain: "https://willdesign3d.co/" };
    const storageUrl =
      "https://pizulwniobctfiedefiu.supabase.co/storage/v1/object/sign/site-media/hero.webp?token=xyz";

    const shortPayload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Hola Will",
        whatsapp_image_url: storageUrl,
        whatsapp_image_key: "hero_cta_whatsapp_image_url",
      },
      "",
      null,
      undefined,
      undefined,
      customSite,
    );
    expect(shortPayload.formattedText).toBe("Hola Will\n\nhttps://willdesign3d.co/r/hero");

    const refPayload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: "Mira {media}",
        whatsapp_image_url: storageUrl,
      },
      "",
      null,
      undefined,
      undefined,
      customSite,
    );
    expect(refPayload.formattedText).toBe(
      `Mira https://willdesign3d.co/ref?img=${encodeURIComponent(storageUrl)}`,
    );

    expect(toAbsoluteUrl("/promo.jpg", customSite)).toBe("https://willdesign3d.co/promo.jpg");
  });
});
