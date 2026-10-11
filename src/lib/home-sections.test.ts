import { describe, it, expect } from "vitest";
import { parseHomeSections } from "./home-sections";

describe("parseHomeSections", () => {
  it("respeta el orden guardado (Portafolio antes del carrusel)", () => {
    const r = parseHomeSections(JSON.stringify([{ id: "portfolio", visible: true }, { id: "hero", visible: true }]));
    expect(r.map((s) => s.id)).toEqual(["portfolio", "hero", "services", "products", "quoter"]);
  });
  it("conserva secciones ocultas", () => {
    const r = parseHomeSections(JSON.stringify([{ id: "quoter", visible: false }]));
    expect(r[0]).toEqual({ id: "quoter", visible: false });
  });
  it("sin configuración usa el orden por defecto", () => {
    expect(parseHomeSections("").map((s) => s.id)).toEqual(["hero", "services", "products", "portfolio", "quoter"]);
  });
});
