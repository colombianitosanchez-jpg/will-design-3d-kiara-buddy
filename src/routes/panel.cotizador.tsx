import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
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
import { calcQuote, DEFAULT_RULES, type PricingRules } from "@/lib/pricing";
import { FormulaEditor } from "@/components/FormulaEditor";
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
  Sliders,
  DollarSign,
  FileText,
  Boxes,
  Check,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      { title: "Cotizador Unificado · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: QuoterUnifiedAdmin,
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

function QuoterUnifiedAdmin() {
  const [activeTab, setActiveTab] = useState("servicios");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Calculator className="h-8 w-8 text-[var(--brand-orange)]" />
            Cotizador Unificado
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gestión completa de servicios cotizables, variables dinámicas globales, reglas de precios base y textos públicos del cotizador.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start border-b border-border bg-transparent p-0">
          <TabsTrigger value="servicios" className="flex items-center gap-2 py-2.5">
            <Boxes className="h-4 w-4" /> Servicios Cotizables
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-2 py-2.5">
            <Sliders className="h-4 w-4" /> Variables Globales
          </TabsTrigger>
          <TabsTrigger value="reglas" className="flex items-center gap-2 py-2.5">
            <DollarSign className="h-4 w-4" /> Reglas de Precios Base
          </TabsTrigger>
          <TabsTrigger value="textos" className="flex items-center gap-2 py-2.5">
            <FileText className="h-4 w-4" /> Textos y Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="servicios" className="mt-6">
          <TabServiciosCotizables />
        </TabsContent>

        <TabsContent value="variables" className="mt-6">
          <TabVariablesGlobales />
        </TabsContent>

        <TabsContent value="reglas" className="mt-6">
          <TabReglasPreciosBase />
        </TabsContent>

        <TabsContent value="textos" className="mt-6">
          <TabTextosPlantillas />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// TAB 1: SERVICIOS COTIZABLES
// =============================================================================
function TabServiciosCotizables() {
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
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Servicios y Preguntas del Cotizador</h2>
          <p className="text-xs text-muted-foreground">
            Configura los servicios que el cliente puede cotizar online y sus campos de entrada.
          </p>
        </div>
        <Button
          onClick={addService}
          className="bg-[var(--brand-wine)] hover:opacity-90 text-white font-bold rounded-full"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
        </Button>
      </div>

      {msg && <p className="text-xs font-semibold text-primary">{msg}</p>}

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

// =============================================================================
// TAB 2: VARIABLES GLOBALES
// =============================================================================
function TabVariablesGlobales() {
  const qc = useQueryClient();
  const { data } = useQuery(quotingVarsQuery());
  const [draft, setDraft] = useState<QuotingVars>(DEFAULT_QUOTING_VARS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setDraft(data.vars);
  }, [data]);

  async function save() {
    if (!data?.id) {
      alert("Error: no encontramos la fila de ajustes de variables.");
      return;
    }
    setSaving(true);
    try {
      await saveQuotingVars(data.id, draft);
      alert("Variables globales guardadas con éxito.");
      void qc.invalidateQueries({ queryKey: ["admin_settings", "quoting_vars"] });
    } catch (err) {
      alert(`Error al guardar variables: ${(err as Error).message}`);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Variables Globales Dinámicas del Taller</CardTitle>
          <CardDescription className="max-w-3xl">
            Variables compartidas entre servicios para cálculos de costos y fórmulas.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddCustomVar} className="rounded-full font-bold">
          <Plus className="mr-2 h-4 w-4" /> Agregar Variable
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {(draft.custom_vars || []).map((v, idx) => (
            <div
              key={v.key || idx}
              className="grid gap-3 sm:grid-cols-12 items-start rounded-2xl border border-border bg-muted/20 p-3"
            >
              <div className="sm:col-span-3">
                <L label="Clave">
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
                <L label="Unidad">
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
                  className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
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

        <Button
          onClick={save}
          disabled={saving}
          className="bg-[var(--brand-wine)] text-white font-bold rounded-full"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar variables globales
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TAB 3: REGLAS DE PRECIOS BASE (Desde panel.cotizaciones.tsx)
// =============================================================================
type PricingRow = PricingRules & { id: string };

function TabReglasPreciosBase() {
  const [rules, setRules] = useState<PricingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState({ grams: 120, hours: 4, material: "PLA", finish: "Basico", quantity: 1 });

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

  const preview = useMemo(
    () => (rules ? calcQuote(rules, test) : null),
    [rules, test],
  );

  async function save() {
    if (!rules) return;
    setSaving(true);
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
    if (error) alert("Error: " + error.message);
    else alert("Reglas de precios guardadas.");
  }

  function setNum(key: keyof PricingRules, value: string) {
    setRules((r) => (r ? { ...r, [key]: Number(value) || 0 } : r));
  }

  function setMult(field: "material_multipliers" | "finish_multipliers", key: string, value: string) {
    setRules((r) => (r ? { ...r, [field]: { ...r[field], [key]: Number(value) || 0 } } : r));
  }

  function addMult(field: "material_multipliers" | "finish_multipliers") {
    const name = window.prompt(field === "material_multipliers" ? "Nombre del material" : "Nombre del acabado");
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando reglas de precios…
      </div>
    );
  }

  const numFields: [keyof PricingRules, string, string][] = [
    ["base_price_per_gram_cop", "Precio por gramo (COP)", "Costo base del material por gramo."],
    ["machine_hour_cop", "Hora de máquina (COP)", "Cuánto cobras por cada hora de impresión."],
    ["setup_fee_cop", "Costo de preparación (COP)", "Valor fijo por preparar el archivo y la máquina."],
    ["margin_percent", "Margen de ganancia (%)", "Porcentaje que se suma al costo."],
    ["min_price_cop", "Precio mínimo (COP)", "Ninguna cotización quedará por debajo de este valor."],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Valores Base de Precios</CardTitle>
            <CardDescription>
              Valores globales por defecto para cálculos directos de impresión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
        </Card>

        {(
          [
            ["material_multipliers", "Multiplicadores por material"],
            ["finish_multipliers", "Multiplicadores por acabado"],
          ] as const
        ).map(([field, title]) => (
          <Card key={field}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{title}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => addMult(field)} className="rounded-full font-bold">
                <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
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
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button onClick={save} disabled={saving} className="bg-[var(--brand-wine)] text-white font-bold rounded-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Reglas de Precios
        </Button>
      </div>

      <aside className="h-fit rounded-3xl border border-border bg-card p-5 lg:sticky lg:top-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Calculator className="h-5 w-5 text-[var(--brand-orange)]" /> Simulador de Reglas
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase text-muted-foreground">Gramos</span>
            <input
              type="number"
              min={0}
              value={test.grams}
              onChange={(e) => setTest((t) => ({ ...t, grams: Number(e.target.value) || 0 }))}
              className={inputCls}
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
              className={inputCls}
            />
          </label>
        </div>

        {preview && (
          <div className="mt-4 space-y-1 border-t border-dashed border-border pt-3 text-xs">
            <div className="flex justify-between border-t border-border pt-2 text-base font-black">
              <span>Total Estimado</span>
              <span>{formatCOP(preview.total_cop)}</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

// =============================================================================
// TAB 4: TEXTOS Y PLANTILLAS DEL COTIZADOR
// =============================================================================
function TabTextosPlantillas() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const keys = [
    "quoter_badge",
    "quoter_title",
    "quoter_subtitle",
    "quoter_service_label",
    "quoter_disclaimer",
    "whatsapp_quote_template",
  ];

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("site_content")
        .select("key, value")
        .in("key", keys);
      const map: Record<string, string> = {};
      ((data ?? []) as { key: string; value: string }[]).forEach((r) => (map[r.key] = r.value ?? ""));
      setValues(map);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const rows = keys.map((k) => ({
        key: k,
        value: values[k] ?? "",
        section: "Cotizadores",
      }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
      alert("Textos del cotizador guardados correctamente.");
    } catch (e) {
      alert("Error al guardar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando textos del cotizador…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Textos Públicos y Plantilla de WhatsApp</CardTitle>
        <CardDescription>
          Configura los encabezados, avisos legales del cotizador web y la plantilla del mensaje enviado a WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs font-bold">Etiqueta Superior (Badge)</Label>
          <Input
            value={values.quoter_badge ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, quoter_badge: e.target.value }))}
            placeholder="Ej: Cotizador Online"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-bold">Título del Cotizador</Label>
          <Textarea
            rows={2}
            value={values.quoter_title ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, quoter_title: e.target.value }))}
            placeholder="Calcula el costo estimado de tu proyecto en segundos"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-bold">Subtítulo / Instrucciones</Label>
          <Textarea
            rows={2}
            value={values.quoter_subtitle ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, quoter_subtitle: e.target.value }))}
            placeholder="Selecciona el servicio, ajusta los parámetros y obtén una cotización inmediata"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-bold">Aviso Legal / Disclaimer</Label>
          <Textarea
            rows={2}
            value={values.quoter_disclaimer ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, quoter_disclaimer: e.target.value }))}
            placeholder="El precio generado es estimado y sujeto a revisión técnica del archivo 3D."
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-bold">Plantilla Mensaje de WhatsApp</Label>
          <p className="text-[11px] text-muted-foreground mb-1">
            Variables disponibles: {"{{servicio}}"}, {"{{cliente}}"}, {"{{email}}"}, {"{{telefono}}"}, {"{{resumen}}"}, {"{{total}}"}, {"{{notas}}"}, {"{{media_link}}"}
          </p>
          <Textarea
            rows={6}
            value={values.whatsapp_quote_template ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, whatsapp_quote_template: e.target.value }))}
            className="font-mono text-xs mt-1"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--brand-wine)] text-white font-bold rounded-full"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Textos del Cotizador
        </Button>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// HELPER COMPONENTS FROM ORIGINAL PANEL.COTIZADOR
