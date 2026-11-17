import { describe, it, expect } from "vitest";
import {
  generateUniqueSlug,
  generateUniqueName,
  variantToProduct,
  productToVariant,
  transferVariant,
  duplicateProductRecord,
  buildVariantToStandaloneMove,
  type ProductRecord,
} from "./product-hierarchy";
import type { ProductVariant } from "./product-variants";

describe("product-hierarchy bidirectional conversions", () => {
  it("generateUniqueSlug generates clean slugs without '-copia' and handles collisions with numbers", () => {
    const existing = ["filamento-pla", "filamento-pla-2", "resina"];
    expect(generateUniqueSlug("Filamento PLA", existing)).toBe("filamento-pla-3");
    expect(generateUniqueSlug("Nuevo Producto", existing)).toBe("nuevo-producto");
  });

  it("generateUniqueName generates clean names without '(Copia)'", () => {
    const existing = ["Filamento PLA", "Filamento PLA 2"];
    expect(generateUniqueName("Filamento PLA", existing)).toBe("Filamento PLA 3");
    expect(generateUniqueName("Resina", existing)).toBe("Resina");
  });

  it("variantToProduct resolves inheritance when variant has null price and empty images", () => {
    const parent: ProductRecord = {
      id: "prod-1",
      name: "Filamento PLA",
      slug: "filamento-pla",
      price_cop: 85000,
      stock: 20,
      image_url: "https://example.com/pla.jpg",
      images: ["https://example.com/pla-2.jpg"],
      category_id: "cat-1",
      brand_id: "brand-1",
      short: "PLA de alta calidad",
      description: "<p>Descripción</p>",
      specs: [{ label: "Material", value: "PLA" }],
      allowed_payment_method_ids: ["nequi", "bancolombia"],
    };

    const variant: ProductVariant = {
      id: "var-1",
      name: "Rojo",
      sku: "PLA-RED",
      image_url: null,
      images: [],
      price_cop: null,
      stock: null,
      is_active: true,
      custom_buttons: null,
      allowed_payment_method_ids: null,
    };

    const standalone = variantToProduct(variant, parent, ["filamento-pla"], ["Filamento PLA"]);

    expect(standalone.name).toBe("Filamento PLA - Rojo");
    expect(standalone.slug).toBe("filamento-pla-rojo");
    expect(standalone.price_cop).toBe(85000); // congelado del padre
    expect(standalone.stock).toBe(20); // congelado del padre
    expect(standalone.image_url).toBe("https://example.com/pla.jpg");
    expect(standalone.images).toEqual(["https://example.com/pla-2.jpg"]);
    expect(standalone.category_id).toBe("cat-1");
    expect(standalone.brand_id).toBe("brand-1");
    expect(standalone.sku).toBe("PLA-RED");
    expect(standalone.specs).toEqual([{ label: "Material", value: "PLA" }]);
    expect(standalone.allowed_payment_method_ids).toEqual(["nequi", "bancolombia"]);
    expect(standalone.variants).toEqual([]);
  });

  it("variantToProduct preserves custom configuration when variant has its own price, stock, images and buttons", () => {
    const parent: ProductRecord = {
      id: "prod-1",
      name: "Impresora 3D",
      slug: "impresora-3d",
      price_cop: 1200000,
      stock: 5,
      image_url: "https://example.com/printer.jpg",
    };

    const variant: ProductVariant = {
      id: "var-2",
      name: "Edición Pro",
      sku: "PRINT-PRO",
      image_url: "https://example.com/pro.jpg",
      images: ["https://example.com/pro.jpg", "https://example.com/pro-angle.jpg"],
      price_cop: 1800000,
      stock: 2,
      is_active: true,
      custom_buttons: [
        {
          id: "btn-1",
          text: "Comprar Pro",
          action_type: "whatsapp",
          action_value: "573000000000",
          media_mode: "none",
        } as any,
      ],
      allowed_payment_method_ids: ["wompi"],
    };

    const standalone = variantToProduct(variant, parent, ["impresora-3d"], ["Impresora 3D"]);

    expect(standalone.name).toBe("Impresora 3D - Edición Pro");
    expect(standalone.price_cop).toBe(1800000);
    expect(standalone.stock).toBe(2);
    expect(standalone.image_url).toBe("https://example.com/pro.jpg");
    expect(standalone.images).toEqual(["https://example.com/pro-angle.jpg"]);
    expect(standalone.custom_buttons?.length).toBe(1);
    expect(standalone.custom_buttons?.[0].text).toBe("Comprar Pro");
    expect(standalone.allowed_payment_method_ids).toEqual(["wompi"]);
  });

  it("productToVariant converts standalone product into a variant preserving all fields", () => {
    const product: ProductRecord = {
      id: "prod-standalone",
      name: "Boquilla 0.4mm Acero",
      slug: "boquilla-04mm-acero",
      price_cop: 45000,
      stock: 15,
      image_url: "https://example.com/nozzle.jpg",
      images: ["https://example.com/nozzle-2.jpg"],
      sku: "NOZ-04-ST",
      active: true,
      allowed_payment_method_ids: ["nequi"],
      custom_buttons: [
        {
          id: "b-1",
          text: "Ver Repuesto",
          action_type: "link",
          action_value: "/repuestos",
          media_mode: "none",
        } as any,
      ],
    };

    const variant = productToVariant(product);

    expect(variant.name).toBe("Boquilla 0.4mm Acero");
    expect(variant.price_cop).toBe(45000);
    expect(variant.stock).toBe(15);
    expect(variant.sku).toBe("NOZ-04-ST");
    expect(variant.image_url).toBe("https://example.com/nozzle.jpg");
    expect(variant.images).toEqual(["https://example.com/nozzle.jpg", "https://example.com/nozzle-2.jpg"]);
    expect(variant.allowed_payment_method_ids).toEqual(["nequi"]);
    expect(variant.custom_buttons?.length).toBe(1);
    expect(variant.is_active).toBe(true);
  });

  it("transferVariant preserves variant settings and assigns unique name if collision occurs", () => {
    const variant: ProductVariant = {
      id: "var-blue",
      name: "Azul",
      sku: "AZ-1",
      image_url: null, // hereda
      images: [],
      price_cop: null, // hereda
      stock: null, // hereda
      is_active: true,
      custom_buttons: null,
      allowed_payment_method_ids: null,
    };

    const targetParent: ProductRecord = {
      id: "target-prod",
      name: "Resina UV",
      price_cop: 110000,
      variants: [
        {
          id: "v-existing",
          name: "Azul",
          image_url: null,
          images: [],
          price_cop: null,
          stock: null,
          is_active: true,
          custom_buttons: null,
          allowed_payment_method_ids: null,
        },
      ],
    };

    const transferred = transferVariant(variant, targetParent, { makeUniqueId: true });

    expect(transferred.id).not.toBe("var-blue");
    expect(transferred.name).toBe("Azul 2");
    expect(transferred.price_cop).toBeNull(); // sigue heredando en el nuevo padre
    expect(transferred.image_url).toBeNull();
  });

  it("duplicateProductRecord duplicates product and all internal variants with new IDs", () => {
    const original: ProductRecord = {
      id: "orig-1",
      name: "Llavero Personalizado",
      slug: "llavero-personalizado",
      price_cop: 15000,
      stock: 50,
      variants: [
        {
          id: "var-1",
          name: "Pequeño",
          image_url: null,
          images: [],
          price_cop: 12000,
          stock: 20,
          is_active: true,
          custom_buttons: null,
          allowed_payment_method_ids: null,
        },
      ],
    };

    const dup = duplicateProductRecord(original, ["llavero-personalizado"], ["Llavero Personalizado"]);

    expect(dup.id).toBeUndefined();
    expect(dup.name).toBe("Llavero Personalizado 2");
    expect(dup.slug).toBe("llavero-personalizado-2");
    expect(dup.variants?.length).toBe(1);
    expect(dup.variants?.[0].id).not.toBe("var-1");
    expect(dup.variants?.[0].name).toBe("Pequeño");
    expect(dup.variants?.[0].price_cop).toBe(12000);
  });
});

