import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  quoterServicesQuery,
  defaultValuesFor,
  type VolumeDiscountTier,
  type QuoterField,
  type QuoterPricingMode,
  type QuoterService,
  type QuoterValues,
} from "@/lib/quoter";
import { normalizeSiteAnchor } from "@/lib/quoter-ui";
import {
  DEFAULT_QUOTING_VARS,
  quotingVarsQuery,
  saveQuotingVars,
  type QuotingVars,
  type CustomQuotingVar,
} from "@/lib/quoting-vars";
import { FormulaEditor, type FormulaVarTag } from "@/components/FormulaEditor";
import { QuoterFieldEditor } from "@/components/QuoterFieldEditor";
import { QuoterSimulatorAside } from "@/components/QuoterSimulatorAside";
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
  FileText,
  Boxes,
  MessageSquare,
  Info,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
      { name: "description", content: "Configuración de servicios, preguntas y precios de Will Design 3D." },
      { property: "og:title", content: "Cotizadores · Panel Will Design 3D" },
      { property: "og:description", content: "Administración de cotizadores y variables del taller." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuoterUnifiedAdmin,
});

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

const PRICING_MODES: { value: QuoterPricingMode; label: string }[] = [
  { value: "formula", label: "Fórmula / Campos paramétricos" },
  { value: "fixed", label: "Precio Fijo (ej. Cursos, consulta)" },
  { value: "weight_material", label: "Por Material / Peso (Gramos/ML)" },
  { value: "hours", label: "Por Horas (Máquina / Mano de obra)" },
  { value: "volume_tier", label: "Por Cantidad con Descuento por Volumen" },
];

