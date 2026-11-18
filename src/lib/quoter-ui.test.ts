import { describe, expect, test } from "vitest";
import { normalizeField, type QuoterService } from "./quoter-core";
import {
  accentTokensFor,
  clampSliderValue,
  formatOptionPriceBadge,
  normalizeSiteAnchor,
  resolveServicePrimaryAction,
  sliderPercentage,
} from "./quoter-ui";

describe("Quoter UI & Service Linking Helpers", () => {
  test("normalizeField preserva description y media en opciones", () => {
    const field = normalizeField({
      id: "f1",
      service_id: "s1",
      key: "material",
      label: "Material",
      input_type: "select",
      options: [
        {
          label: "PLA+",
          value: "pla_plus",
          description: "Acabado limpio para prototipos",
          add_cop: 4000,
          multiplier: 1.15,
          media: { url: "https://example.com/pla.jpg", type: "image" },
        },
      ],
    });
    expect(field.options[0]?.description).toBe("Acabado limpio para prototipos");
    expect(field.options[0]?.media?.url).toBe("https://example.com/pla.jpg");
    expect(field.options[0]?.multiplier).toBe(1.15);
  });

  test("normalizeSiteAnchor maneja null/undefined sin lanzar excepciones", () => {
    expect(normalizeSiteAnchor(null)).toBe("");
    expect(normalizeSiteAnchor(undefined)).toBe("");
    expect(normalizeSiteAnchor("  impresion-3d  ")).toBe("impresion-3d");
  });

  test("clampSliderValue alinea al paso y respeta extremos", () => {
    expect(clampSliderValue(15, 0, 100, 10)).toBe(20);
    expect(clampSliderValue(-5, 10, 100, 5)).toBe(10);
    expect(clampSliderValue(150, 10, 100, 5)).toBe(100);
    expect(clampSliderValue(1.26, 0, 5, 0.25)).toBe(1.25);
  });

  test("sliderPercentage calcula porcentaje seguro entre 0 y 100", () => {
    expect(sliderPercentage(50, 0, 100)).toBe(50);
    expect(sliderPercentage(10, 10, 10)).toBe(0);
    expect(sliderPercentage(120, 0, 100)).toBe(100);
    expect(sliderPercentage(-10, 0, 100)).toBe(0);
  });

  test("formatOptionPriceBadge formatea recargo y multiplicador", () => {
    expect(formatOptionPriceBadge({ add_cop: 0, multiplier: 1 })).toBeNull();
    expect(formatOptionPriceBadge({ add_cop: 5000, multiplier: 1 })).toContain("5.000");
    expect(formatOptionPriceBadge({ add_cop: 0, multiplier: 1.5 })).toBe("×1.5");
  });

  test("accentTokensFor devuelve tokens de marca coherentes", () => {
    expect(accentTokensFor("orange").cssVar).toBe("var(--brand-orange)");
    expect(accentTokensFor("teal").deepVar).toBe("var(--brand-teal-deep)");
    expect(accentTokensFor("wine").cssVar).toBe("var(--brand-wine)");
  });

  test("resolveServicePrimaryAction prioriza cotizador activo y cae a WhatsApp si has_calculator es false", () => {
    const quoterServices: QuoterService[] = [
      {
        id: "q-1",
        slug: "impresion-3d",
        name: "Impresión 3D",
        tagline: "",
        description: "",
        icon: "printer",
        site_anchor: "impresion-3d",
        base_price_cop: 0,
        gastos_extra_cop: 0,
        min_price_cop: 18000,
        margin_percent: 20,
        allow_quantity: true,
        allow_file: true,
        is_active: true,
        sort_order: 1,
        has_calculator: true,
        fields: [],
      },
      {
        id: "q-2",
        slug: "servicio-tecnico",
        name: "Mantenimiento",
        tagline: "",
        description: "",
        icon: "wrench",
        site_anchor: "servicio-tecnico",
        base_price_cop: 0,
        gastos_extra_cop: 0,
        min_price_cop: 45000,
        margin_percent: 0,
        allow_quantity: false,
        allow_file: false,
        is_active: true,
        sort_order: 2,
        has_calculator: false,
        whatsapp_custom_message: "Hola! Necesito revisión de impresora.",
        fields: [],
      },
    ];

    const calcAction = resolveServicePrimaryAction({
      serviceTitle: "Impresión 3D",
      serviceSlug: "impresion-3d",
      quoterServiceId: "q-1",
      quoterServices,
    });
    expect(calcAction).toEqual({
      kind: "quoter",
      quoterSlug: "impresion-3d",
      minPriceCop: 18000,
      label: "Cotizar en línea",
    });

    const waFromQuoter = resolveServicePrimaryAction({
      serviceTitle: "Mantenimiento",
      serviceSlug: "servicio-tecnico",
      quoterServiceId: "q-2",
      quoterServices,
    });
    expect(waFromQuoter).toEqual({
      kind: "whatsapp",
      message: "Hola! Necesito revisión de impresora.",
      label: "Cotizar por WhatsApp",
    });

    const waFromServiceTemplate = resolveServicePrimaryAction({
      serviceTitle: "Mantenimiento",
      serviceSlug: "servicio-tecnico",
      quoterServiceId: null,
      whatsappTemplate: "Mensaje personalizado del servicio",
      quoterServices,
    });
    expect(waFromServiceTemplate).toEqual({
      kind: "whatsapp",
      message: "Mensaje personalizado del servicio",
      label: "Cotizar por WhatsApp",
    });
  });
});
