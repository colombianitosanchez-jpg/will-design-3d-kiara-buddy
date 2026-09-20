import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calcQuote, DEFAULT_RULES, type PricingRules } from "@/lib/pricing";
import { Calculator, Loader2, Plus, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/panel/cotizaciones")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reglas de precios · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PricingPage,
});

const cop = (n: number) =>
  (Number(n) || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

type Row = PricingRules & { id: string };

function PricingPage() {
  const [rules, setRules] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [test, setTest] = useState({
    grams: 120,
    hours: 4,
    material: "PLA",
    finish: "Basico",
    quantity: 1,
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("pricing_rules")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) {
      setRules({
        id: data.id,
        name: data.name,
        base_price_per_gram_cop: Number(data.base_price_per_gram_cop),
        machine_hour_cop: Number(data.machine_hour_cop),
        setup_fee_cop: Number(data.setup_fee_cop),
        margin_percent: Number(data.margin_percent),
        min_price_cop: Number(data.min_price_cop),
        material_multipliers: (data.material_multipliers as Record<string, number>) ?? {},
        finish_multipliers: (data.finish_multipliers as Record<string, number>) ?? {},
        is_active: data.is_active,
      });
    } else {
      const ins = await supabase
        .from("pricing_rules")
        .insert({ ...DEFAULT_RULES, is_active: true })
        .select("id")
        .single();
      if (ins.data) setRules({ ...DEFAULT_RULES, id: ins.data.id, is_active: true });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const preview = useMemo(() => (rules ? calcQuote(rules, test) : null), [rules, test]);

  async function save() {
    if (!rules) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("pricing_rules")
      .update({
        name: rules.name,
        base_price_per_gram_cop: rules.base_price_per_gram_cop,
        machine_hour_cop: rules.machine_hour_cop,
        setup_fee_cop: rules.setup_fee_cop,
        margin_percent: rules.margin_percent,
        min_price_cop: rules.min_price_cop,
        material_multipliers: rules.material_multipliers,
        finish_multipliers: rules.finish_multipliers,
        is_active: rules.is_active ?? true,
      })
      .eq("id", rules.id);
    setSaving(false);
    setMsg(
      error
        ? `Error: ${error.message}`
        : "Reglas guardadas. Kiara y el cotizador ya usan estos precios.",
    );
  }

  function setNum(key: keyof PricingRules, value: string) {
    setRules((r) => (r ? { ...r, [key]: Number(value) || 0 } : r));
  }

  function setMult(
    field: "material_multipliers" | "finish_multipliers",
    key: string,
    value: string,
  ) {
    setRules((r) => (r ? { ...r, [field]: { ...r[field], [key]: Number(value) || 0 } } : r));
  }

  function addMult(field: "material_multipliers" | "finish_multipliers") {
    const name = window.prompt(
      field === "material_multipliers" ? "Nombre del material" : "Nombre del acabado",
    );
    if (!name?.trim()) return;
    setRules((r) => (r ? { ...r, [field]: { ...r[field], [name.trim()]: 1 } } : r));
  }

  function removeMult(field: "material_multipliers" | "finish_multipliers", key: string) {
    setRules((r) => {
      if (!r) return r;
      const next = { ...r[field] };
      delete next[key];
      return { ...r, [field]: next };
    });
  }

  if (loading || !rules) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando reglas de precios…
      </div>
    );
  }

  const numFields: [keyof PricingRules, string, string][] = [
    ["base_price_per_gram_cop", "Precio por gramo (COP)", "Costo base del material por gramo."],
    ["machine_hour_cop", "Hora de máquina (COP)", "Cuánto cobras por cada hora de impresión."],
    [
      "setup_fee_cop",
      "Costo de preparación (COP)",
      "Valor fijo por preparar el archivo y la máquina.",
    ],
    ["margin_percent", "Margen de ganancia (%)", "Porcentaje que se suma al costo."],
    [
      "min_price_cop",
      "Precio mínimo (COP)",
      "Ninguna cotización quedará por debajo de este valor.",
    ],
  ];

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">Reglas de precios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cambia estos valores y todas las cotizaciones —del cotizador de la web y de Kiara— se
          calculan solas con los nuevos precios.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Valores base</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {numFields.map(([key, label, help]) => (
                <label key={key} className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={String(rules[key] ?? 0)}
                    onChange={(e) => setNum(key, e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="mt-1 block text-[11px] text-muted-foreground">{help}</span>
                </label>
              ))}
            </div>
          </section>

          {(
            [
              ["material_multipliers", "Multiplicadores por material"],
              ["finish_multipliers", "Multiplicadores por acabado"],
            ] as const
          ).map(([field, title]) => (
            <section key={field} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{title}</h2>
                <button
                  onClick={() => addMult(field)}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-teal-deep)] px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                1 = precio normal · 1.5 = 50% más caro.
              </p>
              <div className="mt-3 space-y-2">
                {Object.entries(rules[field]).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-semibold">{key}</span>
                    <input
                      type="number"
                      step="0.05"
                      min={0}
                      value={String(val)}
                      onChange={(e) => setMult(field, key, e.target.value)}
                      className="w-24 rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => removeMult(field, key)}
                      aria-label={`Quitar ${key}`}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar reglas
            </button>
            {msg && <p className="text-xs font-semibold text-muted-foreground">{msg}</p>}
          </div>
        </div>

        <aside className="h-fit rounded-3xl border border-border bg-card p-5 lg:sticky lg:top-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Calculator className="h-5 w-5 text-[var(--brand-orange)]" /> Simulador
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Prueba tus reglas antes de guardarlas.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Gramos</span>
              <input
                type="number"
                min={0}
                value={test.grams}
                onChange={(e) => setTest((t) => ({ ...t, grams: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Horas</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={test.hours}
                onChange={(e) => setTest((t) => ({ ...t, hours: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Material</span>
              <select
                value={test.material}
                onChange={(e) => setTest((t) => ({ ...t, material: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.keys(rules.material_multipliers).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Acabado</span>
              <select
                value={test.finish}
                onChange={(e) => setTest((t) => ({ ...t, finish: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.keys(rules.finish_multipliers).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Cantidad</span>
              <input
                type="number"
                min={1}
                value={test.quantity}
                onChange={(e) => setTest((t) => ({ ...t, quantity: Number(e.target.value) || 1 }))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          {preview && (
            <div className="mt-4 space-y-1 border-t border-dashed border-border pt-3 text-xs">
              <Line label="Material" value={preview.material_cost_cop} />
              <Line label="Tiempo de máquina" value={preview.machine_cost_cop} />
              <Line label="Preparación" value={preview.setup_fee_cop} />
              <Line label="Margen" value={preview.margin_cop} />
              <div className="flex justify-between border-t border-border pt-2 text-base font-black">
                <span>Total</span>
                <span>{cop(preview.total_cop)}</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{cop(value)}</span>
    </div>
  );
}
