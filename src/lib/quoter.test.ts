import { describe, expect, test } from "vitest";
import { computeQuote, coerceAnswers, type QuoterService, type QuoterVars } from "./quoter-core";

const mockVars: QuoterVars = {
  fdm_gram_cost: 100,
  resin_ml_cost: 200,
  machine_hour_rate: 3000,
  labor_hour_rate: 20000,
  default_margin: 1.5,
  failure_rate_percentage: 10,
};

const mockService: QuoterService = {
  id: "test-service",
  slug: "impresion-3d",
  name: "Impresión 3D Test",
  tagline: "Prueba unitaria",
  description: "Descripción de prueba",
  icon: "printer",
  site_anchor: "impresion-3d",
  base_price_cop: 5000,
  gastos_extra_cop: 2000,
  min_price_cop: 10000,
  margin_percent: 20,
  pricing_mode: "formula",
  uses_global_vars: true,
  price_display: "final",
  allow_quantity: true,
  allow_file: true,
  is_active: true,
  sort_order: 1,
  volume_tiers: [
    { min_qty: 1, max_qty: 5, discount_percentage: 0 },
    { min_qty: 6, max_qty: 20, discount_percentage: 15 },
  ],
  fields: [
    {
      id: "f1",
      service_id: "test-service",
      key: "peso_gramos",
      label: "Peso de la pieza",
      help: "en gramos",
      input_type: "slider",
      min_value: 0,
      max_value: 1000,
      step_value: 1,
      default_value: "100",
      unit: "g",
      price_per_unit_cop: 0,
      price_source: "fdm_gram_cost",
      multiplier: 1,
      options: [],
      is_required: true,
      is_active: true,
      sort_order: 1,
    },
  ],
};

describe("Quoter Engine & Price Security", () => {
  test("Calcula correctamente usando variables globales y porcentaje de fallo", () => {
    // 100g * (100 COP/g * (1 + 0.10 fallo)) = 11000 COP
    // Base (5000) + Peso (11000) = 16000 Subtotal
    // Margen 20% = 3200
    // Subtotal + Margen = 19200 + Gastos extra (2000) = 21200 Unit
    const result = computeQuote(mockService, { peso_gramos: "100" }, 1, mockVars);
    expect(result.total_cop).toBeGreaterThan(20000);
    expect(result.quantity).toBe(1);
  });

  test("Aplica descuentos por volumen (volume tiers)", () => {
    // 1 unidad vs 10 unidades
    const result1 = computeQuote(mockService, { peso_gramos: "100" }, 1, mockVars);
    const result10 = computeQuote(mockService, { peso_gramos: "100" }, 10, mockVars);

    const unitPrice1 = result1.unit_price_cop;
    const unitPrice10 = result10.unit_price_cop;

    expect(unitPrice10).toBeLessThan(unitPrice1);
  });

  test("Respeta precio mínimo configurado", () => {
    const cheapService: QuoterService = {
      ...mockService,
      base_price_cop: 1000,
      min_price_cop: 25000,
      fields: [],
    };
    const result = computeQuote(cheapService, {}, 1, mockVars);
    expect(result.min_applied).toBe(true);
    expect(result.total_cop).toBeGreaterThanOrEqual(25000);
  });

  test("Modo precio fijo funciona con cantidad", () => {
    const fixedService: QuoterService = {
      ...mockService,
      pricing_mode: "fixed",
      base_price_cop: 150000,
      gastos_extra_cop: 0,
      min_price_cop: 0,
      margin_percent: 0,
      fields: [],
    };
    const result = computeQuote(fixedService, {}, 2, mockVars);
    expect(result.total_cop).toBe(300000);
  });

  test("CoerceAnswers extrae respuestas numéricas y opciones de texto correctamente", () => {
    const values = coerceAnswers(mockService, {
      peso: "250",
    });
    expect(values["peso_gramos"]).toBe("250");
  });
});
