import { describe, expect, it } from "vitest";
import { effectiveButtons, getMatchingVariant, normalizeText, parseVariants, validateVariants } from "./product-variants";

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

describe("getMatchingVariant & normalizeText", () => {
  it("normalizeText convierte a minúsculas y remueve tildes", () => {
    expect(normalizeText("VERDE CLARO")).toBe("verde claro");
    expect(normalizeText("Lápiz 3D")).toBe("lapiz 3d");
  });

  it("getMatchingVariant encuentra coincidencia parcial de variante", () => {
    const variants = parseVariants([
      { id: "1", name: "Verde Pino", image_url: "pino.jpg" },
      { id: "2", name: "Verde Biche", image_url: "biche.jpg" },
      { id: "3", name: "UVA Mate", image_url: "uva.jpg" },
    ]);

    expect(getMatchingVariant(variants, "verde")?.name).toBe("Verde Pino");
    expect(getMatchingVariant(variants, "biche")?.name).toBe("Verde Biche");
    expect(getMatchingVariant(variants, "uva")?.name).toBe("UVA Mate");
    expect(getMatchingVariant(variants, "UVA")?.name).toBe("UVA Mate");
    expect(getMatchingVariant(variants, "rosa")).toBeNull();
  });

  it("getMatchingVariant evalúa términos compuestos combinando producto padre y variante ('pla verde')", () => {
    const variants = parseVariants([
      { id: "v-rojo", name: "Rojo" },
      { id: "v-verde", name: "Verde" },
      { id: "v-azul", name: "Azul" },
    ]);
    const parentContext = {
      name: "Filamento PLA 1.75mm",
      brand: { name: "Will 3D" },
      category: { name: "Filamentos" },
    };

    const matched = getMatchingVariant(variants, "pla verde", parentContext);
    expect(matched?.id).toBe("v-verde");
  });

  it("getMatchingVariant funciona con términos cortos como 'v' o 've'", () => {
    const variants = parseVariants([
      { id: "v-rojo", name: "Rojo" },
      { id: "v-verde", name: "Verde" },
    ]);
    expect(getMatchingVariant(variants, "v")?.id).toBe("v-verde");
    expect(getMatchingVariant(variants, "ve")?.id).toBe("v-verde");
  });
});

import { filterProducts } from "./catalog";
describe("filterProducts search relevance", () => {
  it("ordena resultados por relevancia de búsqueda", () => {
    const dummyStoreFilter = { categorySlug: null, branch: [], unknown: false };
    const products: any[] = [
      {
        id: "p1",
        slug: "bambu-lab",
        name: "Bambu Lab Impresora 3D",
        short: "Impresora rápida",
        description: "",
        sku: "IMP-001",
        attributes: [],
        variants: [{ id: "v1", name: "Estándar" }],
      },
      {
        id: "p2",
        slug: "filamento-pla",
        name: "Filamento PLA 1.75mm",
        short: "Filamento básico",
        description: "",
        sku: "FIL-001",
        attributes: [],
        variants: [{ id: "v2", name: "Bambu" }],
      },
    ];

    const results = filterProducts(products, { filter: dummyStoreFilter, query: "Bambu" });
    expect(results[0].id).toBe("p1"); // Nombre de producto coincide directo con 'Bambu' -> mayor puntaje
  });
});
