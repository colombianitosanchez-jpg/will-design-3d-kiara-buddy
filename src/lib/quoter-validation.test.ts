import { resolveServicePrimaryAction } from "./quoter-ui";
import { describe, expect, test } from "vitest";
import { computeQuote, evaluateFormula, fieldConfigurationError, normalizeField, normalizeService, quoteAnswerErrors } from "./quoter-core";

const field = normalizeField({ id: "f", service_id: "s", key: "peso", label: "Peso", min_value: 10, max_value: 100, step_value: 5, price_per_unit_cop: 100, is_active: true });
const service = normalizeService({ id: "s", name: "Impresión", slug: "impresion", allow_quantity: true }, [field]);

test("WhatsApp explícito no vuelve a cotizador por coincidencia de slug", () => {
  const result = resolveServicePrimaryAction({ serviceTitle: "Impresión", serviceSlug: "impresion", quoterServices: [service], contactMode: "whatsapp" });
  expect(result.kind).toBe("whatsapp");
});

test("un cotizador oculto no genera un enlace público", () => {
  const result = resolveServicePrimaryAction({ serviceTitle: "Impresión", serviceSlug: "impresion", quoterServices: [{ ...service, is_active: false }], quoterServiceId: "s" });
  expect(result.kind).toBe("whatsapp");
});

describe("Cotización consistente entre panel, cliente y cobro", () => {
  test("los valores fuera del rango no generan precios negativos", () => {
    expect(computeQuote(service, { peso: "-500" }).total_cop).toBe(1000);
    expect(quoteAnswerErrors(service, { peso: "-500" })).toHaveLength(1);
  });
  test("un servicio sin selector siempre calcula una unidad", () => {
    expect(computeQuote({ ...service, allow_quantity: false }, { peso: "20" }, 20).quantity).toBe(1);
    expect(computeQuote({ ...service, allow_quantity: false }, { peso: "20" }, 20).total_cop).toBe(2000);
  });
  test("precio unitario por cantidad coincide con el total", () => {
    const result = computeQuote({ ...service, base_price_cop: 123 }, { peso: "20" }, 3);
    expect(result.unit_price_cop).toBe(2100);
    expect(result.total_cop).toBe(6300);
  });
  test("el precio fijo respeta la revisión obligatoria", () => {
    const result = computeQuote({ ...service, pricing_mode: "fixed", base_price_cop: 5000, requires_approval: true }, { peso: "20" });
    expect(result.total_cop).toBe(5000);
    expect(result.requires_approval).toBe(true);
    expect(result.answers).toEqual([{ label: "Peso", value: "20" }]);
  });
  test("descuento por volumen usa la cantidad real", () => {
    const result = computeQuote({ ...service, volume_tiers: [{ min_qty: 10, max_qty: null, discount_percentage: 20 }] }, { peso: "20" }, 10);
    expect(result.unit_price_cop).toBe(1600);
    expect(result.total_cop).toBe(16000);
  });
  test("la simulación rechaza claves repetidas y rangos inválidos", () => {
    expect(fieldConfigurationError({ ...field, max_value: 0 }, [field])).not.toBeNull();
    expect(fieldConfigurationError(field, [{ ...field, id: "otra" }])).not.toBeNull();
  });
  test("preguntas obligatorias vacías impiden enviar", () => {
    const text = { ...field, input_type: "text" as const, is_required: true };
    expect(quoteAnswerErrors({ ...service, fields: [text] }, { peso: "" })).toEqual(["Completa Peso"]);
  });
  test("la fórmula evalúa aritmética sin ejecutar JavaScript", () => {
    expect(evaluateFormula("2 ^ 3")).toBe(8);
    expect(evaluateFormula("Math.random()")).toBe(0);
    expect(evaluateFormula("100 / (2 - 2)")).toBe(0);
  });
  test("variable calculada de costo respeta su fórmula incluso con valor guardado diferente", () => {
    const vars = { fdm_gram_cost: 80, resin_ml_cost: 0, machine_hour_rate: 0, labor_hour_rate: 0, default_margin: 1, failure_rate_percentage: 0, custom_vars: [{ key: "fdm_gram_cost", label: "Costo", value: 80, formula: "40 + 60", show_in_breakdown: false }] };
    expect(computeQuote({ ...service, fields: [{ ...field, price_source: "fdm_gram_cost" }] }, { peso: "20" }, 1, vars).total_cop).toBe(2000);
  });
});