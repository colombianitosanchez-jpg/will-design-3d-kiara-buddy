import { describe, expect, it } from "vitest";
import { productShareLink, productShareUrl, resolveProductShareImage, type ShareProduct } from "./product-share";
import { buildButtonWhatsappText } from "./product-buttons";

const btn = (id: string, img = "") => ({ id, whatsapp_image_url: img }) as never;
const variant = (id: string, o: Record<string, unknown> = {}) =>
  ({ id, name: id, image_url: null, images: [], custom_buttons: null, ...o }) as never;

const base: ShareProduct = {
  slug: "pla",
  image_url: "https://x/prod.jpg",
  images: ["https://x/prod.jpg"],
  custom_buttons: [btn("p1", "https://x/padre-btn.jpg"), btn("p2")],
  variants: [
    variant("azul", { image_url: "https://x/azul.jpg", images: ["https://x/azul2.jpg"] }),
    variant("uva", { image_url: "https://x/uva.jpg", custom_buttons: [btn("u1"), btn("u2", "https://x/uva-btn.jpg")] }),
    variant("menta"),
  ],
};

describe("foto de WhatsApp en productos", () => {
  it("consulta predeterminada sin botón adjunta la foto del producto, no la de un botón diferente", () => {
    const link = productShareLink(base, "uva", "", "https://s");
    expect(link).toBe("https://s/t/pla--v2");
    expect(resolveProductShareImage(base, 1, null)).toBe("https://x/uva.jpg");
    expect(buildButtonWhatsappText({ whatsapp_message: "Consultar PLA" }, { name: "PLA", share_url: link })).toBe("Consultar PLA\n\nhttps://s/t/pla--v2");
  });
  it("PLA + TRANSLÚCIDO: portada GIF y segunda JPG generan enlace con foto estática", () => {
    const product: ShareProduct = { slug: "p", image_url: "https://example.com/Gif_GROOT_prueba_1.gif", images: ["https://example.com/product-photo-whatsapp.jpg"] };
    expect(resolveProductShareImage(product, null, null)).toBe("https://example.com/product-photo-whatsapp.jpg");
    expect(productShareLink(product, null, "comprar", "https://s")).toBe("https://s/t/p");
  });
  it("una variante con portada GIF usa su segunda foto antes que la del padre", () => {
    expect(resolveProductShareImage({ ...base, variants: [variant("azul", { image_url: "https://x/cover.GIF?download=1", images: ["https://x/video.mp4", "https://x/second.jpg"] })] }, 0, 1)).toBe("https://x/second.jpg");
  });
  it("un botón con GIF se salta, sin prestar la foto de otro botón", () => {
    expect(resolveProductShareImage({ ...base, variants: [variant("azul", { custom_buttons: [btn("u1", "https://x/button.gif"), btn("u2", "https://x/other.jpg")], image_url: "https://x/azul.jpg" })] }, 0, 0)).toBe("https://x/azul.jpg");
  });
  it("variante sin fotos estáticas recurre a la segunda foto estática del padre", () => {
    expect(resolveProductShareImage({ slug: "p", image_url: "https://x/parent.gif", images: ["https://x/parent.jpg"], variants: [variant("azul", { image_url: "https://x/variant.gif", images: ["https://x/variant.mp4"], custom_buttons: [] })] }, 0, 0)).toBe("https://x/parent.jpg");
  });
  it("solo GIF y videos producen mensaje sin enlace de imagen", () => {
    expect(productShareLink({ slug: "p", image_url: "https://x/cover.gif", images: ["https://x/clip.mp4"] }, null, "buy")).toBe("");
  });
  it("la foto del botón gana siempre", () => {
    expect(resolveProductShareImage(base, null, 0)).toBe("https://x/padre-btn.jpg");
  });
  it("variante que hereda usa la foto del botón del padre", () => {
    expect(resolveProductShareImage(base, 0, 0)).toBe("https://x/padre-btn.jpg");
  });
  it("variante que hereda, botón del padre sin foto → portada ★ de la variante", () => {
    expect(resolveProductShareImage(base, 0, 1)).toBe("https://x/azul.jpg");
  });
  it("variante con botones propios nunca usa la foto del botón del padre", () => {
    expect(resolveProductShareImage(base, 1, 0)).toBe("https://x/uva.jpg");
    expect(resolveProductShareImage(base, 1, 1)).toBe("https://x/uva-btn.jpg");
  });
  it("variante sin fotos → portada del producto", () => {
    expect(resolveProductShareImage(base, 2, 1)).toBe("https://x/prod.jpg");
  });
  it("salta videos", () => {
    expect(resolveProductShareImage({ ...base, custom_buttons: [btn("p", "https://x/a.mp4")] }, null, 0)).toBe("https://x/prod.jpg");
  });
  it("sin ninguna foto no hay enlace (mensaje limpio)", () => {
    const empty: ShareProduct = { slug: "pla", image_url: null, images: [], custom_buttons: [btn("p1")], variants: [] };
    expect(productShareLink(empty, null, "p1", "https://s")).toBe("");
  });
  it("enlace corto con número de variante y de botón", () => {
    expect(productShareLink(base, "uva", "u2", "https://s")).toBe("https://s/t/pla--v2--b2");
  });

  it("productShareUrl genera enlace limpio exacto con variante y botón sin ?, & ni =", () => {
    const url = productShareUrl("pla", 4, 0);
    expect(url).toBe("https://will-design-3d.lovable.app/t/pla--v5--b1");
    expect(url.includes("?")).toBe(false);
    expect(url.includes("&")).toBe(false);
    expect(url.includes("=")).toBe(false);
  });

  it("productShareUrl genera enlace limpio solo con variante", () => {
    expect(productShareUrl("pla", 2, null)).toBe("https://will-design-3d.lovable.app/t/pla--v3");
  });

  it("productShareUrl genera enlace limpio sin variante ni botón", () => {
    expect(productShareUrl("pla", null, null)).toBe("https://will-design-3d.lovable.app/t/pla");
  });

  it("productShareLink retorna el enlace limpio correspondiente cuando existe foto en la jerarquía", () => {
    // Caso con variante y botón con foto
    expect(productShareLink(base, "uva", "u2")).toBe("https://will-design-3d.lovable.app/t/pla--v2--b2");
    // Caso con producto padre y botón con foto
    expect(productShareLink(base, null, "p1")).toBe("https://will-design-3d.lovable.app/t/pla--b1");
    // Caso con variante que hereda foto de variante
    expect(productShareLink(base, "azul", "p2")).toBe("https://will-design-3d.lovable.app/t/pla--v1--b2");
  });

  it("la ruta /t/$slug declara dimensiones Open Graph completas para WhatsApp (1200x630)", async () => {
    const { Route } = await import("@/routes/t.$slug");
    const headResult = (Route.options.head as any)({
      loaderData: {
        slug: "pla",
        variantId: null,
        title: "PLA",
        img: "https://x/prod.jpg",
      },
    });

    const meta = headResult.meta;
    const findMeta = (key: string, val: string) =>
      meta.find((m: Record<string, string>) => m.property === key || m.name === key);

    expect(findMeta("og:image", "https://x/prod.jpg")?.content).toBe("https://x/prod.jpg");
    expect(findMeta("og:image:secure_url", "https://x/prod.jpg")?.content).toBe("https://x/prod.jpg");
    expect(findMeta("og:image:width", "1200")?.content).toBe("1200");
    expect(findMeta("og:image:height", "630")?.content).toBe("630");
    expect(findMeta("og:image:alt", "PLA — Will Design 3D")?.content).toBe("PLA — Will Design 3D");
    expect(findMeta("twitter:image", "https://x/prod.jpg")?.content).toBe("https://x/prod.jpg");
    expect(findMeta("og:description", "")?.content.trim().length).toBeGreaterThan(0);
    expect(findMeta("robots", "")).toBeUndefined();
  });

  it("si el producto padre solo tiene video o está vacío, resolveProductShareImage usa la foto estática de sus variantes como respaldo", () => {
    const product: ShareProduct = {
      slug: "combo",
      image_url: "https://x/video-portada.mp4",
      images: ["https://x/anim.gif"],
      custom_buttons: [],
      variants: [
        variant("v1", { image_url: "https://x/v1-video.mp4", images: [] }),
        variant("v2", { image_url: "https://x/v2-estatica.jpg", images: ["https://x/v2-extra.png"] }),
      ],
    };

    expect(resolveProductShareImage(product, null, null)).toBe("https://x/v2-estatica.jpg");
    expect(productShareLink(product, null, "comprar", "https://s")).toBe("https://s/t/combo");
  });

  it("la ruta /tienda/$slug declara og:image:secure_url, width 1200 y height 630 y salta .jfif", async () => {
    const { Route } = await import("@/routes/tienda.$slug");
    type HeadFn = (ctx: Record<string, unknown>) => {
      meta: Array<Record<string, string>>;
      links?: Array<Record<string, string>>;
    };
    const headResult = (Route.options.head as unknown as HeadFn)({
      params: { slug: "pla" },
      loaderData: {
        variantId: null,
        product: {
          slug: "pla",
          name: "PLA",
          short: "Filamento PLA de alta calidad para impresión 3D.",
          description: "",
          price_cop: 84000,
          stock: 10,
          image_url: "https://x/cover.jfif",
          images: ["https://x/cover.jfif", "https://x/valid.jpg"],
          custom_buttons: [],
          variants: [],
        },
      },
    });

    const meta = headResult.meta;
    const findMeta = (key: string) => meta.find((m) => m.property === key || m.name === key);

    expect(findMeta("og:image")?.content).toBe("https://x/valid.jpg");
    expect(findMeta("og:image:secure_url")?.content).toBe("https://x/valid.jpg");
    expect(findMeta("og:image:width")?.content).toBe("1200");
    expect(findMeta("og:image:height")?.content).toBe("630");
    expect(findMeta("twitter:image")?.content).toBe("https://x/valid.jpg");
  });

  it("la ruta / (inicio) usa canonical/og:url pública y dimensiones Open Graph completas", async () => {
    const { Route } = await import("@/routes/index");
    type HeadFn = (ctx: Record<string, unknown>) => {
      meta: Array<Record<string, string>>;
      links?: Array<Record<string, string>>;
    };
    const headResult = (Route.options.head as unknown as HeadFn)({
      loaderData: {
        siteContent: {
          hero_title: "Will Design 3D",
          hero_subtitle: "Impresión 3D profesional en Bogotá",
          hero_image_url: "https://x/hero.jpg",
        },
      },
    });

    const meta = headResult.meta;
    const findMeta = (key: string) => meta.find((m) => m.property === key || m.name === key);

    expect(findMeta("og:url")?.content).toBe("https://will-design-3d.lovable.app");
    expect(headResult.links).toEqual([{ rel: "canonical", href: "https://will-design-3d.lovable.app" }]);
    expect(findMeta("og:image")?.content).toBe("https://x/hero.jpg");
    expect(findMeta("og:image:secure_url")?.content).toBe("https://x/hero.jpg");
    expect(findMeta("og:image:width")?.content).toBe("1200");
    expect(findMeta("og:image:height")?.content).toBe("630");
    expect(findMeta("twitter:image")?.content).toBe("https://x/hero.jpg");
  });
});
