import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fieldConfigurationError,
  type QuoterField,
  type QuoterOption,
} from "@/lib/quoter";
import {
  getDynamicPriceSourceOptions,
  type QuotingVars,
} from "@/lib/quoting-vars";
import { FormulaEditor, type FormulaVarTag } from "@/components/FormulaEditor";
import { MediaDropZone } from "@/components/MediaDropZone";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
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

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

const INPUT_TYPES: { value: QuoterField["input_type"]; label: string }[] = [
  { value: "slider", label: "Deslizador (rango)" },
  { value: "select", label: "Opciones (tarjetas)" },
  { value: "toggle", label: "Sí / No (interruptor)" },
  { value: "number", label: "Número" },
  { value: "text", label: "Texto libre" },
];

function slugifyKey(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function SortableOptionRow({
  id,
  option,
  onChange,
  onRemove,
}: {
  id: string;
  option: QuoterOption;
  onChange: (next: QuoterOption) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [mediaOpen, setMediaOpen] = useState(Boolean(option.media?.url));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-background p-3 space-y-3"
    >
      <div className="flex items-start gap-2">
        <Button variant="ghost"
          type="button"
          {...attributes}
          {...listeners}
          className="mt-2 cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground"
          title="Arrastrar para reordenar opción"
          aria-label={`Reordenar opción ${option.label || "sin nombre"}`}
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        <div className="grid flex-1 gap-2.5 sm:grid-cols-12">
          <label className="sm:col-span-4 block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Título visible
            </span>
            <input
              value={option.label}
              onChange={(e) => onChange({ ...option, label: e.target.value })}
              placeholder="Ej: PLA+ Estándar"
              className={`mt-1 ${inputCls}`}
            />
          </label>

          <label className="sm:col-span-3 block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Valor interno
            </span>
            <input
              value={option.value}
              onChange={(e) => onChange({ ...option, value: e.target.value })}
              placeholder="pla_plus"
              className={`mt-1 font-mono text-xs ${inputCls}`}
            />
          </label>

          <label className="sm:col-span-3 block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Recargo (COP)
            </span>
            <input
              type="number"
              step={100}
              value={option.add_cop ?? 0}
              onChange={(e) => onChange({ ...option, add_cop: Number(e.target.value) || 0 })}
              className={`mt-1 tabular-nums ${inputCls}`}
            />
          </label>

          <label className="sm:col-span-2 block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Multip.
            </span>
            <input
              type="number"
              step="0.05"
              min={0}
              value={option.multiplier ?? 1}
              onChange={(e) => onChange({ ...option, multiplier: Number(e.target.value) || 1 })}
              className={`mt-1 tabular-nums ${inputCls}`}
            />
          </label>

          <label className="sm:col-span-12 block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Descripción corta (opcional)
            </span>
            <input
              value={option.description ?? ""}
              onChange={(e) => onChange({ ...option, description: e.target.value || undefined })}
              placeholder="Ej: Ideal para prototipos, decoración y acabado limpio"
              className={`mt-1 ${inputCls}`}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1 pt-5">
          <Button variant="ghost"
            type="button"
            onClick={() => setMediaOpen((v) => !v)}
            className={`rounded-lg p-1.5 transition ${
              option.media?.url || mediaOpen
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="Imagen o video de muestra"
            aria-label={`Imagen de muestra para ${option.label || "opción"}`}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Eliminar opción"
            aria-label={`Eliminar opción ${option.label || "sin nombre"}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {mediaOpen && (
        <div className="ml-7 rounded-xl border border-dashed border-border bg-muted/20 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground">
              Imagen / Video de muestra en tarjeta
            </span>
            <select
              value={option.media?.type ?? "image"}
              onChange={(e) =>
                onChange({
                  ...option,
                  media: {
                    url: option.media?.url ?? "",
                    type: e.target.value as "image" | "video" | "gif",
                  },
                })
              }
              aria-label="Tipo de multimedia de opción"
              className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium"
            >
              <option value="image">Imagen</option>
              <option value="gif">GIF animado</option>
              <option value="video">Video MP4 / WebM</option>
            </select>
          </div>

          <MediaDropZone
            value={option.media?.url ?? ""}
            onChange={(url, detected) =>
              onChange({
                ...option,
                media: url
                  ? {
                      url,
                      type:
                        detected === "videoFill"
                          ? "video"
                          : option.media?.type === "gif"
                            ? "gif"
                            : "image",
                    }
                  : undefined,
              })
            }
          />

          <input
            aria-label="Dirección de la imagen o video de muestra"
            value={option.media?.url ?? ""}
            onChange={(e) => {
              const url = e.target.value.trim();
              onChange({
                ...option,
                media: url
                  ? {
                      url,
                      type: option.media?.type ?? (/\.(mp4|webm)/i.test(url) ? "video" : "image"),
                    }
                  : undefined,
              });
            }}
            placeholder="O pega la URL directa de la imagen/video (https://...)"
            className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
    </div>
  );
}

export function QuoterFieldEditor({
  field,
  siblings,
  quotingVars,
  onChanged,
  onDraftChange,
  onMsg,
}: {
  field: QuoterField;
  index: number;
  total: number;
  siblings: QuoterField[];
  quotingVars?: QuotingVars;
  onChanged: () => void;
  onDraftChange?: (field: QuoterField) => void;
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

  const [d, setD] = useState<QuoterField>(field);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const optionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setD(field);
  }, [field]);

  useEffect(() => { onDraftChange?.(d); }, [d]);

  function set<K extends keyof QuoterField>(k: K, v: QuoterField[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
  }

  const priceSourceOptions = useMemo(
    () => getDynamicPriceSourceOptions(quotingVars),
    [quotingVars],
  );

  const formulaVars = useMemo<FormulaVarTag[]>(() => {
    const varsList: FormulaVarTag[] = [
      { key: "quantity", label: "Cantidad" },
      { key: "base_price", label: "Precio base servicio" },
    ];
    for (const s of siblings) {
      if (s.key && s.key !== d.key) {
        varsList.push({ key: s.key, label: s.label || s.key });
      }
    }
    if (quotingVars?.custom_vars) {
      for (const cv of quotingVars.custom_vars) {
        if (cv.key) varsList.push({ key: cv.key, label: cv.label || cv.key });
      }
    }
    return varsList;
  }, [siblings, d.key, quotingVars]);

  function addOption() {
    const numIdx = d.options.length + 1;
    const newOpt: QuoterOption = {
      label: `Opción ${numIdx}`,
      value: `opcion_${numIdx}`,
      add_cop: 0,
      multiplier: 1,
    };
    set("options", [...d.options, newOpt]);
  }

  function handleOptionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = Number(String(active.id).replace("opt-", ""));
    const newIdx = Number(String(over.id).replace("opt-", ""));
    if (Number.isNaN(oldIdx) || Number.isNaN(newIdx)) return;
    set("options", arrayMove(d.options, oldIdx, newIdx));
  }

  async function save() {
    if (!d.label.trim()) {
      toast.error("La pregunta debe tener una etiqueta visible");
      return;
    }
    const invalid = fieldConfigurationError(d, siblings);
    if (invalid) { toast.error(invalid); return; }
    setSaving(true);
    const cleanKey = slugifyKey(d.key || d.label) || d.key;
    const { error } = await supabase
      .from("quoter_fields")
      .update({
        key: cleanKey,
        label: d.label.trim(),
        help: d.help ?? "",
        input_type: d.input_type,
        min_value: Number(d.min_value) || 0,
        max_value: Number(d.max_value) || 0,
        step_value: Number(d.step_value) || 1,
        default_value: d.default_value ?? "",
        unit: d.unit ?? "",
        price_per_unit_cop: Number(d.price_per_unit_cop) || 0,
        price_source: d.price_source ?? "fixed",
        multiplier: Number(d.multiplier) || 1,
        formula: d.formula?.trim() || null,
        media_url: d.media_url || null,
        media_type: d.media_type || "image",
        options: d.options as any,
        is_required: Boolean(d.is_required),
        is_active: d.is_active !== false,
        sort_order: d.sort_order,
      })
      .eq("id", d.id);
    setSaving(false);

    if (error) {
      toast.error(`Error al guardar pregunta: ${error.message}`);
      onMsg(`Error: ${error.message}`);
    } else {
      toast.success(`Pregunta "${d.label}" guardada`);
      onMsg(`“${d.label}” guardada.`);
      onChanged();
    }
  }

  async function remove() {
    const { error } = await supabase.from("quoter_fields").delete().eq("id", field.id);
    if (error) {
      toast.error(`No se pudo eliminar: ${error.message}`);
      return;
    }
    toast.success(`Pregunta "${field.label}" eliminada`);
    onChanged();
  }

  const inputTypeLabel =
    INPUT_TYPES.find((t) => t.value === d.input_type)?.label ?? d.input_type;
  const priceSourceLabel =
    priceSourceOptions.find((p) => p.value === d.price_source)?.label ?? d.price_source;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border p-4 shadow-xs transition ${
        d.is_active ? "border-border bg-card" : "border-dashed border-muted bg-muted/20 opacity-80"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost"
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground"
          title="Arrastrar para reordenar pregunta"
          aria-label={`Reordenar ${field.label}`}
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        <Button variant="ghost"
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex flex-1 flex-wrap items-center gap-2 text-left"
        >
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="font-bold text-foreground">{d.label || field.label}</span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {inputTypeLabel}
          </span>
          {(d.input_type === "slider" || d.input_type === "number") && (
            <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
              {d.price_source === "fixed"
                ? `$${d.price_per_unit_cop}${d.unit ? `/${d.unit}` : ""}`
                : priceSourceLabel}
            </span>
          )}
          {!d.is_active && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              Inactiva
            </span>
          )}
        </Button>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost"
              type="button"
              onClick={remove}
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
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Eliminar pregunta"
            aria-label={`Eliminar ${field.label}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-5 border-t border-border pt-4">
          {/* Bloque 1: Identidad y tipo de control */}
          <div className="grid gap-3 sm:grid-cols-12">
            <label className="sm:col-span-5 block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Etiqueta de la pregunta
              </span>
              <input
                value={d.label}
                onChange={(e) => set("label", e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </label>

            <label className="sm:col-span-4 block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Tipo de control
              </span>
              <select
                value={d.input_type}
                onChange={(e) => set("input_type", e.target.value as QuoterField["input_type"])}
                className={`mt-1 ${inputCls}`}
              >
                {INPUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="sm:col-span-3 block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Clave en fórmula
              </span>
              <input
                value={d.key}
                onChange={(e) => set("key", slugifyKey(e.target.value))}
                className={`mt-1 font-mono text-xs ${inputCls}`}
              />
            </label>
          </div>

          {/* Bloque 2: Visibilidad y obligatoriedad */}
          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
              <Switch
                checked={d.is_active}
                aria-label="Pregunta activa en la web"
                onCheckedChange={(checked) => set("is_active", checked)}
              />
              <span>Pregunta activa en la web</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
              <Switch
                checked={d.is_required}
                aria-label="Campo obligatorio"
                onCheckedChange={(checked) => set("is_required", checked)}
              />
              <span>Campo obligatorio</span>
            </label>
          </div>

          {/* Bloque 3: Rango numérico (slider / number) */}
          {(d.input_type === "slider" || d.input_type === "number") && (
            <div className="rounded-2xl border border-border bg-muted/15 p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Mínimo
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={d.min_value}
                    onChange={(e) => set("min_value", Number(e.target.value) || 0)}
                    className={`mt-1 tabular-nums ${inputCls}`}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Máximo
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={d.max_value}
                    onChange={(e) => set("max_value", Number(e.target.value) || 0)}
                    className={`mt-1 tabular-nums ${inputCls}`}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Paso (Step)
                  </span>
                  <input
                    type="number"
                    step="any"
                    min={0.01}
                    value={d.step_value}
                    onChange={(e) => set("step_value", Number(e.target.value) || 1)}
                    className={`mt-1 tabular-nums ${inputCls}`}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Unidad (g, cm, h, ml)
                  </span>
                  <input
                    value={d.unit}
                    onChange={(e) => set("unit", e.target.value)}
                    placeholder="g, cm, h, ml..."
                    className={`mt-1 ${inputCls}`}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-12">
                <label className="sm:col-span-6 block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Origen del costo (Variable global o fijo)
                  </span>
                  <select
                    value={d.price_source}
                    onChange={(e) => set("price_source", e.target.value)}
                    className={`mt-1 ${inputCls}`}
                  >
                    {priceSourceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sm:col-span-3 block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {d.price_source === "fixed" ? "Precio / unidad (COP)" : "Respaldo (COP)"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={d.price_per_unit_cop}
                    onChange={(e) => set("price_per_unit_cop", Number(e.target.value) || 0)}
                    className={`mt-1 tabular-nums ${inputCls}`}
                  />
                </label>

                <label className="sm:col-span-3 block">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Multiplicador
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.05"
                    value={d.multiplier}
                    onChange={(e) => set("multiplier", Number(e.target.value) || 1)}
                    className={`mt-1 tabular-nums ${inputCls}`}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Bloque 4: Opciones para SELECT */}
          {d.input_type === "select" && (
            <div className="rounded-2xl border border-border bg-muted/15 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Opciones de selección ({d.options.length})
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Arrastra las tarjetas para reordenarlas. Puedes agregar recargo, multiplicador e imagen de muestra.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addOption}
                  className="rounded-full font-bold"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar opción
                </Button>
              </div>

              <DndContext
                sensors={optionSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleOptionDragEnd}
              >
                <SortableContext
                  items={d.options.map((_, i) => `opt-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2.5">
                    {d.options.map((opt, idx) => (
                      <SortableOptionRow
                        key={`opt-${idx}`}
                        id={`opt-${idx}`}
                        option={opt}
                        onChange={(nextOpt) => {
                          const next = [...d.options];
                          next[idx] = nextOpt;
                          set("options", next);
                        }}
                        onRemove={() =>
                          set(
                            "options",
                            d.options.filter((_, oIdx) => oIdx !== idx),
                          )
                        }
                      />
                    ))}
                    {d.options.length === 0 && (
                      <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Sin opciones todavía. Pulsa “Agregar opción” para crear materiales, acabados o presets.
                      </p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Bloque 5: Recargo para TOGGLE */}
          {d.input_type === "toggle" && (
            <div className="rounded-2xl border border-border bg-muted/15 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Efecto al activar (Sí)
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Texto en resumen
                  </span>
                  <input
                    value={d.options[0]?.label ?? "Sí"}
                    onChange={(e) => {
                      const base = d.options[0] ?? { label: "Sí", value: "si", add_cop: 0, multiplier: 1 };
                      set("options", [{ ...base, label: e.target.value }]);
                    }}
                    placeholder="Sí, incluir soporte"
                    className={`mt-1 ${inputCls}`}
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Recargo al activar (COP)
                  </span>
                  <input
                    type="number"
                    step={100}
                    value={d.options[0]?.add_cop ?? 0}
                    onChange={(e) => {
                      const base = d.options[0] ?? { label: "Sí", value: "si", add_cop: 0, multiplier: 1 };
                      set("options", [{ ...base, add_cop: Number(e.target.value) || 0 }]);
                    }}
                    className={`mt-1 tabular-nums ${inputCls}`}
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Multiplicador al activar
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min={0}
                    value={d.options[0]?.multiplier ?? 1}
                    onChange={(e) => {
                      const base = d.options[0] ?? { label: "Sí", value: "si", add_cop: 0, multiplier: 1 };
                      set("options", [{ ...base, multiplier: Number(e.target.value) || 1 }]);
                    }}
                    className={`mt-1 tabular-nums ${inputCls}`}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Bloque 6: Valor por defecto y texto de ayuda */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Valor por defecto
              </span>
              {d.input_type === "select" ? (
                <select
                  value={d.default_value}
                  onChange={(e) => set("default_value", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="">Primera opción automática</option>
                  {d.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              ) : d.input_type === "toggle" ? (
                <select
                  value={d.default_value || "no"}
                  onChange={(e) => set("default_value", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="no">Desactivado (No)</option>
                  <option value="si">Activado (Sí)</option>
                </select>
              ) : (
                <input
                  value={d.default_value}
                  onChange={(e) => set("default_value", e.target.value)}
                  placeholder={d.input_type === "slider" || d.input_type === "number" ? String(d.min_value) : "Texto inicial..."}
                  className={`mt-1 ${inputCls}`}
                />
              )}
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Texto de ayuda descriptivo (visible al cliente)
              </span>
              <input
                value={d.help}
                onChange={(e) => set("help", e.target.value)}
                placeholder="Ej: Un mayor peso o densidad incrementa la resistencia mecánica."
                className={`mt-1 ${inputCls}`}
              />
            </label>
          </div>

          {/* Bloque 7: Fórmula personalizada del campo (opcional) */}
          {(d.input_type === "slider" || d.input_type === "number") && (
            <FormulaEditor
              value={d.formula ?? ""}
              onChange={(val) => set("formula", val)}
              availableVars={formulaVars}
              label={`Fórmula personalizada para "${d.label}" (Opcional — anula precio/unidad si se define)`}
              placeholder={`Ej: ({{${d.key}}} * {{fdm_gram_cost}}) * 1.1`}
            />
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-secondary text-primary-foreground hover:opacity-90 font-bold"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar pregunta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
