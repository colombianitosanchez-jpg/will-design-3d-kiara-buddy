import { describe, expect, test } from "vitest";
import { computeQuote, coerceAnswers, evaluateFormula, type QuoterService, type QuoterVars } from "./quoter-core";

const mockVars: QuoterVars = {
  fdm_gram_cost: 100,
  resin_ml_cost: 200,
  machine_hour_rate: 3000,
  labor_hour_rate: 20000,
  default_margin: 1.5,
  failure_rate_percentage: 10,
  custom_vars: [
    {
      key: "precio_bobina",
      label: "Precio Bobina",
      value: 80000,
      show_in_breakdown: false,
    },
    {
      key: "peso_bobina",
      label: "Peso Bobina Gramos",
      value: 1000,
      show_in_breakdown: false,
    },
    {
      key: "costo_gramo_calculado",
      label: "Costo por Gramo Calculado",
      value: 0,
      formula: "(precio_bobina / peso_bobina) * 1.05",
      show_in_breakdown: false,
    },
  ],
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

describe("Quoter Engine & Formula Parser AST", () => {
  test("evaluateFormula calcula correctamente operaciones compuestas y jerarquía de paréntesis", () => {
    const expr = "(precio_bobina / peso_bobina) * 1.05";
    const ctx = { precio_bobina: 80000, peso_bobina: 1000 };
    const res = evaluateFormula(expr, ctx);
    // (80000 / 1000) * 1.05 = 80 * 1.05 = 84
    expect(res).toBeCloseTo(84, 2);
  });

  test("evaluateFormula maneja corchetes {{clave}} y espacios correctamente", () => {
    const expr = "({{luz_kwh}} * {{potencia_kw}}) + {{amortizacion_hora}}";
    const ctx = { luz_kwh: 700, potencia_kw: 0.3, amortizacion_hora: 500 };
    const res = evaluateFormula(expr, ctx);
    // (700 * 0.3) + 500 = 210 + 500 = 710
    expect(res).toBe(710);
  });

  test("evaluateFormula maneja división por cero devolviendo 0 de forma segura", () => {
    const expr = "100 / 0";
    const res = evaluateFormula(expr, {});
    expect(res).toBe(0);
  });

  test("Calcula variables globales encadenadas dinámicamente con fórmulas", () => {
    const result = computeQuote(mockService, { peso_gramos: "100" }, 1, mockVars);
    expect(result.total_cop).toBeGreaterThan(20000);
  });

  test("Evalúa Master Formula del servicio cuando está configurada", () => {
    const masterService: QuoterService = {
      ...mockService,
      formula: "(peso_gramos * costo_gramo_calculado) + base_price",
      fields: [
        {
          id: "f1",
          service_id: "test-service",
          key: "peso_gramos",
          label: "Peso",
          help: "",
          input_type: "slider",
          min_value: 0,
          max_value: 1000,
          step_value: 1,
          default_value: "100",
          unit: "g",
          price_per_unit_cop: 0,
          price_source: "fixed",
          multiplier: 1,
          options: [],
          is_required: true,
          is_active: true,
          sort_order: 1,
        },
      ],
    };

    // peso_gramos (100) * costo_gramo_calculado (84) + base_price (5000) = 8400 + 5000 = 13400
    // + margen 20% = 16080 + extra (2000) = 18080
    const res = computeQuote(masterService, { peso_gramos: "100" }, 1, mockVars);
    expect(res.total_cop).toBeGreaterThanOrEqual(18000);
  });

  test("Aplica descuentos por volumen (volume tiers)", () => {
    const result1 = computeQuote(mockService, { peso_gramos: "100" }, 1, mockVars);
    const result10 = computeQuote(mockService, { peso_gramos: "100" }, 10, mockVars);

    expect(result10.unit_price_cop).toBeLessThan(result1.unit_price_cop);
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

  test("CoerceAnswers extrae respuestas numéricas correctamente", () => {
    const values = coerceAnswers(mockService, {
      peso: "250",
    });
    expect(values["peso_gramos"]).toBe("250");
  });
});
