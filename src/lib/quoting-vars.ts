// Variables globales del cotizador (fila única de admin_settings).
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CustomQuotingVar = {
  key: string;
  label: string;
  value: number;
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

export const DEFAULT_QUOTING_VARS: QuotingVars = {
  fdm_gram_cost: 80,
  resin_ml_cost: 150,
  machine_hour_rate: 2000,
  labor_hour_rate: 15000,
  default_margin: 1.5,
  failure_rate_percentage: 15,
  custom_vars: [
    {
      key: "porcentaje_disenador",
      label: "Porcentaje del Diseñador",
      value: 10,
      formula: "",
      show_in_breakdown: false,
      help: "Comisión o porcentaje para el diseñador del modelo.",
    },
    {
      key: "tarifa_envio_base",
      label: "Tarifa de Envío Base",
      value: 12000,
      formula: "",
      show_in_breakdown: true,
      help: "Envío base nacional o local en COP.",
    },
  ],
};

/** Claves que un campo del cotizador puede usar como origen de su costo unitario. */
export const PRICE_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "fixed", label: "Número fijo del campo" },
  { value: "fdm_gram_cost", label: "Costo por gramo (FDM)" },
  { value: "resin_ml_cost", label: "Costo por ml (resina)" },
  { value: "machine_hour_rate", label: "Hora de máquina" },
  { value: "labor_hour_rate", label: "Hora de mano de obra" },
];

export const QUOTING_VAR_LABELS: { key: keyof Omit<QuotingVars, "custom_vars">; label: string; help: string }[] = [
  { key: "fdm_gram_cost", label: "Costo por gramo (FDM)", help: "Filamento + desperdicio, en COP." },
  { key: "resin_ml_cost", label: "Costo por ml (resina)", help: "Resina por mililitro, en COP." },
  { key: "machine_hour_rate", label: "Hora de máquina", help: "Desgaste y energía por hora." },
  { key: "labor_hour_rate", label: "Hora de mano de obra", help: "Tiempo del equipo por hora." },
  { key: "default_margin", label: "Margen por defecto", help: "Multiplicador sugerido, ej. 1.5." },
  {
    key: "failure_rate_percentage",
    label: "Porcentaje de fallo (%)",
    help: "Se suma a los costos que usan variables globales.",
  },
];

export function normalizeQuotingVars(raw: unknown): QuotingVars {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const num = (k: string, fallback: number) => {
    const n = Number(obj[k]);
    return Number.isFinite(n) ? n : fallback;
  };

  const rawCustom = Array.isArray(obj.custom_vars) ? obj.custom_vars : [];
  const custom_vars: CustomQuotingVar[] = rawCustom.map((item: any) => ({
    key: String(item.key || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
    label: String(item.label || item.key || "Variable"),
    value: Number(item.value) || 0,
    formula: item.formula ? String(item.formula) : "",
    show_in_breakdown: Boolean(item.show_in_breakdown),
    help: item.help ? String(item.help) : "",
  })).filter((v) => Boolean(v.key));

  return {
    fdm_gram_cost: num("fdm_gram_cost", DEFAULT_QUOTING_VARS.fdm_gram_cost),
    resin_ml_cost: num("resin_ml_cost", DEFAULT_QUOTING_VARS.resin_ml_cost),
    machine_hour_rate: num("machine_hour_rate", DEFAULT_QUOTING_VARS.machine_hour_rate),
    labor_hour_rate: num("labor_hour_rate", DEFAULT_QUOTING_VARS.labor_hour_rate),
    default_margin: num("default_margin", DEFAULT_QUOTING_VARS.default_margin),
    failure_rate_percentage: num("failure_rate_percentage", DEFAULT_QUOTING_VARS.failure_rate_percentage),
    custom_vars: custom_vars.length > 0 ? custom_vars : DEFAULT_QUOTING_VARS.custom_vars,
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
