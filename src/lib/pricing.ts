// Motor de cotización dinámica — matemática pura, compartida por el panel,
// la ruta /api/calculate-quote y las herramientas de Kiara.

export type PricingRules = {
  id?: string;
  name: string;
  base_price_per_gram_cop: number;
  machine_hour_cop: number;
  setup_fee_cop: number;
  margin_percent: number;
  min_price_cop: number;
  material_multipliers: Record<string, number>;
  finish_multipliers: Record<string, number>;
  is_active?: boolean;
};

export const DEFAULT_RULES: PricingRules = {
  name: "Reglas principales",
  base_price_per_gram_cop: 120,
  machine_hour_cop: 6000,
  setup_fee_cop: 15000,
  margin_percent: 25,
  min_price_cop: 20000,
  material_multipliers: { PLA: 1, PETG: 1.2, ABS: 1.25, TPU: 1.6, Resina: 1.8 },
  finish_multipliers: { Ninguno: 1, Basico: 1.15, Premium: 1.4 },
};

export type QuoteInput = {
  grams: number;
  hours: number;
  material?: string;
  finish?: string;
  quantity?: number;
};

export type QuoteBreakdown = {
  material: string;
  finish: string;
  quantity: number;
  grams: number;
  hours: number;
  material_multiplier: number;
  finish_multiplier: number;
  material_cost_cop: number;
  machine_cost_cop: number;
  setup_fee_cop: number;
  margin_cop: number;
  unit_price_cop: number;
  total_cop: number;
};

function lookup(map: Record<string, number>, key: string | undefined, fallback = 1) {
  if (!key) return fallback;
  const wanted = key.trim().toLowerCase();
  const hit = Object.entries(map ?? {}).find(([k]) => k.trim().toLowerCase() === wanted);
  return hit ? Number(hit[1]) || fallback : fallback;
}

const round = (n: number) => Math.round(n / 100) * 100;

export function calcQuote(rules: PricingRules, input: QuoteInput): QuoteBreakdown {
  const grams = Math.max(0, Number(input.grams) || 0);
  const hours = Math.max(0, Number(input.hours) || 0);
  const quantity = Math.max(1, Math.round(Number(input.quantity) || 1));

  const materialMult = lookup(rules.material_multipliers, input.material);
  const finishMult = lookup(rules.finish_multipliers, input.finish);

  const materialCost = grams * (Number(rules.base_price_per_gram_cop) || 0) * materialMult;
  const machineCost = hours * (Number(rules.machine_hour_cop) || 0);
  const setup = Number(rules.setup_fee_cop) || 0;

  const base = (materialCost + machineCost + setup) * finishMult;
  const margin = base * ((Number(rules.margin_percent) || 0) / 100);
  const unit = Math.max(Number(rules.min_price_cop) || 0, base + margin);

  return {
    material: input.material?.trim() || "PLA",
    finish: input.finish?.trim() || "Ninguno",
    quantity,
    grams,
    hours,
    material_multiplier: materialMult,
    finish_multiplier: finishMult,
    material_cost_cop: round(materialCost),
    machine_cost_cop: round(machineCost),
    setup_fee_cop: round(setup),
    margin_cop: round(margin),
    unit_price_cop: round(unit),
    total_cop: round(unit * quantity),
  };
}

export function formatCOP(n: number) {
  return (Number(n) || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}
