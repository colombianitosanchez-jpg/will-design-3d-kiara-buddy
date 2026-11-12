import { describe, it, expect } from "vitest";
import { flattenProductIntoVariants, moveToSlot } from "./product-hierarchy";

const v = (id: string, name: string, extra = {}) => ({
  id, name, image_url: null, images: [], price_cop: null, stock: null,
  is_active: true, custom_buttons: null, allowed_payment_method_ids: null, ...extra,
});

describe("fusión plana de producto con variantes", () => {
  const source = { name: "GLITTER", price_cop: 90000, stock: 5, image_url: "g.jpg", images: ["g.jpg"],
    variants: [v("1", "Rojo"), v("2", "Azul", { price_cop: 95000, images: ["a.jpg"], image_url: "a.jpg" })] };
  const target = { name: "SILK", price_cop: 84000, variants: [v("9", "Rojo")] };
  const out = flattenProductIntoVariants(source, target);

  it("conserva las variantes del destino y suma base + 2 hijas (4 en total, sin subvariantes)", () => {
    expect(out).toHaveLength(4);
    expect(out.every((x) => !("variants" in x))).toBe(true);
  });
  it("las hijas que heredaban precio y fotos del origen quedan con los del origen", () => {
    const rojo = out.find((x) => x.name === "Rojo 2")!;
    expect(rojo.price_cop).toBe(90000);
    expect(rojo.image_url).toBe("g.jpg");
  });
  it("las hijas con valores propios los mantienen", () => {
    const azul = out.find((x) => x.name === "Azul")!;
    expect(azul.price_cop).toBe(95000);
    expect(azul.image_url).toBe("a.jpg");
  });
});

describe("mover a ranura", () => {
  it("mueve hacia abajo", () => expect(moveToSlot(["a", "b", "c"], 0, 3)).toEqual(["b", "c", "a"]));
  it("mueve hacia arriba", () => expect(moveToSlot(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]));
  it("misma posición no cambia", () => expect(moveToSlot(["a", "b", "c"], 1, 2)).toEqual(["a", "b", "c"]));
});
