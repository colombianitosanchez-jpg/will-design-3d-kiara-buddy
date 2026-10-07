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
