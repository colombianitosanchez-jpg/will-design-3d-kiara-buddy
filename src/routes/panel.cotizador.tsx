import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  quoterServicesQuery,
  computeQuote,
  defaultValuesFor,
  formatCOP,
  type QuoterService,
  type QuoterField,
  type QuoterOption,
  type QuoterValues,
} from "@/lib/quoter";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Calculator,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export const Route = createFileRoute("/panel/cotizador")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cotizador · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: QuoterAdmin,
});

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

const INPUT_TYPES: { value: QuoterField["input_type"]; label: string }[] = [
  { value: "slider", label: "Deslizador (rango)" },
  { value: "select", label: "Opciones (tarjetas)" },
  { value: "toggle", label: "Sí / No" },
  { value: "number", label: "Número" },
  { value: "text", label: "Texto libre" },
];

const ICON_OPTIONS = [
  "printer",
  "sparkles",
  "package",
  "pencil-ruler",
  "scan",
  "paintbrush",
  "boxes",
  "graduation-cap",
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function QuoterAdmin() {
  const qc = useQueryClient();
  const { data: services, isLoading } = useQuery(quoterServicesQuery(true));
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = () => qc.invalidateQueries({ queryKey: ["quoter-services"] });

  async function addService() {
    const name = window.prompt("Nombre del nuevo servicio a cotizar");
    if (!name?.trim()) return;
    const { error } = await supabase.from("quoter_services").insert({
      slug: slugify(name) || `servicio-${Date.now()}`,
      name: name.trim(),
      sort_order: (services?.length ?? 0) + 1,
    });
    setMsg(error ? `Error: ${error.message}` : "Servicio creado.");
    reload();
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando cotizador…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Cotizador</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cada servicio del cotizador público se arma aquí: agrega preguntas, deslizadores y precios.
            Los cambios se ven de inmediato en la web.
          </p>
        </div>
        <button
          onClick={addService}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> Nuevo servicio
        </button>
      </div>

      {msg && <p className="mt-3 text-xs font-semibold text-muted-foreground">{msg}</p>}

      <div className="mt-6 space-y-4">
        {(services ?? []).map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            open={openId === s.id}
            onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            onChanged={reload}
            onMsg={setMsg}
          />
        ))}
        {(services ?? []).length === 0 && (
          <p className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground">
            Aún no hay servicios. Crea el primero con “Nuevo servicio”.
          </p>
        )}
      </div>
    </>
  );
}

