import { describe, expect, it } from "vitest";
import { parseHomeOrder } from "./home-sections";

describe("parseHomeOrder", () => {
  it("respeta el orden guardado (Instagram primero)", () => {
    expect(parseHomeOrder('["portfolio","hero"]').slice(0, 2)).toEqual(["portfolio", "hero"]);
  });
  it("sin configuración usa el orden por defecto", () => {
    expect(parseHomeOrder("")).toEqual(["hero", "services", "products", "portfolio", "quoter"]);
  });
  it("ignora claves desconocidas y agrega las faltantes", () => {
    expect(parseHomeOrder('["x","quoter"]')).toEqual(["quoter", "hero", "services", "products", "portfolio"]);
  });
});
