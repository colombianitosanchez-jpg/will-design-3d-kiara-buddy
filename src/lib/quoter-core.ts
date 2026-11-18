import jsep from "jsep";

// Motor del Cotizador (puro): tipos, normalización y matemática AST.
// No importa Supabase, así puede usarse igual en el navegador y en el servidor.

export type QuoterOptionMedia = {
  url?: string;
  type?: "image" | "video" | "gif";
};

export type QuoterOption = {
  label: string;
  value: string;
  description?: string;
  multiplier?: number;
  add_cop?: number;
  media?: QuoterOptionMedia;
};

export type VolumeDiscountTier = {
  min_qty: number;
  max_qty: number | null; // null represents infinity / no upper limit
  discount_percentage: number; // e.g. 10 = 10% off
  fixed_unit_price_cop?: number | null;
};

export type QuoterInputType = "slider" | "select" | "toggle" | "number" | "text";

/** Origen del costo unitario: número fijo del campo o una variable global. */
export type QuoterPriceSource =
  | "fixed"
  | "fdm_gram_cost"
  | "resin_ml_cost"
  | "machine_hour_rate"
  | "labor_hour_rate"
  | string;

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
  formula?: string; // Fórmula matemática personalizada por campo
  options: QuoterOption[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  media_url?: string;
  media_type?: "image" | "video" | "gif";
};

export type CustomQuoterVar = {
  key: string;
  label: string;
  value: number;
  formula?: string;
  show_in_breakdown: boolean;
  help?: string;
};

/** Variables globales del cotizador que pueden alimentar el costo de un campo. */
export type QuoterVars = {
  fdm_gram_cost: number;
  resin_ml_cost: number;
  machine_hour_rate: number;
  labor_hour_rate: number;
  default_margin: number;
  failure_rate_percentage: number;
  custom_vars?: CustomQuoterVar[];
};

export type QuoterPricingMode = "formula" | "fixed" | "weight_material" | "hours" | "volume_tier";
export type QuoterPriceDisplay = "final" | "breakdown";

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
  pricing_mode?: QuoterPricingMode;
  uses_global_vars?: boolean;
  price_display?: QuoterPriceDisplay;
  formula?: string; // Master formula para el cálculo completo del servicio
  allow_quantity: boolean;
  allow_file: boolean;
  requires_approval?: boolean;
  approval_threshold_cop?: number;
  is_active: boolean;
  sort_order: number;
  has_calculator?: boolean;
  whatsapp_custom_message?: string;
  volume_tiers?: VolumeDiscountTier[];
  fields: QuoterField[];
};

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Evaluador de fórmulas matemáticas seguro con soporte de variables, operadores y jerarquía. */
export function evaluateFormula(
  expression: string | null | undefined,
  context: Record<string, number> = {},
): number {
  if (!expression || typeof expression !== "string") return 0;

  // Normalizar corchetes {{clave}} -> clave
  let expr = expression.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, "$1").trim();
  if (!expr) return 0;

  try {
    type Node = { type: string; value?: unknown; name?: string; operator?: string; argument?: Node; left?: Node; right?: Node };
    const visit = (node: Node): number => {
      if (node.type === "Literal" && typeof node.value === "number") return node.value;
      if (node.type === "Identifier") return num(context[node.name ?? ""]);
      if (node.type === "UnaryExpression" && node.argument) {
        const value = visit(node.argument);
        if (node.operator === "-") return -value;
        if (node.operator === "+") return value;
      }
      if (node.type === "BinaryExpression" && node.left && node.right) {
        const a = visit(node.left), b = visit(node.right);
        switch (node.operator) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return b === 0 ? NaN : a / b;
          case "%": return b === 0 ? NaN : a % b;
          case "^": case "**": return Math.pow(a, b);
        }
      }
      throw new Error("Expresión no permitida");
    };
    const value = visit(jsep(expr) as Node);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function normalizeField(row: Record<string, unknown>): QuoterField {
  const rawOptions = Array.isArray(row['options']) ? (row['options'] as unknown[]) : [];
  return {
    id: String(row['id']),
    service_id: String(row['service_id']),
    key: String(row['key']),
    label: String(row['label'] ?? ""),
    help: String(row['help'] ?? ""),
    input_type: String(row['input_type'] ?? "slider") as QuoterInputType,
    min_value: num(row['min_value']),
    max_value: num(row['max_value'], 100),
    step_value: num(row['step_value'], 1) || 1,
    default_value: String(row['default_value'] ?? ""),
    unit: String(row['unit'] ?? ""),
    price_per_unit_cop: num(row['price_per_unit_cop']),
    price_source: (String(row['price_source'] ?? "fixed") || "fixed") as QuoterPriceSource,
    multiplier: num(row['multiplier'], 1) || 1,
    formula: row['formula'] ? String(row['formula']) : undefined,
    options: rawOptions
      .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object")
      .map((o) => {
        const media = o['media'] && typeof o['media'] === "object" ? (o['media'] as Record<string, unknown>) : {};
        return {
          label: String(o['label'] ?? o['value'] ?? ""),
          value: String(o['value'] ?? o['label'] ?? ""),
          description: o['description'] ? String(o['description']) : undefined,
          multiplier: num(o['multiplier'], 1) || 1,
          add_cop: num(o['add_cop']),
          media: media.url ? { url: String(media.url), type: (media.type as any) || "image" } : undefined,
        };
      }),
    is_required: Boolean(row['is_required']),
    is_active: row['is_active'] !== false,
    sort_order: num(row['sort_order']),
    media_url: row['media_url'] ? String(row['media_url']) : undefined,
    media_type: row['media_type'] ? (String(row['media_type']) as any) : undefined,
  };
}

