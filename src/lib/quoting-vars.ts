// Variables globales del cotizador (fila única de admin_settings).
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CustomQuotingVar = {
  key: string;
  label: string;
  value: number;
  unit?: string;
  formula?: string; // e.g. "(envio + impuesto - descuento) / 20"
  show_in_breakdown: boolean; // Elegir si se muestra al cliente o no
  help?: string;
};

export type QuotingVars = {
  fdm_gram_cost: number;
  resin_ml_cost: number;
  machine_hour_rate: number;
  labor_hour_rate: number;
  default_margin: number;
  failure_rate_percentage: number;
  custom_vars: CustomQuotingVar[];
};

export const BASE_GLOBAL_VARS_DEFAULTS: CustomQuotingVar[] = [
  {
    key: "fdm_gram_cost",
    label: "Costo por gramo (FDM)",
    value: 80,
    unit: "COP/g",
    formula: "",
    show_in_breakdown: false,
    help: "Filamento + desperdicio, en COP.",
  },
  {
    key: "resin_ml_cost",
    label: "Costo por ml (Resina)",
    value: 150,
    unit: "COP/ml",
    formula: "",
    show_in_breakdown: false,
    help: "Resina por mililitro, en COP.",
  },
  {
    key: "machine_hour_rate",
    label: "Hora de máquina",
    value: 2000,
    unit: "COP/h",
    formula: "",
    show_in_breakdown: false,
    help: "Desgaste y energía por hora.",
  },
  {
    key: "labor_hour_rate",
    label: "Hora de mano de obra",
    value: 15000,
    unit: "COP/h",
    formula: "",
    show_in_breakdown: false,
    help: "Tiempo del equipo por hora.",
  },
  {
    key: "default_margin",
    label: "Margen por defecto",
    value: 1.5,
    unit: "x",
    formula: "",
    show_in_breakdown: false,
    help: "Multiplicador sugerido, ej. 1.5.",
  },
  {
    key: "failure_rate_percentage",
    label: "Porcentaje de fallo (%)",
    value: 15,
    unit: "%",
    formula: "",
    show_in_breakdown: false,
    help: "Se suma a los costos que usan variables globales.",
  },
  {
    key: "porcentaje_disenador",
    label: "Porcentaje del Diseñador",
    value: 10,
    unit: "%",
    formula: "",
    show_in_breakdown: false,
    help: "Comisión o porcentaje para el diseñador del modelo.",
  },
  {
    key: "tarifa_envio_base",
    label: "Tarifa de Envío Base",
    value: 12000,
    unit: "COP",
    formula: "",
    show_in_breakdown: true,
    help: "Envío base nacional o local en COP.",
  },
];

export const DEFAULT_QUOTING_VARS: QuotingVars = {
  fdm_gram_cost: 80,
  resin_ml_cost: 150,
  machine_hour_rate: 2000,
  labor_hour_rate: 15000,
  default_margin: 1.5,
  failure_rate_percentage: 15,
  custom_vars: BASE_GLOBAL_VARS_DEFAULTS,
};

/** Genera dinámicamente las opciones de price_source basadas en todas las variables globales disponibles. */
export function getDynamicPriceSourceOptions(vars?: QuotingVars): { value: string; label: string }[] {
  const options = [{ value: "fixed", label: "Número fijo del campo" }];

  if (!vars?.custom_vars || vars.custom_vars.length === 0) {
    for (const def of BASE_GLOBAL_VARS_DEFAULTS) {
      options.push({ value: def.key, label: `${def.label} (${def.key})` });
    }
    return options;
  }

  for (const v of vars.custom_vars) {
    options.push({
      value: v.key,
      label: `${v.label || v.key} (${v.key})`,
    });
  }

  return options;
}

export function normalizeQuotingVars(raw: unknown): QuotingVars {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const num = (k: string, fallback: number) => {
    const n = Number(obj[k]);
    return Number.isFinite(n) ? n : fallback;
  };

  const rawCustom = Array.isArray(obj.custom_vars) ? obj.custom_vars : [];
  let custom_vars: CustomQuotingVar[] = rawCustom
    .map((item: any) => ({
      key: String(item.key || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
      label: String(item.label || item.key || "Variable"),
      value: Number(item.value) || 0,
      unit: item.unit ? String(item.unit) : "",
      formula: item.formula ? String(item.formula) : "",
      show_in_breakdown: Boolean(item.show_in_breakdown),
      help: item.help ? String(item.help) : "",
    }))
    .filter((v) => Boolean(v.key));

  if (custom_vars.length === 0) {
    // Si no había custom_vars explícitas, migramos los valores legacy base a la lista editable
    custom_vars = BASE_GLOBAL_VARS_DEFAULTS.map((def) => {
      const legacyVal = num(def.key, def.value);
      return { ...def, value: legacyVal };
    });
  } else {
    // Garantizar que si alguna variable base falta en custom_vars, la incluimos
    for (const def of BASE_GLOBAL_VARS_DEFAULTS) {
      if (!custom_vars.some((c) => c.key === def.key)) {
        custom_vars.push({
          ...def,
          value: num(def.key, def.value),
        });
      }
    }
  }

  // Sincronizar los campos legacy de QuotingVars con los valores presentes en custom_vars
  const findVal = (k: string, fallback: number) => {
    const found = custom_vars.find((c) => c.key === k);
    return found ? found.value : num(k, fallback);
  };

  const fdm = findVal("fdm_gram_cost", DEFAULT_QUOTING_VARS.fdm_gram_cost);
  const resin = findVal("resin_ml_cost", DEFAULT_QUOTING_VARS.resin_ml_cost);
  const machine = findVal("machine_hour_rate", DEFAULT_QUOTING_VARS.machine_hour_rate);
  const labor = findVal("labor_hour_rate", DEFAULT_QUOTING_VARS.labor_hour_rate);
  const margin = findVal("default_margin", DEFAULT_QUOTING_VARS.default_margin);
  const failure = findVal("failure_rate_percentage", DEFAULT_QUOTING_VARS.failure_rate_percentage);

  return {
    fdm_gram_cost: fdm,
    resin_ml_cost: resin,
    machine_hour_rate: machine,
    labor_hour_rate: labor,
    default_margin: margin,
    failure_rate_percentage: failure,
    custom_vars,
  };
}

export async function fetchQuotingVars(): Promise<{ id: string | null; vars: QuotingVars }> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("id, quoting_vars")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { id: null, vars: DEFAULT_QUOTING_VARS };
  const row = data as { id: string; quoting_vars: unknown };
  return { id: row.id, vars: normalizeQuotingVars(row.quoting_vars) };
}

export const quotingVarsQuery = () =>
  queryOptions({
    queryKey: ["admin_settings", "quoting_vars"],
    queryFn: fetchQuotingVars,
    staleTime: 60_000,
  });

export async function saveQuotingVars(rowId: string, vars: QuotingVars) {
  const { error } = await supabase
    .from("admin_settings")
    .update({ quoting_vars: vars } as never)
    .eq("id", rowId);
  if (error) throw error;
}