// -----------------------------------------------------------------------------
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

  const preview = useMemo(() => computeQuote(draft, test, qty), [draft, test, qty]);

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
        pricing_mode: draft.pricing_mode || "",
        uses_global_vars: draft.uses_global_vars ?? false,
        price_display: draft.price_display || "",
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
      default_value: "",
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
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-border bg-background p-5 lg:sticky lg:top-6">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Calculator className="h-5 w-5 text-[var(--brand-orange)]" /> Simulador
            </h3>
            <div className="mt-4 space-y-3">
              {draft.fields.map((f) => (
                <div key={f.id}>
                  <span className="text-xs font-bold uppercase text-muted-foreground">{f.label}</span>
                  <input
                    type="number"
                    value={test[f.key] ?? ""}
                    onChange={(e) => setTest((t) => ({ ...t, [f.key]: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-2 text-base font-black flex justify-between">
              <span>Total</span>
              <span>{formatCOP(preview.total_cop)}</span>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function FieldEditor({
  field,
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

  const [d, setD] = useState(field);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setD(field), [field]);

  function set<K extends keyof QuoterField>(k: K, v: QuoterField[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
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

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-border p-4 bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
          title="Arrastrar"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-bold">{field.label}</span>
        </button>

        <button onClick={remove} className="rounded-lg p-1.5 text-muted-foreground hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <L label="Etiqueta">
            <input value={d.label} onChange={(e) => set("label", e.target.value)} className={inputCls} />
          </L>
          <Button onClick={save} disabled={saving} size="sm" className="bg-[var(--brand-teal-deep)] text-white">
            Guardar pregunta
          </Button>
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
