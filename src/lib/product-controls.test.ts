import { describe, expect, it } from "vitest";
import { parseVariants, resolveVariantProduct } from "./product-variants";
import { flattenProductIntoVariants, freezeVariantInheritance, moveToSlot, variantToProduct } from "./product-hierarchy";
import { featuredProductItems, type Product } from "./catalog";
import { parseProductButtons } from "./product-buttons";

const parent: Product & { allowed_payment_method_ids: string[] } = { id: "parent", slug: "pla", name: "PLA", price_cop: 85000, stock: 12, short: "Resumen padre", description: "Descripción padre", specs: [{ label: "Material", value: "PLA" }], accepts_3d_file: true, quote_only: true, custom_buttons: [], allowed_payment_method_ids: [], image_url: "parent.jpg", images: [], btn_text: "Ver más", show_whatsapp: false, hide_default_cta: false, custom_share_text: null, kiara_tip: "", sku: null, active: true, featured: false, category: null, brand: null, attributes: [], variants: [], variant_label: "Color" };
const variant = (patch = {}) => parseVariants([{ id: "red", name: "Rojo", ...patch }])[0];

describe("controles restaurados", () => {
  it("la variante antigua hereda controles comerciales en vez de desactivarlos", () => {
    expect(resolveVariantProduct(parent, variant()).accepts_3d_file).toBe(true);
    expect(resolveVariantProduct(parent, variant()).quote_only).toBe(true);
  });
  it("un false propio prevalece sobre true del padre", () => {
    expect(resolveVariantProduct(parent, variant({ quote_only: false })).quote_only).toBe(false);
  });
  it("descripciones propias y especificaciones sobreviven a serializar y volver a leer", () => {
    const v = variant({ short: "Resumen rojo", description: "Descripción roja", specs: [{ label: "Color", value: "Rojo" }], custom_share_text: "Quiero rojo", featured: true });
    const parsed = parseVariants(JSON.parse(JSON.stringify([v])))[0];
    const resolved = resolveVariantProduct(parent, parsed);
    expect(resolved.short).toBe("Resumen rojo");
    expect(resolved.description).toBe("Descripción roja");
    expect(resolved.specs).toEqual([{ label: "Color", value: "Rojo" }]);
    expect(resolved.custom_share_text).toBe("Quiero rojo");
    expect(parsed.featured).toBe(true);
  });
  it("los textos vacíos heredan del padre", () => {
    expect(resolveVariantProduct(parent, variant({ short: "", description: "" })).description).toBe("Descripción padre");
  });
  it("mover conserva precio, fotos y configuraciones heredadas del origen", () => {
    const moved = freezeVariantInheritance(variant(), parent);
    const resolved = resolveVariantProduct({ ...parent, price_cop: 1000, short: "Destino", image_url: "target.jpg" }, moved);
    expect(moved.id).toBe("red");
    expect(resolved.price_cop).toBe(85000);
    expect(resolved.short).toBe("Resumen padre");
    expect(resolved.image_url).toBe("parent.jpg");
  });
  it("listas vacías propias de botones no reaparecen al independizar", () => {
    const buttons = parseProductButtons([{ id: "b", text: "Comprar", action_type: "whatsapp", action_value: "", media_mode: "none" }]);
    const standalone = variantToProduct(variant({ custom_buttons: [] }), { ...parent, custom_buttons: [...buttons] });
    expect(standalone.custom_buttons).toEqual([]);
  });
  it("fusionar un padre con dos variantes produce tres hermanos conservando identidades", () => {
    const out = flattenProductIntoVariants({ ...parent, variants: [variant(), variant({ id: "blue", name: "Azul", short: "Azul propio" })] }, { name: "Destino", price_cop: 10 });
    expect(out.map((v) => v.id)).toEqual(["parent", "red", "blue"]);
    expect(out.every((v) => !("variants" in v))).toBe(true);
    expect(out[2].short).toBe("Azul propio");
  });
  it("una colisión de identidad aborta en vez de duplicar", () => {
    expect(() => flattenProductIntoVariants({ ...parent, variants: [variant()] }, { name: "Destino", price_cop: 10, variants: [variant()] })).toThrow("identidad");
  });
  it("un origen vacío no adquiere descripciones ni especificaciones del nuevo padre", () => {
    const moved = freezeVariantInheritance(variant(), { ...parent, short: "", description: "", specs: [] });
    const read = parseVariants(JSON.parse(JSON.stringify([moved])))[0];
    const resolved = resolveVariantProduct(parent, read);
    expect(resolved.short).toBe("");
    expect(resolved.description).toBe("");
    expect(resolved.specs).toEqual([]);
  });
  it("el primer producto pasa a quinta posición", () => {
    expect(moveToSlot(["1", "2", "3", "4", "5", "6"], 0, 5)).toEqual(["2", "3", "4", "5", "1", "6"]);
  });
  it("una variante destacada entra aunque su padre no esté destacado; oculta no entra", () => {
    const products = [{ ...parent, active: true, featured: false, variants: [variant({ featured: true }), variant({ id: "hidden", featured: true, is_active: false })] }];
    const items = featuredProductItems(products);
    expect(items.map((item) => item.variant?.id)).toEqual(["red"]);
  });
});