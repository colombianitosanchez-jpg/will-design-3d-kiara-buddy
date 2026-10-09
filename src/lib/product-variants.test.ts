import { describe, expect, it } from "vitest";
import { effectiveButtons, parseVariants, validateVariants } from "./product-variants";

describe("product variants", () => {
  it("productos antiguos sin variantes devuelven lista vacía", () => {
    expect(parseVariants(null)).toEqual([]);
  });
  it("la variante sin botones propios hereda los del producto", () => {
    const parent = [{ id: "p" } as any];
    const [v] = parseVariants([{ id: "a", name: "Rojo" }]);
    expect(effectiveButtons(parent, v)).toBe(parent);
  });
  it("rechaza nombres de variante repetidos", () => {
    const vs = parseVariants([{ name: "Rojo" }, { name: "rojo" }]);
    expect(validateVariants(vs)).not.toBeNull();
  });
});

import { variantGallery as _vg, parseVariants as _pv } from "./product-variants";
describe("galería por variante", () => {
  it("una variante antigua con solo image_url obtiene images = [image_url]", () => {
    const [v] = _pv([{ id: "a", name: "Rojo", image_url: "r.jpg" }]);
    expect(v.images).toEqual(["r.jpg"]);
  });
  it("usa las fotos de la variante y si no tiene, las del producto", () => {
    const [v, w] = _pv([{ id: "a", name: "Rojo", images: ["r1.jpg", "r2.jpg"] }, { id: "b", name: "Azul" }]);
    expect(_vg(["p.jpg"], v)).toEqual(["r1.jpg", "r2.jpg"]);
    expect(_vg(["p.jpg"], w)).toEqual(["p.jpg"]);
  });
});
