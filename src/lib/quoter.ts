// Motor del Cotizador configurable: tipos, consultas y matemática pura.
// Todo (servicios, preguntas, deslizadores y precios) se administra en Panel → Cotizador.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type QuoterOption = {
  label: string;
  value: string;
  multiplier?: number;
  add_cop?: number;
};

export type QuoterInputType = "slider" | "select" | "toggle" | "number" | "text";

export type QuoterField = {
  id: string;
  service_id: string;
  key: string;
  label: string;
  help: string;
  input_type: QuoterInputType;
  min_value: number;
  max_value: number;
  step_value: number;
  default_value: string;
  unit: string;
  price_per_unit_cop: number;
  multiplier: number;
  options: QuoterOption[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

export type QuoterService = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  base_price_cop: number;
  min_price_cop: number;
  margin_percent: number;
  allow_quantity: boolean;
  allow_file: boolean;
  is_active: boolean;
  sort_order: number;
  fields: QuoterField[];
};

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeField(row: Record<string, unknown>): QuoterField {
  const rawOptions = Array.isArray(row['options']) ? (row['options'] as unknown[]) : [];
  return {
    id: String(row['id']),
    service_id: String(row['service_id']),
    key: String(row['key']),
    label: String(row['label'] ?? ""),
    help: String(row['help'] ?? ""),
    input_type: (String(row['input_type'] ?? "slider") as QuoterInputType),
    min_value: num(row['min_value']),
    max_value: num(row['max_value'], 100),
    step_value: num(row['step_value'], 1) || 1,
    default_value: String(row['default_value'] ?? ""),
    unit: String(row['unit'] ?? ""),
    price_per_unit_cop: num(row['price_per_unit_cop']),
    multiplier: num(row['multiplier'], 1) || 1,
    options: rawOptions
      .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object")
      .map((o) => ({
        label: String(o['label'] ?? o['value'] ?? ""),
        value: String(o['value'] ?? o['label'] ?? ""),
        multiplier: num(o['multiplier'], 1) || 1,
        add_cop: num(o['add_cop']),
      })),
    is_required: Boolean(row['is_required']),
    is_active: row['is_active'] !== false,
    sort_order: num(row['sort_order']),
  };
}

function normalizeService(
  row: Record<string, unknown>,
  fields: QuoterField[],
): QuoterService {
  return {
    id: String(row['id']),
    slug: String(row['slug']),
    name: String(row['name'] ?? ""),
    tagline: String(row['tagline'] ?? ""),
    description: String(row['description'] ?? ""),
    icon: String(row['icon'] ?? "printer"),
    base_price_cop: num(row['base_price_cop']),
    min_price_cop: num(row['min_price_cop']),
    margin_percent: num(row['margin_percent']),
    allow_quantity: row['allow_quantity'] !== false,
    allow_file: row['allow_file'] !== false,
    is_active: row['is_active'] !== false,
    sort_order: num(row['sort_order']),
    fields: fields
      .filter((f) => f.service_id === String(row['id']))
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
  };
}

/** Servicios + campos del cotizador. `includeInactive` solo se usa en el panel. */
export async function fetchQuoterServices(includeInactive = false): Promise<QuoterService[]> {
  const svcQ = supabase.from("quoter_services").select("*").order("sort_order");
  const fldQ = supabase.from("quoter_fields").select("*").order("sort_order");
  const [svc, fld] = await Promise.all([
    includeInactive ? svcQ : svcQ.eq("is_active", true),
    includeInactive ? fldQ : fldQ.eq("is_active", true),
  ]);
  if (svc.error) throw new Error(svc.error.message);
  if (fld.error) throw new Error(fld.error.message);

  const fields = (fld.data ?? []).map((r) => normalizeField(r as Record<string, unknown>));
  return (svc.data ?? []).map((r) => normalizeService(r as Record<string, unknown>, fields));
}

export const quoterServicesQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: ["quoter-services", includeInactive],
    queryFn: () => fetchQuoterServices(includeInactive),
    staleTime: 60_000,
  });

