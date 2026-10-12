import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { HOME_SECTIONS, type HomeSectionKey } from "@/lib/home-sections";

function Row({ id, index }: { id: HomeSectionKey; index: number }) {
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
      <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
      <span className="text-sm font-semibold">{label}</span>
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
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={value} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {value.map((k, i) => (
            <Row key={k} id={k} index={i} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