function ServiceCard({
  service,
  open,
  onToggle,
  onChanged,
  onMsg,
}: {
  service: QuoterService;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  const [draft, setDraft] = useState(service);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<QuoterValues>(() => defaultValuesFor(service));
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setDraft(service);
    setTest(defaultValuesFor(service));
  }, [service]);

  const preview = useMemo(() => computeQuote(draft, test, qty), [draft, test, qty]);

  function set<K extends keyof QuoterService>(key: K, value: QuoterService[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("quoter_services")
      .update({
        name: draft.name,
        tagline: draft.tagline,
        description: draft.description,
        icon: draft.icon,
        base_price_cop: draft.base_price_cop,
        min_price_cop: draft.min_price_cop,
        margin_percent: draft.margin_percent,
        allow_quantity: draft.allow_quantity,
        allow_file: draft.allow_file,
        is_active: draft.is_active,
        sort_order: draft.sort_order,
        site_anchor: draft.site_anchor.trim(),
      })
      .eq("id", draft.id);
    setSaving(false);
    onMsg(error ? `Error: ${error.message}` : `“${draft.name}” guardado.`);
    onChanged();
  }

  async function toggleActive() {
    await supabase
      .from("quoter_services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);
    onChanged();
  }

  async function removeService() {
    if (!window.confirm(`¿Eliminar “${service.name}” y todas sus preguntas?`)) return;
    await supabase.from("quoter_services").delete().eq("id", service.id);
    onMsg("Servicio eliminado.");
    onChanged();
  }

  async function addField() {
    const label = window.prompt("Nombre de la pregunta (ej: Peso de la pieza)");
    if (!label?.trim()) return;
    const key = slugify(label).replace(/-/g, "_") || `campo_${Date.now()}`;
    const { error } = await supabase.from("quoter_fields").insert({
      service_id: service.id,
      key,
      label: label.trim(),
      input_type: "slider",
      min_value: 0,
      max_value: 100,
      step_value: 1,
      default_value: "10",
      sort_order: service.fields.length + 1,
    });
    onMsg(error ? `Error: ${error.message}` : "Pregunta agregada.");
    onChanged();
  }

  return (
    <section className="rounded-3xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <button onClick={onToggle} className="flex flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="text-lg font-black">{service.name}</span>
          <span className="text-xs text-muted-foreground">
            {service.fields.length} pregunta{service.fields.length === 1 ? "" : "s"}
          </span>
          {!service.is_active && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              Oculto
            </span>
          )}
        </button>
        <button
          onClick={toggleActive}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          title={service.is_active ? "Ocultar en la web" : "Mostrar en la web"}
        >
          {service.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          onClick={removeService}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-red-600"
          title="Eliminar servicio"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="grid gap-6 border-t border-border p-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <L label="Nombre">
                <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </L>
              <L label="Frase corta">
                <input
                  value={draft.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  className={inputCls}
                />
              </L>
              <L label="Descripción" full>
                <textarea
                  rows={2}
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={inputCls}
                />
              </L>
              <L label="Ícono">
                <select value={draft.icon} onChange={(e) => set("icon", e.target.value)} className={inputCls}>
                  {ICON_OPTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </L>
              <L label="Ancla en /servicios (ej: impresion-3d)">
                <input
                  value={draft.site_anchor}
                  onChange={(e) => set("site_anchor", e.target.value)}
                  placeholder="impresion-3d"
                  className={inputCls}
                />
              </L>
              <L label="Orden en la web">
                <input
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </L>
              <L label="Precio base (COP)">
                <input
                  type="number"
                  min={0}
                  value={draft.base_price_cop}
                  onChange={(e) => set("base_price_cop", Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </L>
              <L label="Precio mínimo (COP)">
                <input
                  type="number"
                  min={0}
                  value={draft.min_price_cop}
                  onChange={(e) => set("min_price_cop", Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </L>
              <L label="Margen (%)">
                <input
                  type="number"
                  min={0}
                  value={draft.margin_percent}
                  onChange={(e) => set("margin_percent", Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </L>
              <div className="flex items-center gap-4 sm:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.allow_quantity}
                    onChange={(e) => set("allow_quantity", e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-orange)]"
                  />
                  Permitir cantidad
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.allow_file}
                    onChange={(e) => set("allow_file", e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-orange)]"
                  />
                  Permitir subir archivo
                </label>
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar servicio
            </button>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Preguntas del cliente</h3>
                <button
                  onClick={addField}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-teal-deep)] px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar pregunta
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {service.fields.map((f, i) => (
                  <FieldEditor
                    key={f.id}
                    field={f}
                    index={i}
                    total={service.fields.length}
                    siblings={service.fields}
                    onChanged={onChanged}
                    onMsg={onMsg}
                  />
                ))}
                {service.fields.length === 0 && (
                  <p className="rounded-2xl bg-muted p-4 text-xs text-muted-foreground">
                    Sin preguntas: el cliente solo verá el precio base.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Simulador */}
          <aside className="h-fit rounded-3xl border border-border bg-background p-5 lg:sticky lg:top-6">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Calculator className="h-5 w-5 text-[var(--brand-orange)]" /> Simulador
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Prueba lo que verá el cliente con los valores actuales.
            </p>
            <div className="mt-4 space-y-3">
              {draft.fields.map((f) => (
                <div key={f.id}>
                  <span className="text-xs font-bold uppercase text-muted-foreground">{f.label}</span>
                  {f.input_type === "select" || f.input_type === "toggle" ? (
                    <select
                      value={test[f.key] ?? ""}
                      onChange={(e) => setTest((t) => ({ ...t, [f.key]: e.target.value }))}
                      className={inputCls}
                    >
                      {f.input_type === "toggle" ? (
                        <>
                          <option value="no">No</option>
                          <option value="si">{f.options[0]?.label ?? "Sí"}</option>
                        </>
                      ) : (
                        f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <input
                      type={f.input_type === "text" ? "text" : "number"}
                      value={test[f.key] ?? ""}
                      onChange={(e) => setTest((t) => ({ ...t, [f.key]: e.target.value }))}
                      className={inputCls}
                    />
                  )}
                </div>
              ))}
              {draft.allow_quantity && (
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground">Cantidad</span>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value) || 1)}
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 space-y-1 border-t border-dashed border-border pt-3 text-xs">
              {preview.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-2 text-muted-foreground">
                  <span>
                    {l.label}
                    {l.detail ? ` · ${l.detail}` : ""}
                  </span>
                  <span>{formatCOP(l.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-muted-foreground">
                <span>Multiplicador</span>
                <span>×{preview.multiplier.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-black">
                <span>Total</span>
                <span>{formatCOP(preview.total_cop)}</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function FieldEditor({
  field,
  index,
  total,
  siblings,
  onChanged,
  onMsg,
}: {
  field: QuoterField;
  index: number;
  total: number;
  siblings: QuoterField[];
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  const [d, setD] = useState(field);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setD(field), [field]);

  function set<K extends keyof QuoterField>(k: K, v: QuoterField[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
  }

  function setOption(i: number, patch: Partial<QuoterOption>) {
    setD((prev) => {
      const options = prev.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
      return { ...prev, options };
    });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("quoter_fields")
      .update({
        label: d.label,
        help: d.help,
        input_type: d.input_type,
        min_value: d.min_value,
        max_value: d.max_value,
        step_value: d.step_value || 1,
        default_value: d.default_value,
        unit: d.unit,
        price_per_unit_cop: d.price_per_unit_cop,
        multiplier: d.multiplier || 1,
        options: d.options,
        is_active: d.is_active,
        sort_order: d.sort_order,
      })
      .eq("id", d.id);
    setSaving(false);
    onMsg(error ? `Error: ${error.message}` : `“${d.label}” guardada.`);
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar la pregunta “${field.label}”?`)) return;
    await supabase.from("quoter_fields").delete().eq("id", field.id);
    onChanged();
  }

  async function move(dir: -1 | 1) {
    const other = siblings[index + dir];
    if (!other) return;
    await Promise.all([
      supabase.from("quoter_fields").update({ sort_order: other.sort_order }).eq("id", field.id),
      supabase.from("quoter_fields").update({ sort_order: field.sort_order }).eq("id", other.id),
    ]);
    onChanged();
  }

  const isChoice = d.input_type === "select" || d.input_type === "toggle";
  const isRange = d.input_type === "slider" || d.input_type === "number";

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-bold">{field.label}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            {INPUT_TYPES.find((t) => t.value === field.input_type)?.label}
          </span>
          {!field.is_active && <span className="text-[11px] text-muted-foreground">Oculta</span>}
        </button>
        <button
          onClick={() => move(-1)}
          disabled={index === 0}
          className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30"
          aria-label="Subir"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => move(1)}
          disabled={index === total - 1}
          className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30"
          aria-label="Bajar"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          onClick={remove}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
          aria-label="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <L label="Etiqueta">
              <input value={d.label} onChange={(e) => set("label", e.target.value)} className={inputCls} />
            </L>
            <L label="Tipo de control">
              <select
                value={d.input_type}
                onChange={(e) => set("input_type", e.target.value as QuoterField["input_type"])}
                className={inputCls}
              >
                {INPUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </L>
            <L label="Texto de ayuda" full>
              <input value={d.help} onChange={(e) => set("help", e.target.value)} className={inputCls} />
            </L>
            {isRange && (
              <>
                <L label="Mínimo">
                  <input
                    type="number"
                    value={d.min_value}
                    onChange={(e) => set("min_value", Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </L>
                <L label="Máximo">
                  <input
                    type="number"
                    value={d.max_value}
                    onChange={(e) => set("max_value", Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </L>
                <L label="Paso">
                  <input
                    type="number"
                    step="0.1"
                    value={d.step_value}
                    onChange={(e) => set("step_value", Number(e.target.value) || 1)}
                    className={inputCls}
                  />
                </L>
                <L label="Unidad (g, cm, h…)">
                  <input value={d.unit} onChange={(e) => set("unit", e.target.value)} className={inputCls} />
                </L>
                <L label="Precio por unidad (COP)">
                  <input
                    type="number"
                    value={d.price_per_unit_cop}
                    onChange={(e) => set("price_per_unit_cop", Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </L>
              </>
            )}
            <L label="Valor por defecto">
              <input
                value={d.default_value}
                onChange={(e) => set("default_value", e.target.value)}
                className={inputCls}
              />
            </L>
            <label className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={d.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                className="h-4 w-4 accent-[var(--brand-orange)]"
              />
              Visible para el cliente
            </label>
          </div>

          {isChoice && (
            <div className="rounded-2xl bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">
                  {d.input_type === "toggle" ? "Recargo cuando dice “Sí”" : "Opciones"}
                </h4>
                {d.input_type === "select" && (
                  <button
                    onClick={() =>
                      set("options", [
                        ...d.options,
                        { label: "Nueva opción", value: `opcion-${d.options.length + 1}`, multiplier: 1, add_cop: 0 },
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-teal-deep)] px-3 py-1 text-xs font-bold text-white"
                  >
                    <Plus className="h-3 w-3" /> Opción
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Multiplicador: 1 = normal, 1.5 = 50% más caro. Recargo: valor fijo en COP.
              </p>
              <div className="mt-2 space-y-2">
                {(d.input_type === "toggle" && d.options.length === 0
                  ? [{ label: "Sí", value: "si", multiplier: 1, add_cop: 0 }]
                  : d.options
                ).map((o, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto]">
                    <input
                      value={o.label}
                      placeholder="Etiqueta"
                      onChange={(e) =>
                        d.options.length === 0
                          ? set("options", [{ ...o, label: e.target.value }])
                          : setOption(i, { label: e.target.value })
                      }
                      className={inputCls}
                    />
                    <input
                      value={o.value}
                      placeholder="valor"
                      onChange={(e) =>
                        d.options.length === 0
                          ? set("options", [{ ...o, value: e.target.value }])
                          : setOption(i, { value: e.target.value })
                      }
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={o.multiplier ?? 1}
                      onChange={(e) =>
                        d.options.length === 0
                          ? set("options", [{ ...o, multiplier: Number(e.target.value) || 1 }])
                          : setOption(i, { multiplier: Number(e.target.value) || 1 })
                      }
                      className={inputCls}
                      title="Multiplicador"
                    />
                    <input
                      type="number"
                      value={o.add_cop ?? 0}
                      onChange={(e) =>
                        d.options.length === 0
                          ? set("options", [{ ...o, add_cop: Number(e.target.value) || 0 }])
                          : setOption(i, { add_cop: Number(e.target.value) || 0 })
                      }
                      className={inputCls}
                      title="Recargo COP"
                    />
                    {d.input_type === "select" && (
                      <button
                        onClick={() => set("options", d.options.filter((_, idx) => idx !== i))}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-red-600"
                        aria-label="Quitar opción"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-teal-deep)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar pregunta
          </button>
        </div>
      )}
    </div>
  );
}

function L({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
