import { describe, expect, it } from "vitest";
import {
  featuredItemKey,
  featuredProductItems,
  parseFeaturedProductsOrder,
  sortFeaturedItems,
  type Product,
} from "./catalog";
import { parseVariants } from "./product-variants";

function makeProduct(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    slug: id,
    name: `Producto ${id}`,
    price_cop: 50000,
    btn_text: "Ver más",
    show_whatsapp: true,
    hide_default_cta: false,
    accepts_3d_file: false,
    quote_only: false,
    custom_share_text: null,
    custom_buttons: [],
    short: "Corto",
    description: "Descripción",
    kiara_tip: "",
    image_url: null,
    images: [],
    featured: false,
    active: true,
    stock: 5,
    sku: null,
    category: null,
    brand: null,
    specs: [],
    attributes: [],
    variants: [],
    variant_label: "Color",
    ...overrides,
  };
}

const makeVariant = (id: string, patch: Record<string, unknown> = {}) =>
  parseVariants([{ id, name: `Variante ${id}`, ...patch }])[0];

describe("featured products ordering & unlimited count", () => {
  it("muestra todos los productos y variantes destacados sin límite de 4", () => {
    const products: Product[] = [
      makeProduct("p1", { featured: true }),
      makeProduct("p2", { featured: true }),
      makeProduct("p3", {
        featured: false,
        variants: [makeVariant("v1", { featured: true }), makeVariant("v2", { featured: true })],
      }),
      makeProduct("p4", { featured: true }),
      makeProduct("p5", { featured: true }),
      makeProduct("p6", {
        featured: true,
        variants: [makeVariant("v3", { featured: true })],
      }),
      makeProduct("p7", { featured: true }),
    ];

    const items = featuredProductItems(products);
    expect(items).toHaveLength(9);
    expect(items.map((it) => featuredItemKey(it.product, it.variant))).toEqual([
      "p1:parent",
      "p2:parent",
      "p3:v1",
      "p3:v2",
      "p4:parent",
      "p5:parent",
      "p6:parent",
      "p6:v3",
      "p7:parent",
    ]);
  });

  it("si ninguno está marcado como destacado, devuelve todos los activos sin cortar a 4", () => {
    const products = ["p1", "p2", "p3", "p4", "p5", "p6"].map((id) =>
      makeProduct(id, { featured: false }),
    );
    products.push(makeProduct("inactive", { active: false, featured: false }));

    const items = featuredProductItems(products);
    expect(items.map((it) => it.product.id)).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
  });

  it("ordena productos y variantes según featured_products_order y deja nuevos destacados al final", () => {
    const products: Product[] = [
      makeProduct("p1", { featured: true }),
      makeProduct("p2", {
        featured: false,
        variants: [makeVariant("vA", { featured: true }), makeVariant("vB", { featured: true })],
      }),
      makeProduct("p3", { featured: true }),
      makeProduct("p4", { featured: true }),
      makeProduct("p5", { featured: true }),
    ];

    const savedOrder = JSON.stringify(["p4:parent", "p2:vB", "p1:parent", "deleted:parent"]);

    const items = featuredProductItems(products, savedOrder);
    expect(items.map((it) => featuredItemKey(it.product, it.variant))).toEqual([
      "p4:parent",
      "p2:vB",
      "p1:parent",
      "p2:vA",
      "p3:parent",
      "p5:parent",
    ]);
  });

  it("tolera JSON inválido, duplicados o vacío en featured_products_order", () => {
    expect(parseFeaturedProductsOrder("")).toEqual([]);
    expect(parseFeaturedProductsOrder(null)).toEqual([]);
    expect(parseFeaturedProductsOrder("{not-valid")).toEqual([]);
    expect(parseFeaturedProductsOrder('{"a":1}')).toEqual([]);
    expect(
      parseFeaturedProductsOrder(JSON.stringify(["p1:parent", "p1:parent", 123, "", "p2:v1"])),
    ).toEqual(["p1:parent", "p2:v1"]);

    const items = [
      { product: makeProduct("p1"), variant: null },
      { product: makeProduct("p2"), variant: makeVariant("v1") },
    ];
    expect(
      sortFeaturedItems(items, "{corrupt").map((it) => featuredItemKey(it.product, it.variant)),
    ).toEqual(["p1:parent", "p2:v1"]);
  });
});
