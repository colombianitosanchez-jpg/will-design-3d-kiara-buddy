import { describe, expect, it } from "vitest";
import { assertServiceOrderQuantity, canEditCartQuantity, mergeCartLine } from "./cart-quantity";

describe("Cantidades cotizadas", () => {
  it("un servicio no permite cambiar su cantidad sin volver a cotizar", () => {
    expect(canEditCartQuantity({ kind: "service" })).toBe(false);
    expect(canEditCartQuantity({ kind: "product" })).toBe(true);
  });
  it("añadir de nuevo un servicio reemplaza la cotización y no suma unidades", () => {
    expect(mergeCartLine({ kind: "service", quantity: 1 }, { kind: "service", quantity: 1 }).quantity).toBe(1);
    expect(mergeCartLine({ kind: "service", quantity: 3 }, { kind: "service", quantity: 5 }).quantity).toBe(5);
    expect(mergeCartLine({ kind: "product", quantity: 3 }, { kind: "product", quantity: 5 }).quantity).toBe(8);
  });
  it("checkout rechaza tres unidades cuando el servicio solo permite una", () => {
    expect(() => assertServiceOrderQuantity({ name: "Diseño", allow_quantity: false }, 3)).toThrow("solo admite una unidad");
    expect(() => assertServiceOrderQuantity({ name: "Diseño", allow_quantity: false }, 1)).not.toThrow();
    expect(() => assertServiceOrderQuantity({ name: "Impresión", allow_quantity: true }, 3)).not.toThrow();
  });
});