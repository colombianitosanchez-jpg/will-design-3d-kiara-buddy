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
  DEFAULT_QUOTING_VARS,
  getDynamicPriceSourceOptions,
  quotingVarsQuery,
  saveQuotingVars,
  type QuotingVars,
  type CustomQuotingVar,
} from "@/lib/quoting-vars";
import { FormulaEditor, type FormulaVarTag } from "@/components/FormulaEditor";
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
  GripVertical,
  Sparkles,
  Sliders,
  DollarSign,
  Info,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const PRICING_MODES = [
  { value: "formula", label: "Fórmula / Operaciones matemáticas" },
  { value: "fixed", label: "Precio Fijo (ej. Cursos, consulta)" },
  { value: "weight_material", label: "Por Material / Peso (Gramos/ML)" },
  { value: "hours", label: "Por Horas (Máquina / Mano de obra)" },
  { value: "volume_tier", label: "Por Cantidad con Descuento por Volumen" },
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
  const { data: qVars } = useQuery(quotingVarsQuery());
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = () => qc.invalidateQueries({ queryKey: ["quoter-services"] });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  async function handleServiceDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !services) return;

    const oldIndex = services.findIndex((s) => s.id === active.id);
    const newIndex = services.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(services, oldIndex, newIndex);
    await Promise.all(
      reordered.map((svc, idx) =>
        supabase.from("quoter_services").update({ sort_order: idx + 1 }).eq("id", svc.id)
      )
    );
    reload();
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando cotizador…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Cotizador Independiente & Variables</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configura las reglas de cálculo, variables globales, fórmulas encadenadas y visibilidad de desglose para cada servicio público o para Kiara.
          </p>
        </div>
        <button
          onClick={addService}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white shadow hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nuevo servicio
        </button>
      </div>

      {msg && <p className="text-xs font-semibold text-primary">{msg}</p>}

      <GlobalVarsCard onMsg={setMsg} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleServiceDragEnd}>
        <SortableContext items={(services ?? []).map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {(services ?? []).map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                quotingVars={qVars?.vars}
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
        </SortableContext>
      </DndContext>
    </div>
  );
}

