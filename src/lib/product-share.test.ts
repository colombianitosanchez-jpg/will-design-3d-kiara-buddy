import { describe, expect, it } from "vitest";
import { productShareLink, resolveProductShareImage, type ShareProduct } from "./product-share";

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
    expect(findMeta("og:image:width", "1200")?.content).toBe("1200");
    expect(findMeta("og:image:height", "630")?.content).toBe("630");
    expect(findMeta("og:image:alt", "PLA — Will Design 3D")?.content).toBe("PLA — Will Design 3D");
    expect(findMeta("twitter:image", "https://x/prod.jpg")?.content).toBe("https://x/prod.jpg");
  });
});
