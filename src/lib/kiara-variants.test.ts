import { describe, expect, it } from "vitest";
import { parseVariants } from "@/lib/product-variants";

describe("kiara variants support", () => {
  it("extrae variantes activas formateadas con coma y espacio limpio", () => {
    const rawVariants = [
      { id: "1", name: "Rojo ", is_active: true },
      { id: "2", name: " Azul", is_active: true },
      { id: "3", name: "Inactivo", is_active: false },
      { id: "4", name: "", is_active: true },
    ];

    const active = parseVariants(rawVariants)
      .filter((v) => v.is_active !== false && v.name.trim())
      .map((v) => v.name.trim());

    expect(active).toEqual(["Rojo", "Azul"]);
    expect(active.join(", ")).toBe("Rojo, Azul");
  });
});