describe("buildVariantToStandaloneMove positioning", () => {
  const makeVar = (id: string, name: string): ProductVariant => ({
    id,
    name,
    image_url: null,
    images: [],
    price_cop: null,
    stock: null,
    is_active: true,
    custom_buttons: null,
    allowed_payment_method_ids: null,
  });

  const products = [
    { id: "p0", updated_at: "t0", variants: [makeVar("v0a", "Rojo")] },
    { id: "p1", updated_at: "t1", variants: [makeVar("v1a", "Azul"), makeVar("v1b", "Verde")] },
    { id: "p2", updated_at: "t2", variants: [] },
  ];

  const baseNewProd: ProductRecord = {
    name: "Nuevo",
    slug: "nuevo",
    price_cop: 50000,
    stock: 3,
  };

  it("inserta al principio (slot 0) y desplaza todos los sort_order existentes sin duplicar al padre", () => {
    const res = buildVariantToStandaloneMove({
      products,
      visibleProductIds: ["p0", "p1", "p2"],
      parent: products[1],
      variantId: "v1a",
      targetSlotIndex: 0,
      newProd: baseNewProd,
    });

    expect(res.insert.sort_order).toBe(1);
    expect(res.changes).toEqual([
      { id: "p0", updated_at: "t0", sort_order: 2 },
      { id: "p1", updated_at: "t1", sort_order: 3, variants: [makeVar("v1b", "Verde")] },
      { id: "p2", updated_at: "t2", sort_order: 4 },
    ]);
  });

  it("inserta en una ranura intermedia (slot 1, entre p0 y p1) manteniendo un único cambio por producto", () => {
    const res = buildVariantToStandaloneMove({
      products,
      visibleProductIds: ["p0", "p1", "p2"],
      parent: products[1],
      variantId: "v1a",
      targetSlotIndex: 1,
      newProd: baseNewProd,
    });

    expect(res.insert.sort_order).toBe(2);
    expect(res.changes).toEqual([
      { id: "p0", updated_at: "t0", sort_order: 1 },
      { id: "p1", updated_at: "t1", sort_order: 3, variants: [makeVar("v1b", "Verde")] },
      { id: "p2", updated_at: "t2", sort_order: 4 },
    ]);
  });

  it("inserta al final (slot = visibleProductIds.length)", () => {
    const res = buildVariantToStandaloneMove({
      products,
      visibleProductIds: ["p0", "p1", "p2"],
      parent: products[0],
      variantId: "v0a",
      targetSlotIndex: 3,
      newProd: baseNewProd,
    });

    expect(res.insert.sort_order).toBe(4);
    expect(res.changes).toEqual([
      { id: "p0", updated_at: "t0", sort_order: 1, variants: [] },
      { id: "p1", updated_at: "t1", sort_order: 2 },
      { id: "p2", updated_at: "t2", sort_order: 3 },
    ]);
  });

  it("mapea correctamente targetSlotIndex cuando hay filtros activos", () => {
    const res = buildVariantToStandaloneMove({
      products,
      visibleProductIds: ["p1"], // p0 y p2 ocultos por filtro
      parent: products[1],
      variantId: "v1a",
      targetSlotIndex: 1, // ranura debajo de p1 -> después de p1, antes de p2
      newProd: baseNewProd,
    });

    expect(res.insert.sort_order).toBe(3);
    expect(res.changes).toEqual([
      { id: "p0", updated_at: "t0", sort_order: 1 },
      { id: "p1", updated_at: "t1", sort_order: 2, variants: [makeVar("v1b", "Verde")] },
      { id: "p2", updated_at: "t2", sort_order: 4 },
    ]);
  });

  it("mantiene el comportamiento estándar cuando targetSlotIndex es undefined (zona superior)", () => {
    const res = buildVariantToStandaloneMove({
      products,
      visibleProductIds: ["p0", "p1", "p2"],
      parent: products[1],
      variantId: "v1b",
      targetSlotIndex: undefined,
      newProd: baseNewProd,
    });

    expect(res.insert.sort_order).toBeUndefined();
    expect(res.changes).toEqual([
      { id: "p1", updated_at: "t1", variants: [makeVar("v1a", "Azul")] },
    ]);
  });
});

