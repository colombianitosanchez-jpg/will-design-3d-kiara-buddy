import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Trash2, Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/hooks/use-site-content";
import { getActiveTheme } from "@/lib/theme";
import { Lottie } from "lottie-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  ACTION_LABELS,
  ANIMATION_TYPES,
  ANIMATION_TYPE_LABELS,
  BUTTON_ACTIONS,
  BUTTON_POSITIONS,
  BUTTON_VARIANTS,
  BUTTON_WIDTHS,
  POSITION_LABELS,
  VARIANT_LABELS,
  WIDTH_LABELS,
  newProductButton,
  type ProductButton,
  type ButtonAnimationType,
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

function LottiePreview({ url }: { url: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    setLoading(true);
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setData(null);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!data) return <span className="text-[10px] text-red-500">JSON no válido</span>;
  return <Lottie animationData={data} loop={true} className="h-6 w-6" {...({} as any)} />;
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
                palette={palette}
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
  palette,
  showVariantToken,
  onUpdate,
  onRemove,
}: {
  button: ProductButton;
  index: number;
  palette: Array<{ id: string; name: string; hex: string }>;
  showVariantToken: boolean;
  onUpdate: (patch: Partial<ProductButton>) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: b.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleUploadMedia(file: File) {
    setUploading(true);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("Supera el límite de 50MB");
      const path = `buttons/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("site-media").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;

      let detectedType: ButtonAnimationType = "image";
      if (file.type.includes("json")) detectedType = "lottie";
      else if (file.type.includes("video")) detectedType = "video";
      else if (file.type.includes("gif")) detectedType = "gif";

      onUpdate({ media_url: signed.data.signedUrl, animation_type: detectedType });
      toast.success("Archivo subido para el botón");
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  // Resolver color de fondo para la vista previa
  let resolvedBg = "";
  if (b.color_id === "custom") {
    resolvedBg = b.custom_hex || "";
  } else if (b.color_id) {
    const found = palette.find((p) => p.id === b.color_id);
    if (found) resolvedBg = found.hex;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
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
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Botón {i + 1}
          </span>
        </div>

        {/* Live Framer Motion Preview Button */}
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={resolvedBg ? { backgroundColor: resolvedBg, color: "#ffffff" } : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs ${
              !resolvedBg ? "bg-primary text-primary-foreground" : ""
            } ${b.animation_style && b.animation_style !== "none" ? `theme-anim-${b.animation_style}` : ""}`}
          >
            {b.media_url && b.animation_type !== "none" && (
              <span className="shrink-0 flex items-center justify-center">
                {b.animation_type === "lottie" ? (
                  <LottiePreview url={b.media_url} />
                ) : b.animation_type === "video" ? (
                  <video src={b.media_url} autoPlay loop muted playsInline className="h-4 w-4 rounded-full object-cover" />
                ) : (
                  <img src={b.media_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                )}
              </span>
            )}
            {b.text || "Vista previa"}
          </motion.button>

          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            title="Quitar botón"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Texto del Botón
          <input
            value={b.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Comprar ahora"
            className={inputCls}
          />
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

        {/* Dynamic Theme Color Selector */}
        <label className="text-xs font-semibold text-muted-foreground">
          Color del Botón (Paleta del Tema / HEX)
          <select
            value={b.color_id || ""}
            onChange={(e) => onUpdate({ color_id: e.target.value })}
            className={inputCls}
          >
            <option value="">Predeterminado del Tema</option>
            {palette.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name} ({col.hex})
              </option>
            ))}
            <option value="custom">Color personalizado (HEX Libre)</option>
          </select>
        </label>

        {b.color_id === "custom" && (
          <label className="text-xs font-semibold text-muted-foreground">
            HEX Libre
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={b.custom_hex?.startsWith("#") ? b.custom_hex : "#f97316"}
                onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded-lg border border-input p-0"
              />
              <input
                type="text"
                value={b.custom_hex || ""}
                onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                placeholder="#FF0000"
                className={inputCls}
              />
            </div>
          </label>
        )}

        <label className="text-xs font-semibold text-muted-foreground">
          Estilo / Preset Tailwind
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
      </div>

      {/* Animation & Media Picker */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Animación y Media Decorativa del Botón
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Tipo de Media / Animación
            <select
              value={b.animation_type || "none"}
              onChange={(e) => onUpdate({ animation_type: e.target.value as ButtonAnimationType })}
              className={inputCls}
            >
              {ANIMATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ANIMATION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-muted-foreground">
            Efecto Glow / Resplandor
            <select
              value={b.animation_style || "none"}
              onChange={(e) => onUpdate({ animation_style: e.target.value })}
              className={inputCls}
            >
              <option value="none">Sin Resplandor</option>
              <option value="neon_glow">Neón Cyberpunk ⚡</option>
              <option value="cyber_pulse">Pulso Dinámico 💫</option>
              <option value="shimmer">Brillo Shimmer ✨</option>
              <option value="festive_sparkle">Destello Festivo 🌟</option>
            </select>
          </label>
        </div>

        {b.animation_type && b.animation_type !== "none" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">
              URL del Archivo ({b.animation_type.toUpperCase()} / MP4 / WebM / Lottie JSON)
              <div className="flex gap-2 mt-1">
                <input
                  value={b.media_url || ""}
                  onChange={(e) => onUpdate({ media_url: e.target.value })}
                  placeholder="https://... .gif, .mp4, .json"
                  className={inputCls}
                />
                <label className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Subiendo…" : "Subir"}
                  <input
                    type="file"
                    accept="image/*,video/*,.json,application/json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUploadMedia(e.target.files[0])}
                  />
                </label>
              </div>
            </label>
          </div>
        )}
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
