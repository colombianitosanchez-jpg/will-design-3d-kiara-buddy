import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockState } = vi.hoisted(() => ({
  mockState: {
    siteServices: [] as Array<{
      title: string;
      slug: string;
      lead: string;
      bullets: string[];
      kiara_tip: string;
      is_active: boolean;
    }>,
    categories: [] as Array<{ name: string }>,
    products: [] as Array<{ name: string; slug: string; price_cop: number }>,
    knowledgeBase: [] as Array<{ title: string; content: string }>,
    queriedTables: [] as string[],
    productsLimit: null as number | null,
  },
}));

function makeQuery(table: string) {
  let limitVal: number | null = null;
  const resolveRows = () => {
    if (table === "site_services") return mockState.siteServices;
    if (table === "categories") return mockState.categories;
    if (table === "products") {
      return limitVal !== null ? mockState.products.slice(0, limitVal) : mockState.products;
    }
    if (table === "knowledge_base") return mockState.knowledgeBase;
    return [];
  };

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: (n: number) => {
      limitVal = n;
      if (table === "products") mockState.productsLimit = n;
      return chain;
    },
    then: (
      onFulfilled?: (v: { data: unknown[]; error: null }) => unknown,
      onRejected?: (err: unknown) => unknown,
    ) => Promise.resolve({ data: resolveRows(), error: null }).then(onFulfilled, onRejected),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      mockState.queriedTables.push(table);
      return makeQuery(table);
    },
  },
}));

import {
  MAX_KB_CHARS,
  buildKiaraSystemPrompt,
  formatSiteServicesBlock,
  siteServicesBlock,
} from "./kiara-context.server";

describe("kiara-context siteServicesBlock", () => {
  beforeEach(() => {
    mockState.siteServices = [];
    mockState.categories = [];
    mockState.products = [];
    mockState.knowledgeBase = [];
    mockState.queriedTables = [];
    mockState.productsLimit = null;
  });

  it("retorna cadena vacía cuando no hay servicios activos", async () => {
    mockState.siteServices = [];
    expect(await siteServicesBlock()).toBe("");
    expect(formatSiteServicesBlock([])).toBe("");
  });

  it("formatea los servicios activos de site_services para el contexto de Kiara", async () => {
    mockState.siteServices = [
      {
        title: "Impresión 3D FDM",
        slug: "impresion-fdm",
        lead: "Prototipos funcionales y piezas mecánicas en filamento.",
        bullets: ["PLA, PETG, ABS y ASA", "Volumen hasta 350mm", "Asesoría técnica"],
        kiara_tip: "Pregunta siempre el tamaño aproximado y si va en exterior.",
        is_active: true,
      },
      {
        title: "Escaneo 3D",
        slug: "escaneo-3d",
        lead: "Digitalización de piezas físicas.",
        bullets: ["Alta precisión", "Entrega en STL / OBJ"],
        kiara_tip: "Ideal para ingeniería inversa y repuestos descontinuados.",
        is_active: true,
      },
    ];

    const out = await siteServicesBlock();
    expect(out).toContain("## SERVICIOS DEL TALLER WILL DESIGN 3D");
    expect(out).toContain("- Servicio: Impresión 3D FDM (slug: impresion-fdm)");
    expect(out).toContain("Descripción: Prototipos funcionales y piezas mecánicas en filamento.");
    expect(out).toContain("Puntos destacados: PLA, PETG, ABS y ASA · Volumen hasta 350mm · Asesoría técnica");
    expect(out).toContain("Recomendación de Kiara: Pregunta siempre el tamaño aproximado y si va en exterior.");
    expect(out).toContain("- Servicio: Escaneo 3D (slug: escaneo-3d)");
  });
});

describe("kiara-context buildKiaraSystemPrompt (modo público optimizado)", () => {
  beforeEach(() => {
    mockState.siteServices = [];
    mockState.categories = [];
    mockState.products = [];
    mockState.knowledgeBase = [];
    mockState.queriedTables = [];
    mockState.productsLimit = null;
  });

  it("resume categorías y hasta 6 productos destacados delegando el resto a search_products", async () => {
    mockState.categories = [{ name: "Filamentos" }, { name: "Impresoras 3D" }, { name: "Resinas" }];
    mockState.products = Array.from({ length: 10 }, (_, i) => ({
      name: `Producto Destacado ${i + 1}`,
      slug: `producto-${i + 1}`,
      price_cop: (i + 1) * 50_000,
    }));

    const prompt = await buildKiaraSystemPrompt(false, {});

    expect(MAX_KB_CHARS).toBe(8_000);
    expect(mockState.productsLimit).toBe(6);
    expect(mockState.queriedTables).not.toContain("orders");
    expect(mockState.queriedTables).not.toContain("quotes");

    expect(prompt).toContain("## CATÁLOGO Y LÍNEAS DISPONIBLES");
    expect(prompt).toContain("Categorías principales: Filamentos, Impresoras 3D, Resinas");
    expect(prompt).toContain("Productos destacados:");
    expect(prompt).toContain("Producto Destacado 1");
    expect(prompt).toContain("Producto Destacado 6");
    expect(prompt).not.toContain("Producto Destacado 7");
    expect(prompt).toContain('ejecuta SIEMPRE la herramienta "search_products"');
  });

  it("limita los bloques de contexto público a MAX_KB_CHARS (8.000 caracteres)", async () => {
    mockState.categories = [{ name: "Filamentos" }];
    mockState.knowledgeBase = Array.from({ length: 12 }, (_, i) => ({
      title: `Guía ${i + 1}`,
      content: "x".repeat(1_200),
    }));

    const prompt = await buildKiaraSystemPrompt(false, {});
    const start = prompt.indexOf("[INFORMACIÓN PÚBLICA DE WILL DESIGN 3D]\n");
    const end = prompt.indexOf("\n[FIN DE LA INFORMACIÓN PÚBLICA]");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const inner = prompt.slice(
      start + "[INFORMACIÓN PÚBLICA DE WILL DESIGN 3D]\n".length,
      end,
    );
    // Los bloques de conocimiento posteriores que exceden 8.000 caracteres se omiten.
    expect(inner.length).toBeLessThanOrEqual(MAX_KB_CHARS);
    expect(inner).not.toContain("Guía 12");
  });
});
