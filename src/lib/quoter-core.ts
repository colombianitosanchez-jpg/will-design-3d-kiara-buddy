// Motor del Cotizador (puro): tipos, normalización y matemática.
// No importa Supabase, así puede usarse igual en el navegador y en el servidor.

export type QuoterOption = {
  label: string;
  value: string;
  multiplier?: number;
  add_cop?: number;
};

export type QuoterInputType = "slider" | "select" | "toggle" | "number" | "text";

/** Origen del costo unitario: número fijo del campo o una variable global. */
export type QuoterPriceSource =
  | "fixed"
  | "fdm_gram_cost"
  | "resin_ml_cost"
  | "machine_hour_rate"
  | "labor_hour_rate";

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
  price_source: QuoterPriceSource;
  multiplier: number;
  options: QuoterOption[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

/** Variables globales del cotizador que pueden alimentar el costo de un campo. */
export type QuoterVars = {
  fdm_gram_cost: number;
  resin_ml_cost: number;
  machine_hour_rate: number;
  labor_hour_rate: number;
  default_margin: number;
  failure_rate_percentage: number;
};

export type QuoterService = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  site_anchor: string;
  base_price_cop: number;
  /** Gastos extra fijos (montaje / post-procesado) que se suman al total. */
  gastos_extra_cop: number;
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

export function normalizeField(row: Record<string, unknown>): QuoterField {
  const rawOptions = Array.isArray(row["options"]) ? (row["options"] as unknown[]) : [];
  return {
    id: String(row["id"]),
    service_id: String(row["service_id"]),
    key: String(row["key"]),
    label: String(row["label"] ?? ""),
    help: String(row["help"] ?? ""),
    input_type: String(row["input_type"] ?? "slider") as QuoterInputType,
    min_value: num(row["min_value"]),
    max_value: num(row["max_value"], 100),
    step_value: num(row["step_value"], 1) || 1,
    default_value: String(row["default_value"] ?? ""),
    unit: String(row["unit"] ?? ""),
    price_per_unit_cop: num(row["price_per_unit_cop"]),
    price_source: (String(row["price_source"] ?? "fixed") || "fixed") as QuoterPriceSource,
    multiplier: num(row["multiplier"], 1) || 1,
    options: rawOptions
      .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object")
      .map((o) => ({
        label: String(o["label"] ?? o["value"] ?? ""),
        value: String(o["value"] ?? o["label"] ?? ""),
        multiplier: num(o["multiplier"], 1) || 1,
        add_cop: num(o["add_cop"]),
      })),
    is_required: Boolean(row["is_required"]),
    is_active: row["is_active"] !== false,
    sort_order: num(row["sort_order"]),
  };
}

export function normalizeService(
  row: Record<string, unknown>,
  fields: QuoterField[],
): QuoterService {
  return {
    id: String(row["id"]),
    slug: String(row["slug"]),
    name: String(row["name"] ?? ""),
    tagline: String(row["tagline"] ?? ""),
    description: String(row["description"] ?? ""),
    icon: String(row["icon"] ?? "printer"),
    site_anchor: String(row["site_anchor"] ?? ""),
    base_price_cop: num(row["base_price_cop"]),
    gastos_extra_cop: num(row["gastos_extra_cop"]),
    min_price_cop: num(row["min_price_cop"]),
    margin_percent: num(row["margin_percent"]),
    allow_quantity: row["allow_quantity"] !== false,
    allow_file: row["allow_file"] !== false,
    is_active: row["is_active"] !== false,
    sort_order: num(row["sort_order"]),
    fields: fields
      .filter((f) => f.service_id === String(row["id"]))
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
  };
}

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

/**
 * Costo unitario de un campo: su número fijo o la variable global elegida
 * (con el porcentaje de fallo aplicado a esos costos globales).
 */
export function unitCostFor(field: QuoterField, vars?: QuoterVars): number {
  const src = field.price_source ?? "fixed";
  if (src === "fixed" || !vars) return num(field.price_per_unit_cop);
  const base = num(
    (vars as unknown as Record<string, unknown>)[src],
    num(field.price_per_unit_cop),
  );
  const failure = num(vars.failure_rate_percentage);
  return base * (1 + failure / 100);
}

/** Precio en vivo: (base + recargos) × multiplicadores + margen, con mínimo y cantidad. */
export function computeQuote(
  service: QuoterService,
  values: QuoterValues,
  quantity = 1,
  vars?: QuoterVars,
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
      const amount = v * unitCostFor(f, vars);
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
  const extra = num(service.gastos_extra_cop);
  const unit = Math.max(min, withMargin) + extra;
  if (extra > 0)
    lines.push({ label: "Gastos extra", detail: "Montaje y post-procesado", amount: extra });
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

/**
 * Convierte respuestas "en lenguaje natural" (por clave, etiqueta o valor) a los
 * valores exactos que espera el motor, e informa qué campos quedaron sin dato.
 * Lo usa Kiara para cotizar por chat: si falta un campo obligatorio, debe
 * preguntarlo en vez de inventarlo.
 */
export function coerceAnswersDetailed(
  service: QuoterService,
  input: Record<string, unknown>,
): { values: QuoterValues; matchedKeys: string[]; missingRequired: QuoterField[] } {
  const values = defaultValuesFor(service);
  const matched = new Set<string>();
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  for (const [rawKey, rawVal] of Object.entries(input)) {
    const key = norm(rawKey);
    if (!key) continue;
    // Coincidencia estricta primero; la difusa solo con claves suficientemente
    // largas y por palabra completa, para no mapear datos al campo equivocado.
    const fuzzy = (f: QuoterField) => {
      if (key.length < 4) return false;
      const words = (s: string) => norm(s).split(" ");
      return (
        words(f.key).includes(key) ||
        words(f.label).includes(key) ||
        key
          .split(" ")
          .some((w) => w.length >= 4 && (words(f.key).includes(w) || words(f.label).includes(w)))
      );
    };
    const field =
      service.fields.find((f) => norm(f.key) === key) ??
      service.fields.find((f) => norm(f.label) === key) ??
      service.fields.find(fuzzy);
    if (!field) continue;

    const val = String(rawVal ?? "").trim();
    if (!val) continue;

    if (field.input_type === "select") {
      const opt =
        field.options.find((o) => norm(o.value) === norm(val)) ??
        field.options.find((o) => norm(o.label) === norm(val)) ??
        field.options.find((o) => norm(o.label).includes(norm(val)));
      if (opt) {
        values[field.key] = opt.value;
        matched.add(field.key);
      }
      continue;
    }
    if (field.input_type === "toggle") {
      values[field.key] = isOn(val) ? "si" : "no";
      matched.add(field.key);
      continue;
    }
    if (field.input_type === "slider" || field.input_type === "number") {
      const n = Number(
        String(val)
          .replace(/[^0-9.,-]/g, "")
          .replace(",", "."),
      );
      if (!Number.isFinite(n)) continue;
      values[field.key] = String(n);
      matched.add(field.key);
      continue;
    }
    values[field.key] = val;
    matched.add(field.key);
  }

  // Falta un dato si es obligatorio, o si es un número que cambia el precio y
  // el cliente no lo dio: así Kiara pregunta en vez de asumir un valor por defecto.
  const missingRequired = service.fields.filter((f) => {
    if (!f.is_active || matched.has(f.key)) return false;
    const numeric = f.input_type === "slider" || f.input_type === "number";
    if (numeric) return f.is_required || f.price_per_unit_cop > 0;
    if (f.input_type === "text") return f.is_required && !f.default_value;
    return f.is_required && !f.default_value;
  });

  return { values, matchedKeys: [...matched], missingRequired };
}

export function coerceAnswers(
  service: QuoterService,
  input: Record<string, unknown>,
): QuoterValues {
  return coerceAnswersDetailed(service, input).values;
}

export function formatCOP(n: number) {
  return (Number(n) || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}
