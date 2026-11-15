import { describe, expect, it } from "vitest";
import { productDisplayName, productSummary } from "./product-description";
import { parseVariants, resolveVariantProduct } from "./product-variants";

describe("product descriptions and variant inheritance", () => {
  const parent = { price_cop: 50000, stock: 12, short: "Resumen del padre", description: "Descripción del padre", accepts_3d_file: true, quote_only: true };

  it("keeps custom short and full descriptions independent", () => {
    const [variant] = parseVariants([{ id: "silk", name: "SILK 1 PRUEBA", short: "HOLA MUNDO", description: "<p>BUENAS TARDES MUNDO</p>" }]);
    const resolved = resolveVariantProduct(parent, variant);
    expect(resolved.short).toBe("HOLA MUNDO");
    expect(resolved.description).toBe("<p>BUENAS TARDES MUNDO</p>");
    expect(productSummary(resolved)).toBe("HOLA MUNDO");
  });

  it("uses a clean full-description excerpt when short is empty", () => {
    expect(productSummary({ short: "  ", description: "<p>PLA &amp; SILK</p><p>Impresión&nbsp;3D</p>" })).toBe("PLA & SILK Impresión 3D");
    expect(productSummary({ description: "<p><br></p>" })).toBe("");
  });

  it("inherits stock when empty without replacing an explicit zero", () => {
    const [inherited, empty] = parseVariants([{ id: "a", stock: null }, { id: "b", stock: 0 }]);
    expect(resolveVariantProduct(parent, inherited).stock).toBe(12);
    expect(resolveVariantProduct(parent, empty).stock).toBe(0);
  });

  it("preserves commercial false overrides and returns to inheritance when cleared", () => {
    const [variant] = parseVariants([{ id: "a", accepts_3d_file: false, quote_only: false }]);
    expect(resolveVariantProduct(parent, variant).accepts_3d_file).toBe(false);
    expect(resolveVariantProduct(parent, variant).quote_only).toBe(false);
    expect(resolveVariantProduct(parent, { ...variant, accepts_3d_file: undefined }).accepts_3d_file).toBe(true);
  });

  it("keeps moved variants' empty content frozen instead of reviving destination content", () => {
    const [variant] = parseVariants([{ id: "moved", inheritance_frozen: true, short: "", description: "" }]);
    expect(resolveVariantProduct(parent, variant).short).toBe("");
    expect(resolveVariantProduct(parent, variant).description).toBe("");
  });

  it("identifies the selected variant without changing the stored product name", () => {
    expect(productDisplayName("PLA + SILK", { name: "SILK 1 PRUEBA" })).toBe("PLA + SILK — SILK 1 PRUEBA");
    expect(productDisplayName("PLA + SILK", null)).toBe("PLA + SILK");
  });
});