/** Variables globales que alimentan los precios y cálculos. Permite CRUD completo de variables personalizadas y fórmulas encadenadas. */
function GlobalVarsCard({ onMsg }: { onMsg: (m: string) => void }) {
  const qc = useQueryClient();
  const { data } = useQuery(quotingVarsQuery());
  const [draft, setDraft] = useState<QuotingVars>(DEFAULT_QUOTING_VARS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setDraft(data.vars);
  }, [data]);

  async function save() {
    if (!data?.id) {
      onMsg("Error: no encontramos la fila de ajustes de variables.");
      return;
    }
    setSaving(true);
    try {
      await saveQuotingVars(data.id, draft);
      onMsg("Variables globales guardadas con éxito.");
      void qc.invalidateQueries({ queryKey: ["admin_settings", "quoting_vars"] });
    } catch (err) {
      onMsg(`Error al guardar variables: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleAddCustomVar() {
    const keyName = window.prompt("Identificador de la variable (ej: comision_disenador, costo_impuesto)");
    if (!keyName?.trim()) return;
    const cleanKey = slugify(keyName).replace(/-/g, "_");

    const newVar: CustomQuotingVar = {
      key: cleanKey,
      label: keyName.trim(),
      value: 0,
      unit: "COP",
      formula: "",
      show_in_breakdown: false,
      help: "Variable de cotización.",
    };

    setDraft((prev) => ({
      ...prev,
      custom_vars: [...(prev.custom_vars || []), newVar],
    }));
  }

  function handleDeleteCustomVar(keyToDelete: string) {
    if (!confirm(`¿Eliminar la variable global "${keyToDelete}"?`)) return;
    setDraft((prev) => ({
      ...prev,
      custom_vars: (prev.custom_vars || []).filter((v) => v.key !== keyToDelete),
    }));
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" /> Variables Globales Dinámicas del Taller
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Todas las variables son 100% editables: puedes ajustar etiqueta, unidad, valor por defecto, descripción, fórmulas encadenadas y si se muestra en el desglose final para el cliente.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddCustomVar}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 text-xs font-bold hover:bg-primary/20"
        >
          <Plus className="h-4 w-4" /> Agregar Variable Global
        </button>
      </div>

      <div className="space-y-3 pt-2">
        {(draft.custom_vars || []).map((v, idx) => (
          <div
            key={v.key || idx}
            className="grid gap-3 sm:grid-cols-12 items-start rounded-2xl border border-border bg-muted/20 p-3"
          >
            <div className="sm:col-span-3">
              <L label="Identificador (Clave)">
                <input
                  value={v.key}
                  onChange={(e) => {
                    const clean = slugify(e.target.value).replace(/-/g, "_");
                    const next = [...draft.custom_vars];
                    next[idx] = { ...v, key: clean };
                    setDraft({ ...draft, custom_vars: next });
                  }}
                  className={inputCls}
                />
              </L>
            </div>

            <div className="sm:col-span-3">
              <L label="Etiqueta visible">
                <input
                  value={v.label}
                  onChange={(e) => {
                    const next = [...draft.custom_vars];
                    next[idx] = { ...v, label: e.target.value };
                    setDraft({ ...draft, custom_vars: next });
                  }}
                  className={inputCls}
                />
              </L>
            </div>

            <div className="sm:col-span-2">
              <L label="Valor Base">
                <input
                  type="number"
                  step="0.01"
                  value={v.value}
                  onChange={(e) => {
                    const next = [...draft.custom_vars];
                    const numVal = Number(e.target.value) || 0;
                    next[idx] = { ...v, value: numVal };
                    setDraft({ ...draft, custom_vars: next });
                  }}
                  className={inputCls}
                />
              </L>
            </div>

            <div className="sm:col-span-2">
              <L label="Unidad (COP, %, g...)">
                <input
                  value={v.unit || ""}
                  onChange={(e) => {
                    const next = [...draft.custom_vars];
                    next[idx] = { ...v, unit: e.target.value };
                    setDraft({ ...draft, custom_vars: next });
                  }}
                  placeholder="COP, %, g"
                  className={inputCls}
                />
              </L>
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleDeleteCustomVar(v.key)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                title="Eliminar variable"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="sm:col-span-12">
              <FormulaEditor
                value={v.formula || ""}
                onChange={(fVal) => {
                  const next = [...draft.custom_vars];
                  next[idx] = { ...v, formula: fVal };
                  setDraft({ ...draft, custom_vars: next });
                }}
                label={`Fórmula para "${v.label || v.key}" (Opcional)`}
                placeholder="ej: (precio_bobina / peso_bobina) * 1.05"
                availableVars={draft.custom_vars
                  .filter((cv) => cv.key !== v.key)
                  .map((cv) => ({ key: cv.key, label: cv.label || cv.key }))}
              />
            </div>

            <div className="sm:col-span-12 flex flex-wrap items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={v.show_in_breakdown}
                  onChange={(e) => {
                    const next = [...draft.custom_vars];
                    next[idx] = { ...v, show_in_breakdown: e.target.checked };
                    setDraft({ ...draft, custom_vars: next });
                  }}
                  className="h-4 w-4 rounded accent-primary"
                />
                Mostrar en desglose al cliente
              </label>

              <input
                value={v.help || ""}
                onChange={(e) => {
                  const next = [...draft.custom_vars];
                  next[idx] = { ...v, help: e.target.value };
                  setDraft({ ...draft, custom_vars: next });
                }}
                placeholder="Descripción o nota interna..."
                className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs"
              />
            </div>
          </div>
        ))}

        {(draft.custom_vars || []).length === 0 && (
          <p className="text-xs text-muted-foreground">No hay variables globales configuradas.</p>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 shadow"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar variables globales
      </button>
    </div>
  );
}


function ServiceCard({
  service,
  quotingVars,
  open,
  onToggle,
  onChanged,
  onMsg,
}: {
  service: QuoterService;
  quotingVars?: QuotingVars;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: service.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [draft, setDraft] = useState(service);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<QuoterValues>(() => defaultValuesFor(service));
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setDraft(service);
    setTest(defaultValuesFor(service));
  }, [service]);

  const preview = useMemo(() => computeQuote(draft, test, qty, quotingVars), [draft, test, qty, quotingVars]);

  function set<K extends keyof QuoterService>(key: K, value: QuoterService[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = service.fields.findIndex((f) => f.id === active.id);
    const newIndex = service.fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(service.fields, oldIndex, newIndex);
    await Promise.all(
      reordered.map((f, idx) =>
        supabase.from("quoter_fields").update({ sort_order: idx + 1 }).eq("id", f.id)
      )
    );
    onChanged();
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
        gastos_extra_cop: draft.gastos_extra_cop,
        min_price_cop: draft.min_price_cop,
        margin_percent: draft.margin_percent,
        pricing_mode: draft.pricing_mode || "formula",
        uses_global_vars: draft.uses_global_vars ?? false,
        price_display: draft.price_display || "final",
        formula: draft.formula || null,
        allow_quantity: draft.allow_quantity,
        allow_file: draft.allow_file,
        requires_approval: draft.requires_approval,
        approval_threshold_cop: draft.approval_threshold_cop,
        is_active: draft.is_active,
        sort_order: draft.sort_order,
        site_anchor: draft.site_anchor.trim(),
        has_calculator: draft.has_calculator !== false,
        whatsapp_custom_message: draft.whatsapp_custom_message || null,
        volume_tiers: draft.volume_tiers || [],
      })
      .eq("id", draft.id);
    setSaving(false);
    onMsg(error ? `Error: ${error.message}` : `“${draft.name}” guardado.`);
    onChanged();
  }

  async function duplicateService() {
    const newName = `${draft.name} (Copia)`;
    const newSlug = `${draft.slug}-copia-${Date.now().toString().slice(-4)}`;
    const { data: newSvc, error: svcErr } = await supabase
      .from("quoter_services")
      .insert({
        name: newName,
        slug: newSlug,
        tagline: draft.tagline,
        description: draft.description,
        icon: draft.icon,
        base_price_cop: draft.base_price_cop,
        gastos_extra_cop: draft.gastos_extra_cop,
        min_price_cop: draft.min_price_cop,
        margin_percent: draft.margin_percent,
        pricing_mode: draft.pricing_mode || "formula",
        uses_global_vars: draft.uses_global_vars ?? false,
        price_display: draft.price_display || "final",
        allow_quantity: draft.allow_quantity,
        allow_file: draft.allow_file,
        requires_approval: draft.requires_approval,
        approval_threshold_cop: draft.approval_threshold_cop,
        is_active: draft.is_active,
        sort_order: draft.sort_order + 1,
        site_anchor: draft.site_anchor,
        has_calculator: draft.has_calculator !== false,
        whatsapp_custom_message: draft.whatsapp_custom_message || null,
        volume_tiers: draft.volume_tiers || [],
        formula: draft.formula || null,
      })
      .select("id")
      .single();

    if (svcErr || !newSvc) {
      onMsg(`Error al duplicar: ${svcErr?.message}`);
      return;
    }

    if (draft.fields.length > 0) {
      const newFields = draft.fields.map((f) => ({
        service_id: newSvc.id,
        key: f.key,
        label: f.label,
        help: f.help,
        input_type: f.input_type,
        min_value: f.min_value,
        max_value: f.max_value,
        step_value: f.step_value,
        default_value: f.default_value,
        unit: f.unit,
        price_per_unit_cop: f.price_per_unit_cop,
        price_source: f.price_source,
        multiplier: f.multiplier,
        formula: f.formula || null,
        media_url: f.media_url || null,
        media_type: f.media_type || "image",
        options: f.options,
        is_required: f.is_required,
        is_active: f.is_active,
        sort_order: f.sort_order,
      }));
      await supabase.from("quoter_fields").insert(newFields);
    }

    onMsg(`Servicio “${newName}” duplicado con éxito.`);
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
    <section ref={setNodeRef} style={style} className="rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
          title="Arrastrar para reordenar servicio"
        >
          <GripVertical className="h-5 w-5" />
        </button>

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
            {/* Configuración del Modo de Precios y Reglas del Cotizador */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Reglas de Cotización Independiente
              </h4>

              <div className="grid gap-3 sm:grid-cols-3">
                <L label="Modo de Precio">
                  <select
                    value={draft.pricing_mode || "formula"}
                    onChange={(e) => set("pricing_mode", e.target.value as any)}
                    className={inputCls}
                  >
                    {PRICING_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </L>

                <L label="Visibilidad para el Cliente">
                  <select
                    value={draft.price_display || "final"}
                    onChange={(e) => set("price_display", e.target.value as any)}
                    className={inputCls}
                  >
                    <option value="final">Ocultar desglose (Solo Precio Final)</option>
                    <option value="breakdown">Mostrar desglose autorizado</option>
                  </select>
                </L>

                <L label="Variables Globales">
                  <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.uses_global_vars)}
                      onChange={(e) => set("uses_global_vars", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    Usar variables globales del taller
                  </label>
                </L>
              </div>

              {draft.pricing_mode === "formula" && (
                <div className="pt-2">
                  <FormulaEditor
                    value={draft.formula || ""}
                    onChange={(val) => set("formula", val)}
                    label="Fórmula Maestra del Servicio (Anula la suma simple de campos si está definida)"
                    placeholder="Ej: (peso_gramos * fdm_gram_cost) + (horas_impresion * machine_hour_rate) + base_price"
                    availableVars={[
                      { key: "base_price", label: "Precio Base" },
                      { key: "fdm_gram_cost", label: "Costo gramo FDM" },
                      { key: "resin_ml_cost", label: "Costo ml Resina" },
                      { key: "machine_hour_rate", label: "Hora Máquina" },
                      { key: "labor_hour_rate", label: "Hora Mano de obra" },
                      ...draft.fields.map((f) => ({ key: f.key, label: f.label })),
                    ]}
                  />
                </div>
              )}
            </div>

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
              <L label="Gastos extra (COP)">
                <input
                  type="number"
                  min={0}
                  value={draft.gastos_extra_cop}
                  onChange={(e) => set("gastos_extra_cop", Number(e.target.value) || 0)}
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
              <L label="Umbral para requerir aprobación humana (COP)">
                <input
                  type="number"
                  min={0}
                  placeholder="Ej: 500000"
                  value={draft.approval_threshold_cop || 0}
                  onChange={(e) => set("approval_threshold_cop", Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </L>
              <L label="Módulo Calculador Activo">
                <label className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.has_calculator !== false}
                    onChange={(e) => set("has_calculator", e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-orange)]"
                  />
                  {draft.has_calculator !== false ? "Sí (Mostrar cotizador)" : "No (Ir directo a WhatsApp)"}
                </label>
              </L>
              {draft.has_calculator === false && (
                <L label="Mensaje personalizado para WhatsApp" full>
                  <textarea
                    rows={2}
                    value={draft.whatsapp_custom_message || ""}
                    onChange={(e) => set("whatsapp_custom_message", e.target.value)}
                    placeholder="Hola Will Design 3D! Quisiera consultar sobre el servicio…"
                    className={inputCls}
                  />
                </L>
              )}
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
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
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.requires_approval || false}
                    onChange={(e) => set("requires_approval", e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-orange)]"
                  />
                  Requerir aprobación manual siempre
                </label>
              </div>

              {/* Escalas de Descuento por Volumen */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold">Descuentos por Volumen (Volume Tiers)</h4>
                    <p className="text-xs text-muted-foreground">
                      Configura tarifas escalonadas según la cantidad de unidades.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      set("volume_tiers", [
                        ...(draft.volume_tiers || []),
                        { min_qty: 6, max_qty: 20, discount_percentage: 10, fixed_unit_price_cop: null },
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-teal-deep)] px-3 py-1 text-xs font-bold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar rango
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {(draft.volume_tiers || []).map((tier, idx) => (
                    <div key={idx} className="grid gap-2 sm:grid-cols-4 items-center">
                      <L label="Cantidad mín">
                        <input
                          type="number"
                          min={1}
                          value={tier.min_qty}
                          onChange={(e) => {
                            const tiers = [...(draft.volume_tiers || [])];
                            tiers[idx] = { ...tier, min_qty: Number(e.target.value) || 1 };
                            set("volume_tiers", tiers);
                          }}
                          className={inputCls}
                        />
                      </L>
                      <L label="Cantidad máx (o vacío)">
                        <input
                          type="number"
                          value={tier.max_qty ?? ""}
                          onChange={(e) => {
                            const tiers = [...(draft.volume_tiers || [])];
                            tiers[idx] = { ...tier, max_qty: e.target.value ? Number(e.target.value) : null };
                            set("volume_tiers", tiers);
                          }}
                          placeholder="∞"
                          className={inputCls}
                        />
                      </L>
                      <L label="% Descuento">
                        <input
                          type="number"
                          value={tier.discount_percentage}
                          onChange={(e) => {
                            const tiers = [...(draft.volume_tiers || [])];
                            tiers[idx] = { ...tier, discount_percentage: Number(e.target.value) || 0 };
                            set("volume_tiers", tiers);
                          }}
                          className={inputCls}
                        />
                      </L>
                      <div className="flex items-end gap-2">
                        <L label="Precio fijo unitario (COP) opcional" full>
                          <input
                            type="number"
                            value={tier.fixed_unit_price_cop ?? ""}
                            onChange={(e) => {
                              const tiers = [...(draft.volume_tiers || [])];
                              tiers[idx] = {
                                ...tier,
                                fixed_unit_price_cop: e.target.value ? Number(e.target.value) : null,
                              };
                              set("volume_tiers", tiers);
                            }}
                            placeholder="Opcional"
                            className={inputCls}
                          />
                        </L>
                        <button
                          type="button"
                          onClick={() => {
                            const tiers = (draft.volume_tiers || []).filter((_, i) => i !== idx);
                            set("volume_tiers", tiers);
                          }}
                          className="mb-1 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(draft.volume_tiers || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin rangos de descuento configurados.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 shadow"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar servicio
              </button>
              <button
                onClick={duplicateService}
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold hover:bg-muted"
              >
                Duplicar servicio
              </button>
            </div>

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
              <DndContext sensors={fieldSensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                <SortableContext items={service.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="mt-3 space-y-3">
                    {service.fields.map((f, i) => (
                      <FieldEditor
                        key={f.id}
                        field={f}
                        index={i}
                        total={service.fields.length}
                        siblings={service.fields}
                        quotingVars={quotingVars}
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
                </SortableContext>
              </DndContext>
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
              {draft.price_display === "final" ? (
                <div className="text-xs text-muted-foreground italic mb-2">
                  (El desglose estará oculto para el cliente final; solo verá el total)
                </div>
              ) : (
                preview.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-2 text-muted-foreground">
                    <span>
                      {l.label}
                      {l.detail ? ` · ${l.detail}` : ""}
                    </span>
                    <span>{formatCOP(l.amount)}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-black">
                <span>Total Calculado</span>
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
  quotingVars,
  onChanged,
  onMsg,
}: {
  field: QuoterField;
  index: number;
  total: number;
  siblings: QuoterField[];
  quotingVars?: QuotingVars;
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const optionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  function handleOptionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = Number(active.id.toString().replace("opt-", ""));
    const newIndex = Number(over.id.toString().replace("opt-", ""));
    if (isNaN(oldIndex) || isNaN(newIndex)) return;

    setD((prev) => ({
      ...prev,
      options: arrayMove(prev.options, oldIndex, newIndex),
    }));
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
        price_source: d.price_source ?? "fixed",
        multiplier: d.multiplier || 1,
        formula: d.formula || null,
        options: d.options,
        is_active: d.is_active,
        sort_order: d.sort_order,
        is_required: d.is_required,
        media_url: d.media_url || null,
        media_type: d.media_type || "image",
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

  const isChoice = d.input_type === "select" || d.input_type === "toggle";
  const isRange = d.input_type === "slider" || d.input_type === "number";

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-border p-4 bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
          title="Arrastrar para reordenar pregunta"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-bold">{field.label}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            {INPUT_TYPES.find((t) => t.value === field.input_type)?.label}
          </span>
          {!field.is_active && <span className="text-[11px] text-muted-foreground">Oculta</span>}
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
            <L label="Posición / Índice (1, 2, 3…)">
              <input
                type="number"
                value={d.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
                className={inputCls}
              />
            </L>
            <L label="URL de Vista Previa (Imagen/GIF/Video MP4)">
              <input
                value={d.media_url || ""}
                onChange={(e) => set("media_url", e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </L>
            <L label="Tipo de Media">
              <select
                value={d.media_type || "image"}
                onChange={(e) => set("media_type", e.target.value as any)}
                className={inputCls}
              >
                <option value="image">Imagen / GIF</option>
                <option value="video">Video MP4/WebM</option>
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
                    disabled={d.price_source !== "fixed"}
                    className={`${inputCls} disabled:opacity-50`}
                  />
                </L>
                <L label="¿De dónde sale el costo?">
                  <select
                    value={d.price_source ?? "fixed"}
                    onChange={(e) =>
                      set("price_source", e.target.value as QuoterField["price_source"])
                    }
                    className={inputCls}
                  >
                    {getDynamicPriceSourceOptions(quotingVars).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </L>

                <div className="sm:col-span-2 pt-2">
                  <FormulaEditor
                    value={d.formula || ""}
                    onChange={(fVal) => set("formula", fVal)}
                    label={`Fórmula específica para "${d.label}" (Opcional)`}
                    placeholder="Ej: (peso_gramos * fdm_gram_cost) * 1.10"
                    availableVars={[
                      { key: "fdm_gram_cost", label: "Costo gramo FDM" },
                      { key: "resin_ml_cost", label: "Costo ml Resina" },
                      { key: "machine_hour_rate", label: "Hora Máquina" },
                      { key: "labor_hour_rate", label: "Hora Mano obra" },
                      { key: d.key, label: d.label },
                    ]}
                  />
                </div>
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
                checked={d.is_required}
                onChange={(e) => set("is_required", e.target.checked)}
                className="h-4 w-4 accent-[var(--brand-orange)]"
              />
              Campo obligatorio
            </label>
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
                    type="button"
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
                Multiplicador: 1 = normal, 1.5 = 50% más caro. Recargo: valor fijo en COP. Usa el ícono para arrastrar.
              </p>

              {d.input_type === "select" ? (
                <DndContext sensors={optionSensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
                  <SortableContext items={d.options.map((_, i) => `opt-${i}`)} strategy={verticalListSortingStrategy}>
                    <div className="mt-2 space-y-2">
                      {d.options.map((o, i) => (
                        <SortableOptionRow
                          key={`opt-${i}`}
                          id={`opt-${i}`}
                          option={o}
                          onChange={(patch) => setOption(i, patch)}
                          onRemove={() => set("options", d.options.filter((_, idx) => idx !== i))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="mt-2 space-y-2">
                  {(d.options.length === 0
                    ? [{ label: "Sí", value: "si", multiplier: 1, add_cop: 0 }]
                    : d.options
                  ).map((o, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]">
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
                    </div>
                  ))}
                </div>
              )}
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

function SortableOptionRow({
  id,
  option: o,
  onChange,
  onRemove,
}: {
  id: string;
  option: QuoterOption;
  onChange: (patch: Partial<QuoterOption>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="grid gap-2 sm:grid-cols-[auto_1.4fr_1fr_0.8fr_0.8fr_auto] items-center">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
        title="Arrastrar opción"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <input
        value={o.label}
        placeholder="Etiqueta"
        onChange={(e) => onChange({ label: e.target.value })}
        className={inputCls}
      />
      <input
        value={o.value}
        placeholder="valor"
        onChange={(e) => onChange({ value: e.target.value })}
        className={inputCls}
      />
      <input
        type="number"
        step="0.05"
        value={o.multiplier ?? 1}
        onChange={(e) => onChange({ multiplier: Number(e.target.value) || 1 })}
        className={inputCls}
        title="Multiplicador"
      />
      <input
        type="number"
        value={o.add_cop ?? 0}
        onChange={(e) => onChange({ add_cop: Number(e.target.value) || 0 })}
        className={inputCls}
        title="Recargo COP"
      />
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-red-600"
        aria-label="Quitar opción"
      >
        <Trash2 className="h-4 w-4" />
      </button>
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
