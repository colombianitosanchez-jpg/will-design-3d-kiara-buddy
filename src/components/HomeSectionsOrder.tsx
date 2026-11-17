import { useRef, type ReactNode } from "react";
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
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GripVertical, Layers } from "lucide-react";
import { HOME_SECTIONS, type HomeSectionKey } from "@/lib/home-sections";
import { Button } from "@/components/ui/button";

function Row({
  id,
  index,
  isOpen,
  onToggle,
  body,
}: {
  id: HomeSectionKey;
  index: number;
  isOpen: boolean;
  onToggle?: () => void;
  body?: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const label = HOME_SECTIONS.find((s) => s.key === id)?.label ?? id;
  const expandable = Boolean(onToggle);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`overflow-hidden rounded-2xl border bg-card shadow-2xs transition ${
        isDragging
          ? "z-20 border-primary bg-primary/10 shadow-xl ring-2 ring-primary"
          : "border-border hover:border-border/80"
      }`}
    >
      <div
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? isOpen : undefined}
        onClick={expandable ? onToggle : undefined}
        onKeyDown={
          expandable
            ? (e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle?.();
                }
              }
            : undefined
        }
        className={`flex items-center gap-3 p-3.5 transition sm:px-4 ${
          expandable ? "cursor-pointer select-none hover:bg-muted/30" : ""
        } ${isOpen ? "border-b border-border/60 bg-muted/15" : ""}`}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Arrastrar ${label}`}
          className="shrink-0 cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
          title="Arrastrar para reordenar sección"
        >
          <GripVertical className="h-5 w-5 text-primary" />
        </Button>

        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
          #{index + 1}
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-foreground">
          <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </span>

        {expandable && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        )}
      </div>

      {expandable && (
        <AnimatePresence initial={false}>
          {isOpen && body ? (
            <motion.div
              key="section-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-6 p-5 sm:p-6">{body}</div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </li>
  );
}

export function HomeSectionsOrder({
  value,
  onChange,
  expandedSections,
  onToggleSection,
  renderSectionBody,
}: {
  value: HomeSectionKey[];
  onChange: (next: HomeSectionKey[]) => void;
  expandedSections?: ReadonlySet<string>;
  onToggleSection?: (key: HomeSectionKey) => void;
  renderSectionBody?: (key: HomeSectionKey) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const justDraggedRef = useRef(false);

  function markJustDragged() {
    justDraggedRef.current = true;
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 80);
    }
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    markJustDragged();
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => {
        justDraggedRef.current = false;
      }}
      onDragEnd={onDragEnd}
      onDragCancel={markJustDragged}
    >
      <SortableContext items={value} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {value.map((k, i) => (
            <Row
              key={k}
              id={k}
              index={i}
              isOpen={Boolean(expandedSections?.has(k))}
              onToggle={
                onToggleSection
                  ? () => {
                      if (justDraggedRef.current) return;
                      onToggleSection(k);
                    }
                  : undefined
              }
              body={renderSectionBody ? renderSectionBody(k) : undefined}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
