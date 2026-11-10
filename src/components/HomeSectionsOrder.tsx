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
import { GripVertical, Layers } from "lucide-react";
import { HOME_SECTIONS, type HomeSectionKey } from "@/lib/home-sections";
import { Button } from "@/components/ui/button";

function Row({ id, index }: { id: HomeSectionKey; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar ${label}`}
        className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition"
        title="Arrastrar para reordenar sección"
      >
        <GripVertical className="h-5 w-5 text-primary" />
      </Button>

      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
        #{index + 1}
      </span>

      <span className="text-sm font-bold flex-1 text-foreground flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
        {label}
      </span>
    </li>
  );
}

export function HomeSectionsOrder({
  value,
  onChange,
}: {
  value: HomeSectionKey[];
  onChange: (next: HomeSectionKey[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onChange(
      arrayMove(
        value,
        value.indexOf(active.id as HomeSectionKey),
        value.indexOf(over.id as HomeSectionKey),
      ),
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={value} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2.5">
          {value.map((k, i) => (
            <Row key={k} id={k} index={i} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
