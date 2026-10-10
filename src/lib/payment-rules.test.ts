import { describe, expect, it } from "vitest";
import { cartLineKey, commonMethods, effectiveAllowed, methodsForLine, parseLineKey } from "./payment-rules";

describe("payment rules", () => {
  it("una variante sin lista propia hereda los métodos del producto", () => {
    expect(effectiveAllowed(["nequi"], null)).toEqual(["nequi"]);
  });
  it("la lista de la variante reemplaza la del producto", () => {
    expect(effectiveAllowed(["nequi", "crypto"], ["efectivo"])).toEqual(["efectivo"]);
  });
  it("lista vacía significa todos los métodos activos", () => {
    expect(methodsForLine(effectiveAllowed([], null), ["a", "b"])).toEqual(["a", "b"]);
  });
  it("PLA azul (Nequi/cripto) y rojo (efectivo) no comparten método", () => {
    const azul = ["nequi", "crypto"];
    const rojo = ["efectivo"];
    expect(commonMethods([azul, rojo], ["nequi", "crypto", "efectivo"])).toEqual([]);
  });
  it("si todos admiten Nequi se puede cobrar completo con Nequi", () => {
    expect(commonMethods([["nequi", "crypto"], ["nequi"], null], ["nequi", "crypto", "efectivo"])).toEqual(["nequi"]);
  });
  it("la clave de línea separa producto y variante", () => {
    expect(parseLineKey(cartLineKey("p1", "v1"))).toEqual({ productId: "p1", variantId: "v1" });
    expect(parseLineKey("p1")).toEqual({ productId: "p1", variantId: null });
  });
});