const ICON_OPTIONS = [
  { value: "printer", label: "Impresora 3D" },
  { value: "pencil-ruler", label: "Modelado / Diseño" },
  { value: "sparkles", label: "Acabados / Post-procesado" },
  { value: "scan", label: "Escaneo 3D" },
  { value: "package", label: "Paquete / Producción" },
  { value: "paintbrush", label: "Pintura" },
  { value: "boxes", label: "Lotes / Volumen" },
  { value: "graduation-cap", label: "Cursos / Capacitación" },
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
    <div className="quoter-workspace min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Calculator className="h-8 w-8 text-[var(--brand-orange)]" />
            Cotizador Unificado
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configura servicios cotizables, variables dinámicas globales y textos públicos del cotizador en línea.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 border-b border-border bg-transparent p-0">
          <TabsTrigger value="servicios" className="flex items-center gap-2 py-2.5 whitespace-nowrap">
            <Boxes className="h-4 w-4" /> Servicios Cotizables
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-2 py-2.5 whitespace-nowrap">
            <Sliders className="h-4 w-4" /> Variables Globales
          </TabsTrigger>
          <TabsTrigger value="textos" className="flex items-center gap-2 py-2.5 whitespace-nowrap">
            <FileText className="h-4 w-4" /> Textos y Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="servicios" className="mt-6">
          <TabServiciosCotizables />
        </TabsContent>

        <TabsContent value="variables" className="mt-6">
          <TabVariablesGlobales />
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
  const { data: services, isLoading, error: loadError } = useQuery(quoterServicesQuery(true));
  const { data: qVars } = useQuery(quotingVarsQuery());
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [creatingBusy, setCreatingBusy] = useState(false);

  const reload = () => qc.invalidateQueries({ queryKey: ["quoter-services"] });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Escribe un nombre para el servicio");
      return;
    }
    setCreatingBusy(true);
    const baseSlug = slugify(newName) || `servicio-${Date.now()}`;
    const { data: inserted, error } = await supabase
      .from("quoter_services")
      .insert({
        slug: baseSlug,
        site_anchor: baseSlug,
        name: newName.trim(),
        sort_order: (services?.length ?? 0) + 1,
        has_calculator: true,
      })
      .select("id")
      .maybeSingle();
    setCreatingBusy(false);

    if (error) {
      toast.error(`Error al crear servicio: ${error.message}`);
      setMsg(`Error: ${error.message}`);
      return;
    }
    toast.success(`Servicio "${newName.trim()}" creado`);
    setMsg("Servicio creado.");
    setNewName("");
    setCreating(false);
    await reload();
    if (inserted?.id) setOpenId(inserted.id);
  }

  async function handleServiceDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !services) return;

    const oldIndex = services.findIndex((s) => s.id === active.id);
    const newIndex = services.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(services, oldIndex, newIndex);
    const results = await Promise.all(
      reordered.map((svc, idx) =>
        supabase.from("quoter_services").update({ sort_order: idx + 1 }).eq("id", svc.id),
      ),
    );
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) {
      toast.error(`Error al reordenar: ${firstErr.message}`);
    } else {
      toast.success("Orden de servicios actualizado");
    }
    reload();
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 space-y-2">
        <p className="font-bold">Error al consultar servicios del cotizador</p>
        <p className="text-xs">{(loadError as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Servicios y Preguntas del Cotizador</h2>
          <p className="text-xs text-muted-foreground">
            Arrastra para reordenar los servicios en la web y haz clic en cualquiera para editar tarifas, preguntas y probar el simulador.
          </p>
        </div>
        {!creating && (
          <Button
            type="button"
            onClick={() => setCreating(true)}
            className="bg-accent hover:opacity-90 text-primary-foreground font-bold rounded-full whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
          </Button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={handleCreateService}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
        >
          <label className="flex-1 min-w-[220px] block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Nombre del nuevo servicio
            </span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Impresión en Resina Alta Resolución"
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={creatingBusy}
              className="rounded-full bg-accent text-primary-foreground font-bold"
            >
              {creatingBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Crear servicio
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              className="rounded-full"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {msg && <p className="text-xs font-semibold text-muted-foreground">{msg}</p>}

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
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Aún no hay servicios en el cotizador. Crea el primero con “Nuevo Servicio”.
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// =============================================================================
// TAB 2: VARIABLES GLOBALES (Fuente única de verdad para tarifas)
// =============================================================================
function TabVariablesGlobales() {
  const qc = useQueryClient();
  const { data } = useQuery(quotingVarsQuery());
  const [draft, setDraft] = useState<QuotingVars>(DEFAULT_QUOTING_VARS);
  const [saving, setSaving] = useState(false);
  const [addingVar, setAddingVar] = useState(false);
  const [newVarLabel, setNewVarLabel] = useState("");
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  useEffect(() => {
    if (data) setDraft(data.vars);
  }, [data]);

  async function save() {
    if (!data?.id) {
      toast.error("No encontramos la fila de ajustes de variables en admin_settings.");
      return;
    }
    setSaving(true);
    try {
      await saveQuotingVars(data.id, draft);
      toast.success("Variables globales guardadas con éxito");
      void qc.invalidateQueries({ queryKey: ["admin_settings", "quoting_vars"] });
    } catch (err) {
      toast.error(`Error al guardar variables: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleAddCustomVar(e: React.FormEvent) {
    e.preventDefault();
    if (!newVarLabel.trim()) {
      toast.error("Escribe un nombre o identificador para la variable");
      return;
    }
    const cleanKey = slugify(newVarLabel).replace(/-/g, "_");
    if (!cleanKey) {
      toast.error("El nombre debe incluir letras o números");
      return;
    }
    if ((draft.custom_vars || []).some((v) => v.key === cleanKey)) {
      toast.error(`Ya existe una variable con clave "${cleanKey}"`);
      return;
    }

    const newVar: CustomQuotingVar = {
      key: cleanKey,
      label: newVarLabel.trim(),
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
    setNewVarLabel("");
    setAddingVar(false);
    toast.success(`Variable "${cleanKey}" agregada (recuerda guardar los cambios)`);
  }

  function handleDeleteCustomVar(keyToDelete: string) {
    setDraft((prev) => ({
      ...prev,
      custom_vars: (prev.custom_vars || []).filter((v) => v.key !== keyToDelete),
    }));
    setConfirmDeleteKey(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Variables Globales Dinámicas del Taller</CardTitle>
          <CardDescription className="max-w-3xl">
            Fuente única de costos compartidos entre servicios (gramo FDM, ml de resina, horas, márgenes y variables personalizadas).
          </CardDescription>
        </div>
        {!addingVar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddingVar(true)}
            className="rounded-full font-bold whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" /> Agregar Variable
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
          <p>
            El cotizador web calcula los precios únicamente a partir de estas <strong>Variables Globales</strong> y la configuración de cada servicio (las antiguas reglas de precios base ya no se usan en la tienda pública).
          </p>
        </div>

        {addingVar && (
          <form
            onSubmit={handleAddCustomVar}
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-muted/20 p-3"
          >
            <label className="flex-1 min-w-[200px] block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Nombre o clave de la nueva variable
              </span>
              <input
                  value={newVarLabel}
                onChange={(e) => setNewVarLabel(e.target.value)}
                placeholder="Ej: Comisión diseñador, Costo envío base"
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <Button type="submit" size="sm" className="rounded-full bg-secondary text-primary-foreground font-bold">
              Agregar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAddingVar(false);
                setNewVarLabel("");
              }}
              className="rounded-full"
            >
              Cancelar
            </Button>
          </form>
        )}

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
                    className={`font-mono text-xs ${inputCls}`}
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
                    className={`tabular-nums ${inputCls}`}
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

              <div className="sm:col-span-2 flex justify-end pt-5">
                {confirmDeleteKey === v.key ? (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost"
                      type="button"
                      onClick={() => handleDeleteCustomVar(v.key)}
                      className="rounded-lg bg-destructive px-2 py-1 text-xs font-bold text-primary-foreground hover:bg-destructive/90"
                    >
                      Confirmar
                    </Button>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => setConfirmDeleteKey(null)}
                      className="rounded-lg border border-border p-1 text-muted-foreground hover:bg-muted"
                      aria-label="Cancelar eliminación"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setConfirmDeleteKey(v.key)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Eliminar variable"
                    aria-label={`Eliminar variable ${v.label || v.key}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
                <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                  <Info className="size-4" /> Costos internos privados
                </label>

                <input
                  aria-label={`Nota interna de ${v.label || v.key}`}
                  value={v.help || ""}
                  onChange={(e) => {
                    const next = [...draft.custom_vars];
                    next[idx] = { ...v, help: e.target.value };
                    setDraft({ ...draft, custom_vars: next });
                  }}
                  placeholder="Descripción o nota interna..."
                  className="flex-1 min-w-[200px] rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          ))}

          {(draft.custom_vars || []).length === 0 && (
            <p className="text-xs text-muted-foreground">No hay variables globales configuradas.</p>
          )}
        </div>

        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-accent text-primary-foreground font-bold rounded-full"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar variables globales
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TAB 3: TEXTOS Y PLANTILLAS DEL COTIZADOR
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
      const { data, error } = await supabase
        .from("site_content")
        .select("key, value")
        .in("key", keys);
      if (error) {
        toast.error(`Error al cargar textos: ${error.message}`);
      }
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
      toast.success("Textos del cotizador guardados correctamente");
    } catch (e) {
      toast.error("Error al guardar: " + (e as Error).message);
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
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-primary-foreground font-bold rounded-full"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Textos del Cotizador
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TARJETA DE SERVICIO COTIZABLE
// =============================================================================
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
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [draft, setDraft] = useState(service);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<QuoterValues>(() => defaultValuesFor(service));
  const [qty, setQty] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<QuoterField["input_type"]>("slider");
  const [addingFieldBusy, setAddingFieldBusy] = useState(false);

  useEffect(() => {
    setDraft(service);
    setTest(defaultValuesFor(service));
  }, [service]);

  const masterFormulaVars = useMemo<FormulaVarTag[]>(() => {
    const vars: FormulaVarTag[] = [
      { key: "quantity", label: "Cantidad" },
      { key: "base_price", label: "Precio base" },
    ];
    for (const f of draft.fields) {
      if (f.key) vars.push({ key: f.key, label: f.label || f.key });
    }
    if (quotingVars?.custom_vars) {
      for (const cv of quotingVars.custom_vars) {
        if (cv.key) vars.push({ key: cv.key, label: cv.label || cv.key });
      }
    }
    return vars;
  }, [draft.fields, quotingVars]);

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
    const results = await Promise.all(
      reordered.map((f, idx) =>
        supabase.from("quoter_fields").update({ sort_order: idx + 1 }).eq("id", f.id),
      ),
    );
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) {
      toast.error(`Error al reordenar preguntas: ${firstErr.message}`);
    } else {
      toast.success("Orden de preguntas actualizado");
    }
    onChanged();
  }

  async function save() {
    if (!draft.name.trim()) { toast.error("Escribe el nombre del servicio"); return; }
    const tiers = [...(draft.volume_tiers ?? [])].sort((a,b) => a.min_qty - b.min_qty);
    if (tiers.some((t,i) => t.min_qty < 1 || (t.max_qty !== null && t.max_qty < t.min_qty) || t.discount_percentage < 0 || t.discount_percentage > 100 || (i > 0 && (tiers[i-1]?.max_qty === null || t.min_qty <= (tiers[i-1]?.max_qty ?? 0))))) { toast.error("Revisa los rangos y descuentos: no pueden superponerse"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("quoter_services")
      .update({
        name: draft.name,
        tagline: draft.tagline,
        description: draft.description,
        icon: draft.icon,
        base_price_cop: Number(draft.base_price_cop) || 0,
        gastos_extra_cop: Number(draft.gastos_extra_cop) || 0,
        min_price_cop: Number(draft.min_price_cop) || 0,
        margin_percent: Number(draft.margin_percent) || 0,
        pricing_mode: draft.pricing_mode || "formula",
        uses_global_vars: draft.uses_global_vars ?? false,
        price_display: draft.price_display || "final",
        formula: draft.formula?.trim() || null,
        allow_quantity: draft.allow_quantity,
        allow_file: draft.allow_file,
        requires_approval: draft.requires_approval,
        approval_threshold_cop: draft.approval_threshold_cop,
        is_active: draft.is_active,
        sort_order: draft.sort_order,
        site_anchor: normalizeSiteAnchor(draft.site_anchor),
        has_calculator: draft.has_calculator !== false,
        whatsapp_custom_message: draft.whatsapp_custom_message?.trim() || null,
        volume_tiers: draft.volume_tiers || [],
      })
      .eq("id", draft.id);
    setSaving(false);

    if (error) {
      toast.error(`Error al guardar "${draft.name}": ${error.message}`);
      onMsg(`Error: ${error.message}`);
    } else {
      toast.success(`Servicio "${draft.name}" guardado`);
      onMsg(`“${draft.name}” guardado.`);
    }
    onChanged();
  }

  async function toggleActive() {
    const { error } = await supabase
      .from("quoter_services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);
    if (error) {
      toast.error(`Error al cambiar visibilidad: ${error.message}`);
      return;
    }
    toast.success(service.is_active ? "Servicio ocultado en la web" : "Servicio visible en la web");
    onChanged();
  }

  async function removeService() {
    const { error } = await supabase.from("quoter_services").delete().eq("id", service.id);
    if (error) {
      toast.error(`No se pudo eliminar: ${error.message}`);
      return;
    }
    toast.success(`Servicio "${service.name}" eliminado`);
    onMsg("Servicio eliminado.");
    onChanged();
  }

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!newFieldLabel.trim()) {
      toast.error("Escribe la etiqueta de la pregunta");
      return;
    }
    setAddingFieldBusy(true);
    const key = slugify(newFieldLabel).replace(/-/g, "_") || `campo_${Date.now()}`;
    const { error } = await supabase.from("quoter_fields").insert({
      service_id: service.id,
      key,
      label: newFieldLabel.trim(),
      input_type: newFieldType,
      min_value: 0,
      max_value: 100,
      step_value: 1,
      default_value: newFieldType === "toggle" ? "no" : "",
      options:
        newFieldType === "select"
          ? [{ label: "Opción 1", value: "opcion_1", add_cop: 0, multiplier: 1 }]
          : [],
      sort_order: service.fields.length + 1,
    });
    setAddingFieldBusy(false);

    if (error) {
      toast.error(`Error al agregar pregunta: ${error.message}`);
      onMsg(`Error: ${error.message}`);
      return;
    }
    toast.success(`Pregunta "${newFieldLabel.trim()}" agregada`);
    onMsg("Pregunta agregada.");
    setNewFieldLabel("");
    setAddingField(false);
    onChanged();
  }

  const calcEnabled = draft.has_calculator !== false;

  return (
    <section ref={setNodeRef} style={style} className="rounded-3xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <Button variant="ghost"
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
          title="Arrastrar para reordenar servicio"
          aria-label={`Reordenar ${service.name}`}
        >
          <GripVertical className="h-5 w-5" />
        </Button>

        <Button variant="ghost"
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2 text-left hover:bg-muted hover:text-foreground"
        >
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="text-lg font-black">{service.name}</span>
          <span className="text-xs text-muted-foreground">
            {service.fields.length} pregunta{service.fields.length === 1 ? "" : "s"}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
              service.has_calculator !== false
                ? "bg-teal-50 text-secondary border border-teal-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {service.has_calculator !== false ? "Calculadora activa" : "Solo WhatsApp"}
          </span>
          {!service.is_active && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              Oculto
            </span>
          )}
        </Button>

        <Button variant="ghost"
          type="button"
          onClick={toggleActive}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          title={service.is_active ? "Ocultar en la web" : "Mostrar en la web"}
          aria-label={service.is_active ? `Ocultar ${service.name}` : `Mostrar ${service.name}`}
        >
          {service.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost"
              type="button"
              onClick={removeService}
              className="rounded-lg bg-destructive px-2.5 py-1 text-xs font-bold text-primary-foreground hover:bg-destructive/90"
            >
              Confirmar
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="ghost"
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Eliminar servicio"
            aria-label={`Eliminar ${service.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="grid gap-6 border-t border-border p-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
          <div className="min-w-0 space-y-6">
            {/* Modo de operación: Calculadora interactiva vs WhatsApp Directo */}
            <div
              className={`rounded-2xl border p-4 space-y-3 transition ${
                !calcEnabled
                  ? "border-amber-300 bg-amber-50/60"
                  : "border-border bg-muted/20"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-bold text-foreground block">
                    Cotizador interactivo activo en la web
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {calcEnabled
                      ? "Los clientes ajustan las preguntas y calculan su precio en tiempo real."
                      : "Desactivado: en /servicios se mostrará el botón directo a WhatsApp con tu mensaje."}
                  </span>
                </div>
                <Switch
                  checked={calcEnabled}
                  onCheckedChange={(checked) => set("has_calculator", checked)}
                  aria-label="Activar o desactivar cotizador interactivo"
                />
              </div>

              <div>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
                    {!calcEnabled
                      ? "Mensaje de WhatsApp directo (Activo al estar sin calculadora)"
                      : "Mensaje personalizado de WhatsApp (opcional)"}
                  </span>
                  <Textarea
                    rows={2}
                    value={draft.whatsapp_custom_message ?? ""}
                    onChange={(e) => set("whatsapp_custom_message", e.target.value)}
                    placeholder={`Hola Will Design 3D! Me interesa solicitar información y cotización sobre el servicio: *${draft.name}*`}
                    className="mt-1.5 bg-background"
                  />
                </label>
              </div>
            </div>

            {/* Datos generales */}
            <div className="grid gap-4 sm:grid-cols-2">
              <L label="Nombre del servicio">
                <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </L>
              <L label="Frase corta (tagline)">
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
                  step={500}
                  value={draft.base_price_cop}
                  onChange={(e) => set("base_price_cop", Number(e.target.value) || 0)}
                  className={`tabular-nums ${inputCls}`}
                />
              </L>
              <L label="Precio mínimo (COP)">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={draft.min_price_cop}
                  onChange={(e) => set("min_price_cop", Number(e.target.value) || 0)}
                  className={`tabular-nums ${inputCls}`}
                />
              </L>

              <L label="Gastos extra fijos (COP)">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={draft.gastos_extra_cop}
                  onChange={(e) => set("gastos_extra_cop", Number(e.target.value) || 0)}
                  className={`tabular-nums ${inputCls}`}
                />
              </L>
              <L label="Margen de servicio (%)">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draft.margin_percent}
                  onChange={(e) => set("margin_percent", Number(e.target.value) || 0)}
                  className={`tabular-nums ${inputCls}`}
                />
              </L>

              <L label="Modo de cálculo">
                <select
                  value={draft.pricing_mode ?? "formula"}
                  onChange={(e) => set("pricing_mode", e.target.value as QuoterPricingMode)}
                  className={inputCls}
                >
                  {PRICING_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </L>

              <L label="Ícono y Ancla en /servicios">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={draft.icon}
                    onChange={(e) => set("icon", e.target.value)}
                    aria-label="Ícono del servicio"
                    className={inputCls}
                  >
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic.value} value={ic.value}>
                        {ic.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={draft.site_anchor ?? ""}
                    onChange={(e) => set("site_anchor", e.target.value)}
                    placeholder="slug-ancla"
                    aria-label="Ancla del sitio"
                    className={`font-mono text-xs ${inputCls}`}
                  />
                </div>
              </L>
            </div>

            {/* Opciones de flujo del cliente */}
            <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-muted/15 px-4 py-3">
              <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                <Switch
                  checked={draft.allow_quantity}
                  aria-label="Permitir selector de cantidad"
                  onCheckedChange={(checked) => set("allow_quantity", checked)}
                />
                <span>Permitir selector de cantidad</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                <Switch
                  checked={draft.allow_file}
                  aria-label="Permitir subir archivo"
                  onCheckedChange={(checked) => set("allow_file", checked)}
                />
                <span>Permitir subir archivo (.STL/.OBJ/imagen)</span>
              </label>

            </div>

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                <Switch checked={Boolean(draft.requires_approval)} aria-label="Revisión obligatoria" onCheckedChange={(checked) => set("requires_approval", checked)} /> Revisión obligatoria
              </label>
              <L label="Revisar desde este total (COP)"><Input type="number" min={0} value={draft.approval_threshold_cop ?? 0} onChange={(e) => set("approval_threshold_cop", Number(e.target.value))} /></L>
            </div>
            <details className="border-t border-border pt-4">
              <summary className="min-h-11 cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-ring">Descuentos por cantidad</summary>
              <div className="space-y-3">
                {(draft.volume_tiers ?? []).map((tier, index) => {
                  const update = (key: keyof VolumeDiscountTier, value: number | null) => set("volume_tiers", (draft.volume_tiers ?? []).map((t,i) => i === index ? { ...t, [key]: value } : t));
                  return <div key={index} className="grid gap-2 sm:grid-cols-2">
                    <L label="Desde cantidad"><Input type="number" min={1} value={tier.min_qty} onChange={(e) => update("min_qty", Number(e.target.value))} /></L>
                    <L label="Hasta cantidad (vacío: sin límite)"><Input type="number" min={tier.min_qty} value={tier.max_qty ?? ""} onChange={(e) => update("max_qty", e.target.value ? Number(e.target.value) : null)} /></L>
                    <L label="Descuento (%)"><Input type="number" min={0} max={100} value={tier.discount_percentage} onChange={(e) => update("discount_percentage", Number(e.target.value))} /></L>
                    <L label="Precio unitario fijo (opcional)"><Input type="number" min={0} value={tier.fixed_unit_price_cop ?? ""} onChange={(e) => update("fixed_unit_price_cop", e.target.value ? Number(e.target.value) : null)} /></L>
                    <Button variant="outline" onClick={() => set("volume_tiers", draft.volume_tiers?.filter((_,i) => i !== index))}><Trash2 /> Eliminar rango</Button>
                  </div>;
                })}
                <Button variant="outline" onClick={() => set("volume_tiers", [...(draft.volume_tiers ?? []), { min_qty: 1, max_qty: null, discount_percentage: 0 }])}><Plus /> Agregar rango</Button>
              </div>
            </details>
            <details className="border-t border-border pt-4">
              <summary className="min-h-11 cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-ring">Fórmula avanzada</summary>
            <FormulaEditor
              value={draft.formula ?? ""}
              onChange={(val) => set("formula", val)}
              availableVars={masterFormulaVars}
              label="Fórmula maestra del servicio (Opcional — reemplaza la suma de campos si devuelve > 0)"
              placeholder="Ej: (peso_gramos * fdm_gram_cost) + base_price"
            />

            </details>
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border bg-background py-3">
              <Button variant="ghost"
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60 shadow-sm hover:opacity-90"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar configuración del servicio
              </Button>
            </div>

            {/* Preguntas del servicio */}
            <div className="border-t border-border pt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">Preguntas y parámetros del cliente</h3>
                  <p className="text-xs text-muted-foreground">
                    Arrastra las tarjetas para definir el orden en el cotizador público.
                  </p>
                </div>
                {!addingField && (
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setAddingField(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar pregunta
                  </Button>
                )}
              </div>

              {addingField && (
                <form
                  onSubmit={handleAddField}
                  className="grid gap-3 sm:grid-cols-12 items-end rounded-2xl border border-border bg-muted/20 p-3"
                >
                  <label className="sm:col-span-5 block">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Etiqueta de la pregunta
                    </span>
                    <input
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      placeholder="Ej: Peso estimado, Material, Acabado"
                      className={`mt-1 ${inputCls}`}
                    />
                  </label>
                  <label className="sm:col-span-4 block">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Tipo de control
                    </span>
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as QuoterField["input_type"])}
                      className={`mt-1 ${inputCls}`}
                    >
                      <option value="slider">Deslizador (rango)</option>
                      <option value="select">Opciones (tarjetas)</option>
                      <option value="toggle">Sí / No</option>
                      <option value="number">Número</option>
                      <option value="text">Texto libre</option>
                    </select>
                  </label>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addingFieldBusy}
                      className="rounded-full bg-secondary text-primary-foreground font-bold"
                    >
                      {addingFieldBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddingField(false);
                        setNewFieldLabel("");
                      }}
                      className="rounded-full"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              <DndContext
                sensors={fieldSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFieldDragEnd}
              >
                <SortableContext items={service.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {service.fields.map((f, i) => (
                      <QuoterFieldEditor
                        key={f.id}
                        field={f}
                        index={i}
                        total={service.fields.length}
                        siblings={service.fields}
                        quotingVars={quotingVars}
                        onDraftChange={(next) => setDraft((prev) => ({ ...prev, fields: prev.fields.map((item) => item.id === next.id ? next : item) }))}
                        onChanged={onChanged}
                        onMsg={onMsg}
                      />
                    ))}
                    {service.fields.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                        Este servicio no tiene preguntas aún. Agrega una para configurar sliders, opciones o interruptores.
                      </p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <QuoterSimulatorAside
            service={draft}
            quotingVars={quotingVars}
            values={test}
            onValueChange={(key, val) => setTest((prev) => ({ ...prev, [key]: val }))}
            quantity={qty}
            onQuantityChange={setQty}
          />
        </div>
      )}
    </section>
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