export type QuoterValues = Record<string, string>;

export function defaultValuesFor(service: QuoterService): QuoterValues {
  const out: QuoterValues = {};
  for (const f of service.fields) {
    if (f.default_value) out[f.key] = f.default_value;
    else if (f.input_type === "select") out[f.key] = f.options[0]?.value ?? "";
    else if (f.input_type === "toggle") out[f.key] = "no";
    else if (f.input_type === "slider" || f.input_type === "number")
      out[f.key] = String(f.min_value);
    else out[f.key] = "";
  }
  return out;
}

export type QuoterLine = { label: string; detail: string; amount: number };

export type QuoterResult = {
  lines: QuoterLine[];
  multiplier: number;
  subtotal_cop: number;
  margin_cop: number;
  unit_price_cop: number;
  quantity: number;
  total_cop: number;
  min_applied: boolean;
  answers: { label: string; value: string }[];
};

const round100 = (n: number) => Math.round(n / 100) * 100;

export function isOn(value: string | undefined) {
  const v = (value ?? "").trim().toLowerCase();
  return v === "si" || v === "sí" || v === "true" || v === "1" || v === "yes";
}

/** Precio en vivo: (base + recargos) × multiplicadores + margen, con mínimo y cantidad. */
export function computeQuote(
  service: QuoterService,
  values: QuoterValues,
  quantity = 1,
): QuoterResult {
  const lines: QuoterLine[] = [];
  const answers: { label: string; value: string }[] = [];
  let add = num(service.base_price_cop);
  let multiplier = 1;

  if (add > 0) lines.push({ label: "Base del servicio", detail: service.name, amount: add });

  for (const f of service.fields) {
    if (!f.is_active) continue;
    const raw = values[f.key] ?? "";

    if (f.input_type === "slider" || f.input_type === "number") {
      const v = num(raw);
      const amount = v * num(f.price_per_unit_cop);
      answers.push({ label: f.label, value: `${v}${f.unit ? ` ${f.unit}` : ""}` });
      if (amount) {
        add += amount;
        lines.push({ label: f.label, detail: `${v}${f.unit ? ` ${f.unit}` : ""}`, amount });
      }
      if (f.multiplier !== 1) multiplier *= f.multiplier;
      continue;
    }

    if (f.input_type === "select") {
      const opt = f.options.find((o) => o.value === raw) ?? null;
      if (!opt) continue;
      answers.push({ label: f.label, value: opt.label });
      if (opt.add_cop) {
        add += opt.add_cop;
        lines.push({ label: f.label, detail: opt.label, amount: opt.add_cop });
      }
      if (opt.multiplier && opt.multiplier !== 1) multiplier *= opt.multiplier;
      continue;
    }

    if (f.input_type === "toggle") {
      const on = isOn(raw);
      const opt = f.options[0];
      answers.push({ label: f.label, value: on ? (opt?.label ?? "Sí") : "No" });
      if (on && opt) {
        if (opt.add_cop) {
          add += opt.add_cop;
          lines.push({ label: f.label, detail: opt.label, amount: opt.add_cop });
        }
        if (opt.multiplier && opt.multiplier !== 1) multiplier *= opt.multiplier;
      }
      continue;
    }

    if (raw.trim()) answers.push({ label: f.label, value: raw.trim() });
  }

  const subtotal = add * multiplier;
  const margin = subtotal * (num(service.margin_percent) / 100);
  const withMargin = subtotal + margin;
  const min = num(service.min_price_cop);
  const unit = Math.max(min, withMargin);
  const qty = Math.max(1, Math.round(num(quantity, 1)));

  return {
    lines,
    multiplier,
    subtotal_cop: round100(subtotal),
    margin_cop: round100(margin),
    unit_price_cop: round100(unit),
    quantity: qty,
    total_cop: round100(unit * qty),
    min_applied: withMargin < min,
    answers,
  };
}

export function formatCOP(n: number) {
  return (Number(n) || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}
