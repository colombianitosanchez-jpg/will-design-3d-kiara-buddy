import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Layers } from "lucide-react";
import { HOME_SECTIONS, type HomeSectionKey } from "@/lib/home-sections";

function Row({
  id,
  index,
  total,
  onPositionChange,
}: {
  id: HomeSectionKey;
  index: number;
  total: number;
  onPositionChange: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const label = HOME_SECTIONS.find((s) => s.key === id)?.label ?? id;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl border bg-card p-3 transition shadow-2xs ${
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
        title="Arrastrar para reordenar sección"
      >
        <GripVertical className="h-5 w-5 text-primary" />
      </button>

      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
        #{index + 1}
      </span>

      <span className="text-sm font-bold flex-1 text-foreground flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
        {label}
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        <label className="text-[11px] text-muted-foreground font-semibold">Pos:</label>
        <input
          type="number"
          min={1}
          max={total}
          value={index + 1}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              const targetIdx = Math.max(0, Math.min(total - 1, val - 1));
              if (targetIdx !== index) {
                onPositionChange(index, targetIdx);
              }
            }
          }}
          className="w-12 rounded-lg border border-input bg-background px-2 py-1 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </li>
  );
}

export function HomeSectionsOrder({ value, onChange }: { value: HomeSectionKey[]; onChange: (next: HomeSectionKey[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(value, value.indexOf(active.id as HomeSectionKey), value.indexOf(over.id as HomeSectionKey)));
  }

  function handlePositionChange(from: number, to: number) {
    onChange(arrayMove(value, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={value} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2.5">
          {value.map((k, i) => (
            <Row
              key={k}
              id={k}
              index={i}
              total={value.length}
              onPositionChange={handlePositionChange}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
