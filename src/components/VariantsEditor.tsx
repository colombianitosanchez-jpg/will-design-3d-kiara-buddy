import { ProductMedia } from "@/components/ProductMedia";
import { memo, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Sparkles } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
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
import { PaymentMethodsPicker } from "@/components/PaymentMethodsPicker";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProductButtonsEditor } from "@/components/ProductButtonsEditor";
import { UnifiedButton } from "@/components/UnifiedButton";
import type { ProductButton } from "@/lib/product-buttons";
import { newVariant, type ProductVariant } from "@/lib/product-variants";
import { VariantContentFields } from "@/components/VariantContentFields";

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function detectAnimType(url?: string | null): "video" | "gif" | "lottie" | "image" | "none" {
  if (!url) return "none";
  if (/\.(mp4|webm|mov|quicktime)($|\?)/i.test(url)) return "video";
  if (/\.gif($|\?)/i.test(url)) return "gif";
  if (/\.json($|\?)/i.test(url)) return "lottie";
  return "image";
}

/** Tarjeta individual colapsable de variante con barra de herramientas. */
const SortableVariantCard = memo(function SortableVariantCard({
  variant: v,
  index,
  isOpen,
  onToggle,
  onRemove,
  onUpdate,
  gallery,
  parentButtons,
  isGlowing,
}: {
  variant: ProductVariant;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<ProductVariant>) => void;
  gallery: string[];
  parentButtons: ProductButton[];
  isGlowing: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: v.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  // El botón efectivo a mostrar en la vista previa
  const primaryButton: ProductButton = v.custom_buttons?.[0] ?? parentButtons[0] ?? {
    id: `preview-${v.id}`,
    text: v.name || "Comprar",
    action_type: "whatsapp",
    action_value: "",
    media_mode: "none",
  };

  const previewButtonModel: ProductButton = {
    ...primaryButton,
    text: primaryButton.text || v.name || "Ver producto",
    animation_type: detectAnimType(primaryButton.media_url),
  };

  const setImages = (images: string[]) => {
    const uniq = Array.from(new Set(images.filter(Boolean)));
    onUpdate({ images: uniq, image_url: uniq[0] ?? null });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`variant-editor-${v.id}`}
      className={`rounded-2xl border transition-all duration-300 ${
        isGlowing ? "ring-2 ring-[var(--brand-orange)] shadow-lg" : "border-border/80"
      } ${!v.is_active ? "opacity-75 bg-muted/20" : "bg-card"}`}
    >
      {/* Barra de herramientas compacta de la tarjeta (Idéntica a captura y botones de Hero) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-4 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Arrastrar variante #${index + 1}`}
            className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition"
            title="Arrastrar para reordenar variante"
          >
            <GripVertical className="h-5 w-5 text-primary" />
          </button>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
            #{index + 1}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="text-sm font-bold text-foreground truncate hover:underline flex items-center gap-2"
          >
            {v.image_url ? (
              <ProductMedia thumb src={v.image_url} className="h-7 w-7 rounded-lg object-cover shrink-0" />
            ) : null}
            <span className="truncate">{v.name || "Sin nombre"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Vista previa funcional del botón SIN la etiqueta de texto "Vista previa:" */}
          <div className="shrink-0 max-w-[200px]">
            <UnifiedButton
              button={previewButtonModel}
              onClick={() => {}}
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1.5"
            title="Eliminar variante"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title={isOpen ? "Plegar detalles" : "Desplegar todos los controles"}
            aria-label={isOpen ? "Plegar detalles" : "Desplegar todos los controles"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Controles desplegables de la variante */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4 bg-muted/[0.04] rounded-b-2xl">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre de la variante *
              </label>
              <input
                className={inputCls}
                value={v.name}
                placeholder="Ej: Rojo, 500g, Mediano..."
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Precio (vacío = hereda)
              </label>
              <input
                type="number"
                min={0}
                className={inputCls}
                placeholder="Hereda del producto"
                value={v.price_cop ?? ""}
                onChange={(e) =>
                  onUpdate({ price_cop: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Stock (vacío = hereda)
              </label>
              <input
                type="number"
                min={0}
                className={inputCls}
                placeholder="Hereda del producto"
                value={v.stock ?? ""}
                onChange={(e) =>
                  onUpdate({ stock: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1 min-w-[200px]">
              SKU / Referencia propia
              <input
                className={inputCls}
                placeholder="Opcional"
                value={v.sku ?? ""}
                onChange={(e) => onUpdate({ sku: e.target.value || null })}
              />
            </label>
            <label className="inline-flex items-center gap-2 pt-4 text-sm font-semibold">
              <Switch
                checked={v.is_active}
                onCheckedChange={(c) => onUpdate({ is_active: c })}
                aria-label="Variante visible"
              />
              Visible en tienda
            </label>
          </div>

          <VariantContentFields variant={v} onUpdate={onUpdate} />

          {/* Fotos de la variante */}
          <div className="mt-3 rounded-xl border border-border/70 bg-card p-3.5 space-y-2">
            <p className="text-xs font-bold text-foreground">Fotos de esta variante</p>
            <p className="text-[11px] text-muted-foreground">
              Sube fotos propias o selecciónalas de la galería del producto. La primera es la principal y la que se
              comparte en WhatsApp. Si no añades fotos, usa las del producto.
            </p>
            {gallery.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {gallery.map((url) => {
                  const on = v.images.includes(url);
                  return (
                    <button
                      type="button"
                      key={url}
                      onClick={() =>
                        setImages(on ? v.images.filter((u) => u !== url) : [...v.images, url])
                      }
                      className={`h-12 w-12 overflow-hidden rounded-lg border-2 transition ${
                        on ? "border-primary shadow-sm" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      aria-label={on ? "Quitar foto de la variante" : "Usar foto en la variante"}
                      aria-pressed={on}
                    >
                      <ProductMedia thumb src={url} className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
            <div className="pt-2">
              <ImageDropzone
                images={v.images}
                coverIndex={0}
                onSetCover={(url) => setImages([url, ...v.images.filter((u) => u !== url)])}
                onChange={(urls) => setImages(urls)}
                label="Arrastra aquí fotos específicas para esta variante"
              />
            </div>
          </div>

          {/* Métodos de pago y botones */}
          <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <Switch
                checked={v.custom_buttons !== null}
                onCheckedChange={(c) =>
                  onUpdate({
                    custom_buttons: c
                      ? parentButtons.map((b) => ({ ...b, id: `${b.id}-${v.id.slice(0, 6)}` }))
                      : null,
                  })
                }
                aria-label="Botones propios para esta variante"
              />
              Botones y WhatsApp propios (apagado = hereda del producto)
            </label>

            <div>
              <p className="text-xs font-bold text-foreground">Métodos de pago de esta variante</p>
              <div className="mt-2">
                <PaymentMethodsPicker
                  value={v.allowed_payment_method_ids}
                  onChange={(ids) => onUpdate({ allowed_payment_method_ids: ids })}
                  inheritLabel="Usar los mismos del producto"
                />
              </div>
            </div>

            {v.custom_buttons && (
              <div className="mt-3 rounded-xl bg-muted/30 p-2">
                <ProductButtonsEditor
                  buttons={v.custom_buttons}
                  onChange={(b) => onUpdate({ custom_buttons: b })}
                  showVariantToken
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export function VariantsEditor({
  label,
  onLabelChange,
  variants,
  onChange,
  gallery,
  parentButtons,
  targetVariantId,
}: {
  label: string;
  onLabelChange: (v: string) => void;
  variants: ProductVariant[];
  onChange: (v: ProductVariant[]) => void;
  gallery: string[];
  parentButtons: ProductButton[];
  targetVariantId?: string | null;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [glowingId, setGlowingId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!targetVariantId) return;

    setIsCollapsed(false);
    setOpenIds((prev) => new Set([...prev, targetVariantId]));

    let activeGlowTimer: ReturnType<typeof setTimeout> | null = null;

    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`variant-editor-${targetVariantId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setGlowingId(targetVariantId);
        activeGlowTimer = setTimeout(() => {
          setGlowingId(null);
        }, 2000);
      }
    }, 150);

    return () => {
      clearTimeout(scrollTimer);
      if (activeGlowTimer) clearTimeout(activeGlowTimer);
    };
  }, [targetVariantId]);

  const update = useCallback(
    (i: number, patch: Partial<ProductVariant>) =>
      onChange(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v))),
    [onChange, variants],
  );

  const removeVariant = useCallback(
    (index: number) => {
      onChange(variants.filter((_, idx) => idx !== index));
    },
    [onChange, variants],
  );

  const toggleOpen = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const cleanActiveId = String(active.id);
    const cleanOverId = String(over.id);

    const from = variants.findIndex((v) => v.id === cleanActiveId);
    const to = variants.findIndex((v) => v.id === cleanOverId);
    if (from >= 0 && to >= 0) {
      onChange(arrayMove(variants, from, to));
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm min-w-40 flex-1">
          Nombre del selector (ej. Color, Tamaño, Capacidad)
          <input className={inputCls} value={label} onChange={(e) => onLabelChange(e.target.value)} />
        </label>
        {variants.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {isCollapsed ? `Mostrar variantes (${variants.length})` : "Plegar variantes"}
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.02] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <label className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Variantes del Producto
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Haz clic en cualquier variante para desplegar sus detalles, fotos y botones propios.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                const nv = newVariant();
                onChange([...variants, nv]);
                setOpenIds((prev) => new Set([...prev, nv.id]));
              }}
              className="text-xs font-bold gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              + Añadir variante
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={variants.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {variants.map((v, i) => (
                  <SortableVariantCard
                    key={v.id}
                    variant={v}
                    index={i}
                    isOpen={openIds.has(v.id)}
                    onToggle={() => toggleOpen(v.id)}
                    onRemove={() => removeVariant(i)}
                    onUpdate={(patch) => update(i, patch)}
                    gallery={gallery}
                    parentButtons={parentButtons}
                    isGlowing={glowingId === v.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
