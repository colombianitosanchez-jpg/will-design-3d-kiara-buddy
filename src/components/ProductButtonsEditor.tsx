import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Trash2 } from "lucide-react";
import {
  ACTION_LABELS,
  BUTTON_ACTIONS,
  BUTTON_POSITIONS,
  BUTTON_VARIANTS,
  BUTTON_WIDTHS,
  POSITION_LABELS,
  VARIANT_LABELS,
  WIDTH_LABELS,
  newProductButton,
  type ProductButton,
} from "@/lib/product-buttons";
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
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function ProductButtonsEditor({
  buttons,
  onChange,
  showVariantToken = false,
}: {
  buttons: ProductButton[];
  onChange: (b: ProductButton[]) => void;
  showVariantToken?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateButton = (id: string, patch: Partial<ProductButton>) => {
    onChange(buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeButton = (id: string) => {
    onChange(buttons.filter((b) => b.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = buttons.findIndex((b) => b.id === active.id);
    const newIndex = buttons.findIndex((b) => b.id === over.id);
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={buttons.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {buttons.map((b, i) => (
              <SortableButtonCard
                key={b.id}
                button={b}
                index={i}
                showVariantToken={showVariantToken}
                onUpdate={(patch) => updateButton(b.id, patch)}
                onRemove={() => removeButton(b.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() => onChange([...buttons, newProductButton()])}
        className="justify-self-start rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted"
      >
        + Añadir botón
      </button>
    </div>
  );
}

function SortableButtonCard({
  button: b,
  index: i,
  showVariantToken,
  onUpdate,
  onRemove,
}: {
  button: ProductButton;
  index: number;
  showVariantToken: boolean;
  onUpdate: (patch: Partial<ProductButton>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: b.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-border bg-muted/30 p-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
            title="Arrastrar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Botón {i + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
          title="Quitar botón"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Texto
          <input
            value={b.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Comprar ahora"
            className={inputCls}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Estilo
          <select
            value={b.variant}
            onChange={(e) => onUpdate({ variant: e.target.value as ProductButton["variant"] })}
            className={inputCls}
          >
            {BUTTON_VARIANTS.map((v) => (
              <option key={v} value={v}>
                {VARIANT_LABELS[v]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Ancho
          <select
            value={b.width}
            onChange={(e) => onUpdate({ width: e.target.value as ProductButton["width"] })}
            className={inputCls}
          >
            {BUTTON_WIDTHS.map((w) => (
              <option key={w} value={w}>
                {WIDTH_LABELS[w]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Alineación
          <select
            value={b.position}
            onChange={(e) => onUpdate({ position: e.target.value as ProductButton["position"] })}
            className={inputCls}
          >
            {BUTTON_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {POSITION_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Acción al pulsar
          <select
            value={b.action_type}
            onChange={(e) =>
              onUpdate({
                action_type: e.target.value as ProductButton["action_type"],
                action_value: "",
              })
            }
            className={inputCls}
          >
            {BUTTON_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        {(b.action_type === "link" || b.action_type === "whatsapp") && (
          <label className="text-xs font-semibold text-muted-foreground">
            {b.action_type === "link" ? "URL o ruta de destino" : "Número de WhatsApp (opcional)"}
            <input
              value={b.action_value}
              onChange={(e) => onUpdate({ action_value: e.target.value })}
              placeholder={b.action_type === "link" ? "/cotizador o https://…" : "573156724474"}
              className={inputCls}
            />
          </label>
        )}
        <label className="text-xs font-semibold text-muted-foreground">
          URL GIF/Video/Imagen (Opcional)
          <input
            value={b.media_url || ""}
            onChange={(e) => onUpdate({ media_url: e.target.value })}
            placeholder="https://... .gif o .mp4"
            className={inputCls}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Efecto / Animación Botón
          <select
            value={b.animation_style || "none"}
            onChange={(e) => onUpdate({ animation_style: e.target.value })}
            className={inputCls}
          >
            <option value="none">Sin Animación</option>
            <option value="neon_glow">Neón Cyberpunk ⚡</option>
            <option value="cyber_pulse">Pulso Dinámico 💫</option>
            <option value="shimmer">Brillo Shimmer ✨</option>
            <option value="festive_sparkle">Destello Festivo 🌟</option>
          </select>
        </label>
      </div>

      {b.action_type === "whatsapp" && (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            Si lo dejas vacío usamos el WhatsApp general del sitio.
          </p>
          <label className="block text-xs font-semibold text-muted-foreground">
            Mensaje personalizado de WhatsApp
            <Textarea
              value={b.whatsapp_message}
              onChange={(e) => onUpdate({ whatsapp_message: e.target.value })}
              placeholder="Hola Will Design 3D, me interesa el producto {{producto}}..."
              rows={3}
              className="mt-1"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Puedes usar {"{{producto}}"}, {"{{precio}}"}{showVariantToken ? <> y {"{{variante}}"}</> : null}; si lo dejas vacío enviamos el mensaje estándar.
          </p>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs font-semibold">
              Incluir la foto del producto en el mensaje
              <span className="mt-0.5 block font-normal text-muted-foreground">
                Añade el enlace de la ficha del producto; WhatsApp muestra la foto, el nombre y el precio como vista previa.
              </span>
            </span>
            <Switch
              checked={b.include_image_link}
              onCheckedChange={(v) => onUpdate({ include_image_link: v })}
            />
          </label>
        </div>
      )}

      {(b.action_type === "add_to_cart" || b.action_type === "checkout") && (
        <p className="mt-2 text-xs text-muted-foreground">
          {b.action_type === "add_to_cart"
            ? "Añade este producto al carrito del visitante."
            : "Añade el producto y lleva directo al carrito para confirmar el pedido."}
        </p>
      )}
    </div>
  );
}
