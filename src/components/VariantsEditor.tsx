import { ProductMedia } from "@/components/ProductMedia";
import { useState, type ReactNode } from "react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProductButtonsEditor } from "@/components/ProductButtonsEditor";
import type { ProductButton } from "@/lib/product-buttons";
import { newVariant, type ProductVariant } from "@/lib/product-variants";

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

/** Tarjeta de variante arrastrable desde su tirador. */
function SortableVariant({
  id,
  dimmed,
  isHighlighted,
  children,
}: {
  id: string;
  dimmed: boolean;
  isHighlighted?: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      id={`variant-editor-${id}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-xl border border-border bg-background p-3 pl-10 transition-all duration-500 ${
        dimmed ? "opacity-60" : ""
      } ${isDragging ? "z-10 shadow-lg ring-2 ring-ring" : ""} ${
        isHighlighted ? "ring-2 ring-primary bg-primary/5 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para cambiar el orden"
        className="absolute left-2 top-3 cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      {children}
    </div>
  );
}

export function VariantsEditor({
  label,
  onLabelChange,
  variants,
  onChange,
  gallery,
  parentButtons,
}: {
  label: string;
  onLabelChange: (v: string) => void;
  variants: ProductVariant[];
  onChange: (v: ProductVariant[]) => void;
  gallery: string[];
  parentButtons: ProductButton[];
}) {
  const [highlightedVariantId, setHighlightedVariantId] = useState<string | null>(null);

  const update = (i: number, patch: Partial<ProductVariant>) =>
    onChange(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const setImages = (i: number, images: string[]) => {
    const uniq = Array.from(new Set(images.filter(Boolean)));
    update(i, { images: uniq, image_url: uniq[0] ?? null });
  };

  function handleEditVariant(variant: ProductVariant) {
    const el = document.getElementById(`variant-editor-${variant.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      setHighlightedVariantId(variant.id);
      setTimeout(() => setHighlightedVariantId(null), 1800);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = variants.findIndex((v) => v.id === active.id);
    const to = variants.findIndex((v) => v.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(variants, from, to));
  };

  return (
    <div className="grid gap-3">
      <label className="text-sm">
        Nombre del selector (ej. Color, Tamaño)
        <input className={inputCls} value={label} onChange={(e) => onLabelChange(e.target.value)} />
      </label>

      {variants.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Arrastra cada variante desde el tirador para elegir el orden en que aparece en la tienda.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={variants.map((v) => v.id)} strategy={verticalListSortingStrategy}>
          {variants.map((v, i) => (
            <SortableVariant
              key={v.id}
              id={v.id}
              dimmed={!v.is_active}
              isHighlighted={highlightedVariantId === v.id}
            >
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-40 flex-1 text-sm">
                  Nombre
                  <input
                    className={inputCls}
                    value={v.name}
                    placeholder="Rojo"
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </label>
                <label className="w-32 text-sm">
                  Precio (vacío = hereda)
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={v.price_cop ?? ""}
                    onChange={(e) => update(i, { price_cop: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </label>
                <label className="w-28 text-sm">
                  Stock (vacío = hereda)
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={v.stock ?? ""}
                    onChange={(e) => update(i, { stock: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </label>
                <label className="inline-flex items-center gap-2 pb-2 text-sm">
                  <Switch checked={v.is_active} onCheckedChange={(c) => update(i, { is_active: c })} aria-label="Variante visible" />
                  Visible
                </label>
                <button
                  type="button"
                  onClick={() => handleEditVariant(v)}
                  className="mb-1 rounded-full p-2 text-muted-foreground hover:bg-muted"
                  aria-label="Enfocar variante"
                  title="Enfocar variante"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(variants.filter((_, idx) => idx !== i))}
                  className="mb-1 rounded-full p-2 text-red-600 hover:bg-red-50"
                  aria-label="Eliminar variante"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 text-sm">
                <p className="font-semibold">Fotos de esta variante</p>
                <p className="text-xs text-muted-foreground">
                  Sube fotos propias o tócalas desde las del producto. La marcada con ★ es la principal y la que se
                  comparte por WhatsApp. Sin fotos, usa las del producto.
                </p>
                {gallery.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {gallery.map((url) => {
                      const on = v.images.includes(url);
                      return (
                        <button
                          type="button"
                          key={url}
                          onClick={() => setImages(i, on ? v.images.filter((u) => u !== url) : [...v.images, url])}
                          className={`h-12 w-12 overflow-hidden rounded-lg border-2 ${
                            on ? "border-primary" : "border-transparent opacity-70"
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
                <div className="mt-2">
                  <ImageDropzone
                    images={v.images}
                    coverIndex={0}
                    onSetCover={(url) => setImages(i, [url, ...v.images.filter((u) => u !== url)])}
                    onChange={(urls) => setImages(i, urls)}
                    label="Arrastra aquí fotos de esta variante"
                  />
                </div>
              </div>

              <label className="mt-3 inline-flex items-center gap-2 text-sm">
                <Switch
                  checked={v.custom_buttons !== null}
                  onCheckedChange={(c) =>
                    update(i, {
                      custom_buttons: c
                        ? parentButtons.map((b) => ({ ...b, id: `${b.id}-${v.id.slice(0, 6)}` }))
                        : null,
                    })
                  }
                  aria-label="Botones propios para esta variante"
                />
                Botones, WhatsApp y pagos propios (apagado = usa los del producto)
              </label>

              <div className="mt-3 text-sm">
                <p className="font-semibold">Métodos de pago de esta variante</p>
                <div className="mt-2">
                  <PaymentMethodsPicker
                    value={v.allowed_payment_method_ids}
                    onChange={(ids) => update(i, { allowed_payment_method_ids: ids })}
                    inheritLabel="Usar los mismos del producto"
                  />
                </div>
              </div>

              {v.custom_buttons && (
                <div className="mt-2 rounded-xl bg-muted/30 p-2">
                  <ProductButtonsEditor
                    buttons={v.custom_buttons}
                    onChange={(b) => update(i, { custom_buttons: b })}
                    showVariantToken
                  />
                </div>
              )}
            </SortableVariant>
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() => {
          const nv = newVariant();
          onChange([...variants, nv]);
          setTimeout(() => handleEditVariant(nv), 100);
        }}
        className="inline-flex w-fit items-center gap-1 rounded-full border border-border px-4 py-1.5 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" /> Añadir variante
      </button>
    </div>
  );
}
