import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
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
      className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-3 ${isDragging ? "z-10 shadow-xl" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar ${label}`}
        className="cursor-grab touch-none rounded-lg p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground font-medium">Pos:</label>
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
          className="w-14 rounded-lg border border-input bg-background px-2 py-1 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <span className="text-sm font-semibold flex-1">{label}</span>
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
        <ul className="space-y-2">
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
