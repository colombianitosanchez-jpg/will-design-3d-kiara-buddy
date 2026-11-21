import { describe, expect, it, vi } from "vitest";

const { mockRows } = vi.hoisted(() => ({
  mockRows: {
    value: [] as Array<{
      title: string;
      slug: string;
      lead: string;
      bullets: string[];
      kiara_tip: string;
      is_active: boolean;
    }>,
  },
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: mockRows.value, error: null }),
        }),
      }),
    }),
  },
}));

import { formatSiteServicesBlock, siteServicesBlock } from "./kiara-context.server";

describe("kiara-context siteServicesBlock", () => {
  it("retorna cadena vacía cuando no hay servicios activos", async () => {
    mockRows.value = [];
    expect(await siteServicesBlock()).toBe("");
    expect(formatSiteServicesBlock([])).toBe("");
  });

  it("formatea los servicios activos de site_services para el contexto de Kiara", async () => {
    mockRows.value = [
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
