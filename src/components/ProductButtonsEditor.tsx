import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Layers, Trash2, Copy, Plus, Sparkles } from "lucide-react";
import { useSiteContent } from "@/hooks/use-site-content";
import { getActiveTheme } from "@/lib/theme";
import { UnifiedButton } from "@/components/UnifiedButton";
import { MediaDropZone } from "@/components/MediaDropZone";
import { SITE_INTERNAL_PAGES } from "@/lib/site-pages";
import { accentPalette } from "@/lib/hero-stats";
import {
  BUTTON_ICON_SHAPES,
  ICON_SHAPE_LABELS,
  type ButtonIconShape,
  newProductButton,
  type ProductButton,
  type ButtonAnimationType,
} from "@/lib/product-buttons";
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

function SortableButtonOrderRow({
  button,
  index,
  onRemove,
}: {
  button: ProductButton;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `order_${button.id}`,
  });
  const label = button.label?.trim() || button.text?.trim() || `Botón #${index + 1}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl border bg-card p-2.5 transition shadow-2xs ${
        isDragging
          ? "z-20 border-primary bg-primary/10 shadow-xl ring-2 ring-primary"
          : "border-border hover:border-border/80"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar ${label}`}
        className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition"
        title="Arrastrar para reordenar botón"
      >
        <GripVertical className="h-4 w-4 text-primary" />
      </button>

      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
        #{index + 1}
      </span>

      <span className="text-xs font-bold flex-1 text-foreground flex items-center gap-2 truncate">
        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">{label}</span>
      </span>

      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition shrink-0"
        title="Eliminar este botón"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export function ProductButtonsEditor({
  buttons,
  onChange,
  showVariantToken = false,
}: {
  buttons: ProductButton[];
  onChange: (b: ProductButton[]) => void;
  showVariantToken?: boolean;
}) {
  const { content } = useSiteContent();
  const activeTheme = getActiveTheme(content);
  const palette = activeTheme.colors.palette || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateButton = (id: string, patch: Partial<ProductButton>) => {
    onChange(buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const duplicateButton = (id: string) => {
    const idx = buttons.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const src = buttons[idx];
    const copy = { ...src, id: crypto.randomUUID(), text: src.text ? `${src.text} (Copia)` : "Nuevo Botón" };
    const next = [...buttons];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const removeButton = (id: string) => {
    onChange(buttons.filter((b) => b.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cleanActiveId = String(active.id).replace(/^order_/, "");
    const cleanOverId = String(over.id).replace(/^order_/, "");

    const oldIndex = buttons.findIndex((b) => b.id === cleanActiveId);
    const newIndex = buttons.findIndex((b) => b.id === cleanOverId);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(arrayMove(buttons, oldIndex, newIndex));
    }
  };

  return (
    <div className="grid gap-3">
      {buttons.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin botones personalizados: la tarjeta mostrará el texto de acción estándar.
        </p>
      )}

      {buttons.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5">
          <div>
            <label className="text-xs font-bold flex items-center gap-2 text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Orden de los Botones
            </label>
            <p className="text-[11px] text-muted-foreground">
              Arrastra los botones para definir su orden de aparición o elimínalos rápidamente.
            </p>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={buttons.map((b) => `order_${b.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {buttons.map((b, i) => (
                  <SortableButtonOrderRow
                    key={`order_${b.id}`}
                    button={b}
                    index={i}
                    onRemove={() => removeButton(b.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <Label className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Botones de Acción (Ilimitados con Drag & Drop)
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Añade, reordena y personaliza todos los botones que desees mostrar.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => onChange([...buttons, newProductButton()])}
            className="text-xs font-bold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            + Añadir Botón
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={buttons.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {buttons.map((b, i) => (
                <SortableButtonCard
                  key={b.id}
                  button={b}
                  index={i}
                  palette={palette}
                  showVariantToken={showVariantToken}
                  onUpdate={(patch) => updateButton(b.id, patch)}
                  onRemove={() => removeButton(b.id)}
                  onDuplicate={() => duplicateButton(b.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