export function normalizeService(
  row: Record<string, unknown>,
  fields: QuoterField[],
): QuoterService {
  let volumeTiers: VolumeDiscountTier[] = [];
  try {
    if (Array.isArray(row['volume_tiers'])) {
      volumeTiers = (row['volume_tiers'] as Record<string, unknown>[]).map((t) => ({
        min_qty: num(t['min_qty'], 1),
        max_qty: t['max_qty'] !== null && t['max_qty'] !== undefined ? num(t['max_qty']) : null,
        discount_percentage: num(t['discount_percentage']),
        fixed_unit_price_cop: t['fixed_unit_price_cop'] ? num(t['fixed_unit_price_cop']) : null,
      }));
    } else if (typeof row['volume_tiers'] === "string" && row['volume_tiers'].trim()) {
      volumeTiers = JSON.parse(row['volume_tiers']);
    }
  } catch {
    volumeTiers = [];
  }

  return {
    id: String(row['id']),
    slug: String(row['slug']),
    name: String(row['name'] ?? ""),
    tagline: String(row['tagline'] ?? ""),
    description: String(row['description'] ?? ""),
    icon: String(row['icon'] ?? "printer"),
    site_anchor: String(row['site_anchor'] ?? ""),
    base_price_cop: num(row['base_price_cop']),
    gastos_extra_cop: num(row['gastos_extra_cop']),
    min_price_cop: num(row['min_price_cop']),
    margin_percent: num(row['margin_percent']),
    pricing_mode: (String(row['pricing_mode'] ?? "formula") as QuoterPricingMode) || "formula",
    uses_global_vars: Boolean(row['uses_global_vars']),
    price_display: (String(row['price_display'] ?? "final") as QuoterPriceDisplay) || "final",
    formula: row['formula'] ? String(row['formula']) : undefined,
    allow_quantity: row['allow_quantity'] !== false,
    allow_file: row['allow_file'] !== false,
    requires_approval: Boolean(row['requires_approval']),
    approval_threshold_cop: num(row['approval_threshold_cop']),
    is_active: row['is_active'] !== false,
    sort_order: num(row['sort_order']),
    has_calculator: row['has_calculator'] !== false,
    whatsapp_custom_message: row['whatsapp_custom_message'] ? String(row['whatsapp_custom_message']) : undefined,
    volume_tiers: volumeTiers,
    fields: fields
      .filter((f) => f.service_id === String(row['id']))
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

/** Canonical values used by simulation, public pricing and checkout. */
export function normalizeQuoteValues(service: QuoterService, input: QuoterValues): QuoterValues {
  const defaults = defaultValuesFor(service);
  const out: QuoterValues = {};
  for (const f of service.fields.filter((f) => f.is_active)) {
    const raw = input[f.key] ?? defaults[f.key] ?? "";
    if (f.input_type === "slider" || f.input_type === "number") {
      const v = Math.min(f.max_value, Math.max(f.min_value, num(raw, f.min_value)));
      const step = Math.max(0.000001, f.step_value);
      out[f.key] = String(Math.min(f.max_value, Number((f.min_value + Math.round((v - f.min_value) / step) * step).toFixed(8))));
    } else if (f.input_type === "select") {
      out[f.key] = f.options.some((o) => o.value === raw) ? raw : f.options[0]?.value ?? "";
    } else if (f.input_type === "toggle") out[f.key] = isOn(raw) ? "si" : "no";
    else out[f.key] = raw.trim().slice(0, 300);
  }
  return out;
}

export function quoteAnswerErrors(service: QuoterService, values: QuoterValues): string[] {
  return service.fields.filter((f) => f.is_active).flatMap((f) => {
    const raw = values[f.key] ?? "";
    if (f.is_required && !raw.trim()) return [`Completa ${f.label}`];
    if ((f.input_type === "number" || f.input_type === "slider") && (!Number.isFinite(Number(raw)) || Number(raw) < f.min_value || Number(raw) > f.max_value)) return [`${f.label}: elige un valor entre ${f.min_value} y ${f.max_value}`];
    if (f.input_type === "select" && !f.options.some((o) => o.value === raw)) return [`Selecciona una opción válida para ${f.label}`];
    return [];
  });
}

export function fieldConfigurationError(field: QuoterField, siblings: QuoterField[]): string | null {
  if (!field.label.trim() || !/^[a-z][a-z0-9_]*$/.test(field.key)) return "Escribe una etiqueta y una clave válida";
  if (siblings.some((f) => f.id !== field.id && f.key === field.key)) return "La clave ya pertenece a otra pregunta";
  if ((field.input_type === "slider" || field.input_type === "number") && (field.max_value < field.min_value || field.step_value <= 0)) return "El máximo debe ser mayor o igual al mínimo y el paso debe ser positivo";
  if (field.input_type === "select" && (!field.options.length || field.options.some((o) => !o.value.trim() || !o.label.trim()) || new Set(field.options.map((o) => o.value)).size !== field.options.length)) return "Las opciones necesitan títulos y valores únicos";
  if (field.default_value && quoteAnswerErrors({ fields: [{ ...field, is_required: false }] } as QuoterService, { [field.key]: field.default_value }).length) return "El valor inicial no es válido para esta pregunta";
  return null;
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
  requires_approval: boolean;
  answers: { label: string; value: string }[];
};

const round100 = (n: number) => Math.round(n / 100) * 100;

export function isOn(value: string | undefined) {
  const v = (value ?? "").trim().toLowerCase();
  return v === "si" || v === "sí" || v === "true" || v === "1" || v === "yes";
}

/**
 * Costo unitario de un campo: su número fijo, variable global o fórmula calculada.
 */
export function unitCostFor(field: QuoterField, vars?: QuoterVars, context?: Record<string, number>): number {
  if (field.formula) {
    return evaluateFormula(field.formula, context || {});
  }

  const src = field.price_source ?? "fixed";
  if (src === "fixed" || !vars) return num(field.price_per_unit_cop);

  // Check in standard vars
  let base = context && src in context ? num(context[src]) : num((vars as unknown as Record<string, unknown>)[src], 0);

  // Check in custom vars
  if (base === 0 && vars.custom_vars) {
    const custom = vars.custom_vars.find((v) => v.key === src);
    if (custom) {
      base = custom.formula ? evaluateFormula(custom.formula, context || {}) : custom.value;
    }
  }

  if (!(context && src in context) && !(src in vars) && !vars.custom_vars?.some((v) => v.key === src)) base = num(field.price_per_unit_cop);

  const failure = num(vars.failure_rate_percentage);
  return base * (1 + failure / 100);
}

/** Precio en vivo con evaluador matemático AST completo. */
export function computeQuote(
  service: QuoterService,
  values: QuoterValues,
  quantity = 1,
  vars?: QuoterVars,
): QuoterResult {
  const lines: QuoterLine[] = [];
  const answers: { label: string; value: string }[] = [];
  const qty = service.allow_quantity ? Math.max(1, Math.min(10000, Math.round(num(quantity, 1)))) : 1;
  values = normalizeQuoteValues(service, values);

  // Construcción del contexto numérico completo para fórmulas
  const context: Record<string, number> = {
    quantity: qty,
    cantidad: qty,
    base_price: num(service.base_price_cop),
    precio_base: num(service.base_price_cop),
  };

  for (const f of service.fields.filter((f) => f.is_active)) {
    context[f.key] = f.input_type === "toggle" ? (isOn(values[f.key]) ? 1 : 0) : num(values[f.key]);
  }

  // Agregar variables globales estándar al contexto
  if (vars) {
    context.fdm_gram_cost = num(vars.fdm_gram_cost);
    context.resin_ml_cost = num(vars.resin_ml_cost);
    context.machine_hour_rate = num(vars.machine_hour_rate);
    context.labor_hour_rate = num(vars.labor_hour_rate);
    context.default_margin = num(vars.default_margin);
    context.failure_rate_percentage = num(vars.failure_rate_percentage);

    if (vars.custom_vars) {
      for (const cv of vars.custom_vars) {
        if (!cv.key) continue;
        const computed = cv.formula ? evaluateFormula(cv.formula, context) : cv.value;
        context[cv.key] = computed;
      }
    }
  }

  let add = num(service.base_price_cop);
  let multiplier = 1;

  if (add > 0) lines.push({ label: "Base del servicio", detail: service.name, amount: add });

  for (const f of service.fields) {
    if (!f.is_active) continue;
    const raw = values[f.key] ?? "";

    if (f.input_type === "slider" || f.input_type === "number") {
      const v = num(raw);
      const unitPrice = service.pricing_mode === "fixed" ? 0 : unitCostFor(f, vars, context);
      const amount = f.formula ? unitPrice : v * unitPrice;

      answers.push({ label: f.label, value: `${v}${f.unit ? ` ${f.unit}` : ""}` });
      if (amount) {
        add += amount;
        lines.push({ label: f.label, detail: `${v}${f.unit ? ` ${f.unit}` : ""}`, amount });
      }
      if (service.pricing_mode !== "fixed" && f.multiplier !== 1) multiplier *= f.multiplier;
      continue;
    }

    if (f.input_type === "select") {
      const opt = f.options.find((o) => o.value === raw) ?? null;
      if (!opt) continue;
      answers.push({ label: f.label, value: opt.label });
      if (service.pricing_mode !== "fixed" && opt.add_cop) {
        add += opt.add_cop;
        lines.push({ label: f.label, detail: opt.label, amount: opt.add_cop });
      }
      if (service.pricing_mode !== "fixed" && opt.multiplier && opt.multiplier !== 1) multiplier *= opt.multiplier;
      continue;
    }

    if (f.input_type === "toggle") {
      const on = isOn(raw);
      const opt = f.options[0];
      answers.push({ label: f.label, value: on ? (opt?.label ?? "Sí") : "No" });
      if (on && opt) {
        if (service.pricing_mode !== "fixed" && opt.add_cop) {
          add += opt.add_cop;
          lines.push({ label: f.label, detail: opt.label, amount: opt.add_cop });
        }
        if (service.pricing_mode !== "fixed" && opt.multiplier && opt.multiplier !== 1) multiplier *= opt.multiplier;
      }
      continue;
    }

    if (raw.trim()) answers.push({ label: f.label, value: raw.trim() });
  }

  // Evaluación de la Master Formula si el servicio tiene una definida
  if (service.formula && service.pricing_mode !== "fixed") {
    const computedMaster = evaluateFormula(service.formula, context);
    if (computedMaster > 0) {
      add = computedMaster;
      lines.length = 0; // Reemplazar con el resultado de la fórmula maestra
      lines.push({ label: "Fórmula personalizada del servicio", detail: service.name, amount: add });
    }
  }

  const subtotal = add * multiplier;
  const margin = service.pricing_mode === "fixed" ? 0 : subtotal * (num(service.margin_percent) / 100);
  const withMargin = subtotal + margin;
  const min = num(service.min_price_cop);
  const extra = num(service.gastos_extra_cop);
  let baseUnit = Math.max(min, withMargin) + extra;
  if (extra > 0) lines.push({ label: "Gastos extra", detail: "Montaje y post-procesado", amount: extra });

  // Escalado de Descuentos por Volumen (Tiered Volume Discounts)
  let unit = baseUnit;
  if (service.volume_tiers && service.volume_tiers.length > 0) {
    const sortedTiers = [...service.volume_tiers].sort((a, b) => a.min_qty - b.min_qty);
    for (const tier of sortedTiers) {
      if (qty >= tier.min_qty && (tier.max_qty === null || tier.max_qty === undefined || qty <= tier.max_qty)) {
        if (tier.fixed_unit_price_cop && tier.fixed_unit_price_cop > 0) {
          unit = tier.fixed_unit_price_cop;
          lines.push({
            label: "Tarifa fija por volumen",
            detail: `${qty} unidades (Rango ${tier.min_qty}+)`,
            amount: unit,
          });
        } else if (tier.discount_percentage && tier.discount_percentage > 0) {
          const discountVal = baseUnit * (tier.discount_percentage / 100);
          unit = Math.max(min, baseUnit - discountVal);
          lines.push({
            label: `Descuento por volumen (-${tier.discount_percentage}%)`,
            detail: `${qty} unidades`,
            amount: -discountVal,
          });
        }
        break;
      }
    }
  }

  unit = Math.max(0, round100(unit));
  const total = unit * qty;

  const reqApproval = Boolean(
    service.requires_approval ||
      (service.approval_threshold_cop && service.approval_threshold_cop > 0 && total >= service.approval_threshold_cop),
  );

  return {
    lines,
    multiplier,
    subtotal_cop: round100(subtotal),
    margin_cop: round100(margin),
    unit_price_cop: round100(unit),
    quantity: qty,
    total_cop: total,
    min_applied: withMargin < min,
    requires_approval: reqApproval,
    answers,
  };
}

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

    const fuzzy = (f: QuoterField) => {
      if (key.length < 4) return false;
      const words = (s: string) => norm(s).split(" ");
      return words(f.key).includes(key) || words(f.label).includes(key) ||
        key.split(" ").some((w) => w.length >= 4 && (words(f.key).includes(w) || words(f.label).includes(w)));
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
      const n = Number(String(val).replace(/[^0-9.,-]/g, "").replace(",", "."));
      if (!Number.isFinite(n)) continue;
      values[field.key] = String(n);
      matched.add(field.key);
      continue;
    }
    values[field.key] = val;
    matched.add(field.key);
  }

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
