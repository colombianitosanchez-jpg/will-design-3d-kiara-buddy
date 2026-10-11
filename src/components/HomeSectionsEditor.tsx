import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { HOME_SECTIONS, parseHomeSections, type HomeSectionItem } from "@/lib/home-sections";

function Row({ item, onToggle }: { item: HomeSectionItem; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const label = HOME_SECTIONS.find((s) => s.id === item.id)?.label ?? item.id;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-3 ${isDragging ? "z-10 shadow-lg" : ""} ${item.visible ? "" : "opacity-60"}`}
    >
      <button type="button" aria-label={`Arrastrar ${label}`} className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex-1 text-sm font-bold">{label}</span>
      <Switch checked={item.visible} onCheckedChange={onToggle} aria-label={`Mostrar ${label}`} />
    </li>
  );
}

export function HomeSectionsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items = parseHomeSections(value);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const save = (list: HomeSectionItem[]) => onChange(JSON.stringify(list));
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    save(arrayMove(items, from, to));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((it) => (
            <Row key={it.id} item={it} onToggle={() => save(items.map((x) => (x.id === it.id ? { ...x, visible: !x.visible } : x)))} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
