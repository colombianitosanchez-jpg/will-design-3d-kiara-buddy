import { describe, expect, it } from "vitest";
import { effectiveButtons, getMatchingVariant, getMatchingVariants, normalizeText, parseVariants, validateVariants } from "./product-variants";

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

  it("getMatchingVariants devuelve TODAS las variantes coincidentes (ej. 've')", () => {
    const variants = parseVariants([
      { id: "v1", name: "Verde Claro" },
      { id: "v2", name: "Verde Militar" },
      { id: "v3", name: "Verde Neón" },
      { id: "v4", name: "Azul Rey" },
    ]);
    const matches = getMatchingVariants(variants, "ve");
    expect(matches).toHaveLength(3);
    expect(matches.map((m) => m.name)).toEqual(["Verde Claro", "Verde Militar", "Verde Neón"]);
  });
});

import { filterProducts } from "./catalog";
describe("filterProducts search relevance & strict match", () => {
  const dummyStoreFilter = { categorySlug: null, branch: [], unknown: false };

  it("descarta estrictamente productos irrelevantes", () => {
    const products: any[] = [
      {
        id: "p1",
        name: "Filamento PLA Verde",
        short: "Color verde",
        description: "",
        attributes: [],
        variants: [{ name: "Verde Claro" }],
      },
      {
        id: "p2",
        name: "Resina ABS-like",
        short: "Gris",
        description: "Sin coincidencia",
        attributes: [],
        variants: [{ name: "Gris" }],
      },
    ];

    const results = filterProducts(products, { filter: dummyStoreFilter, query: "ve" });
    expect(results.map((p) => p.id)).toEqual(["p1"]);
  });

  it("ordena según ranking de relevancia (Título > Variante > Descripción)", () => {
    const products: any[] = [
      {
        id: "p-desc",
        name: "Impresora K1",
        short: "Soporta filamentos de color verde",
        description: "",
        attributes: [],
        variants: [],
      },
      {
        id: "p-title",
        name: "Verde Menta Filamento",
        short: "",
        description: "",
        attributes: [],
        variants: [],
      },
      {
        id: "p-variant",
        name: "Filamento PETG 1kg",
        short: "",
        description: "",
        attributes: [],
        variants: [{ name: "Verde Esmeralda" }],
      },
    ];

    const results = filterProducts(products, { filter: dummyStoreFilter, query: "verde" });
    expect(results.map((p) => p.id)).toEqual(["p-title", "p-variant", "p-desc"]);
  });
});
