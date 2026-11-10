import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Layers, Trash2, Upload, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/hooks/use-site-content";
import { getActiveTheme } from "@/lib/theme";
import { UnifiedButton } from "@/components/UnifiedButton";
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
  BUTTON_ICON_SHAPES,
  ICON_SHAPE_LABELS,
  type ButtonIconShape,
  type ButtonMediaMode,
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateButton = (id: string, patch: Partial<ProductButton>) => {
    onChange(buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const duplicateButton = (id: string) => {
    const idx = buttons.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const copy = { ...buttons[idx], id: crypto.randomUUID() };
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
                onDuplicate={() => duplicateButton(b.id)}
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
  onDuplicate,
}: {
  button: ProductButton;
  index: number;
  palette: Array<{ id: string; name: string; hex: string }>;
  showVariantToken: boolean;
  onUpdate: (patch: Partial<ProductButton>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
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

  const [uploadingWa, setUploadingWa] = useState(false);
  const [dragActiveMedia, setDragActiveMedia] = useState(false);
  const [dragActiveWa, setDragActiveWa] = useState(false);

  async function uploadToStorage(file: File, folder = "buttons") {
    if (file.size > 50 * 1024 * 1024) throw new Error("Supera el límite de 50MB");
    const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("site-media").upload(path, file, { upsert: false });
    if (up.error) throw up.error;
    const signed = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signed.error) throw signed.error;
    return signed.data.signedUrl;
  }

  async function handleUploadMedia(file: File) {
    setUploading(true);
    try {
      const url = await uploadToStorage(file, "buttons");
      let detectedType: ButtonAnimationType = "image";
      if (file.type.includes("json") || file.name.endsWith(".json")) detectedType = "lottie";
      else if (file.type.includes("video") || /\.(mp4|webm|quicktime)$/i.test(file.name)) detectedType = "video";
      else if (file.type.includes("gif") || file.name.endsWith(".gif")) detectedType = "gif";

      onUpdate({ media_url: url, animation_type: detectedType });
      toast.success("Medio para botón físico subido con éxito");
    } catch (e) {
      toast.error("Error al subir medio de botón", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadWaImage(file: File) {
    setUploadingWa(true);
    try {
      const url = await uploadToStorage(file, "whatsapp-payload");
      onUpdate({ whatsapp_image_url: url, include_image_link: true });
      toast.success("Imagen para WhatsApp subida con éxito");
    } catch (e) {
      toast.error("Error al subir imagen de WhatsApp", { description: (e as Error).message });
    } finally {
      setUploadingWa(false);
    }
  }


  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
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

        <div className="flex items-center gap-2">
          <div className="max-w-[220px]">
            <UnifiedButton button={b} onClick={() => {}} />
          </div>
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Duplicar botón"
          >
            <Copy className="h-4 w-4" />
          </button>

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

      {/* SECCIÓN A: DISEÑO Y ANIMACIÓN DEL BOTÓN EN TIENDA */}
      <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
            Sección A: Diseño y Animación del Botón en Tienda
          </h4>
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
            Color del Texto (vacío = automático)
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={b.text_color?.startsWith("#") ? b.text_color : "#ffffff"}
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded-lg border border-input p-0"
              />
              <input
                type="text"
                value={b.text_color || ""}
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                placeholder="Automático"
                className={inputCls}
              />
              {b.text_color && (
                <button type="button" onClick={() => onUpdate({ text_color: "" })} className="shrink-0 text-xs text-red-500 hover:underline">
                  Auto
                </button>
              )}
            </div>
          </label>

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

          <label className="text-xs font-semibold text-muted-foreground">
            Tipo de Animación / Medio Visual
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

        {/* Zona Drag & Drop / Explorador para Medio Físico del Botón */}
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">
              Medio de Fondo / Animación Visual del Botón Físico (Tienda)
            </label>
            <span className="text-[10px] text-muted-foreground">
              MP4, WebM, GIF animado o Imagen
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Este medio decorativo se reproduce dentro del botón en la tienda (fondo vivo o animación).
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActiveMedia(true);
            }}
            onDragLeave={() => setDragActiveMedia(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActiveMedia(false);
              if (e.dataTransfer.files?.[0]) handleUploadMedia(e.dataTransfer.files[0]);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
              dragActiveMedia
                ? "border-primary bg-primary/10"
                : "border-border bg-card/60 hover:border-primary/50"
            }`}
          >
            {b.media_url ? (
              <div className="w-full flex items-center justify-between gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono font-medium truncate block">
                    {b.media_url}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Tipo actual: {b.animation_type || "imagen"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdate({ media_url: "", animation_type: "none" })}
                  className="shrink-0 text-xs text-red-500 hover:underline"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Arrastra y suelta aquí tu archivo de video/GIF/imagen o examina tu equipo
              </p>
            )}

            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted shadow-xs">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Subiendo…" : "Explorar en dispositivo"}
              <input
                type="file"
                accept="image/*,video/*,.json,application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadMedia(e.target.files[0])}
              />
            </label>
          </div>

          {b.media_url && (
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <label className="text-xs font-semibold text-muted-foreground">
                Uso del medio
                <select
                  value={b.media_mode || "fill"}
                  onChange={(e) => onUpdate({ media_mode: e.target.value as ButtonMediaMode })}
                  className={inputCls}
                >
                  <option value="fill">Fondo vivo (todo el botón)</option>
                  <option value="icon">Ícono / logo</option>
                </select>
              </label>
              {(b.media_mode || "fill") === "fill" ? (
                <label className="text-xs font-semibold text-muted-foreground">
                  Cobertura del fondo
                  <select
                    value={b.media_fit || "cover"}
                    onChange={(e) => onUpdate({ media_fit: e.target.value as "cover" | "contain" | "fill" })}
                    className={inputCls}
                  >
                    <option value="cover">Cubrir todo</option>
                    <option value="contain">Ajustar al centro</option>
                    <option value="fill">Estirar</option>
                  </select>
                </label>
              ) : (
                <>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Forma del ícono
                    <select
                      value={b.icon_shape || "circle"}
                      onChange={(e) => onUpdate({ icon_shape: e.target.value as ButtonIconShape })}
                      className={inputCls}
                    >
                      {BUTTON_ICON_SHAPES.map((sh) => (
                        <option key={sh} value={sh}>{ICON_SHAPE_LABELS[sh]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Posición del ícono
                    <select
                      value={b.icon_position || "left"}
                      onChange={(e) => onUpdate({ icon_position: e.target.value as "left" | "right" })}
                      className={inputCls}
                    >
                      <option value="left">Izquierda</option>
                      <option value="right">Derecha</option>
                    </select>
                  </label>
                </>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-3 space-y-2 mt-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Sombreado: {typeof b.shade === "number" ? `${b.shade}%` : "Automático"}</span>
              {typeof b.shade === "number" && (
                <button type="button" onClick={() => onUpdate({ shade: undefined })} className="text-xs text-muted-foreground hover:underline">
                  Automático
                </button>
              )}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={typeof b.shade === "number" ? b.shade : 0}
              onChange={(e) => onUpdate({ shade: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN B: CONTENIDO DEL MENSAJE DE WHATSAPP */}
      {b.action_type === "whatsapp" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] p-4 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Sección B: Contenido del Mensaje de WhatsApp
            </h4>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground">
              Mensaje Personalizado de WhatsApp
              <Textarea
                value={b.whatsapp_message}
                onChange={(e) => onUpdate({ whatsapp_message: e.target.value })}
                placeholder="Hola Will Design 3D, me interesa el producto {{producto}}..."
                rows={3}
                className="mt-1 text-xs resize-y"
              />
            </label>
            <p className="text-[11px] text-muted-foreground">
              Variables disponibles: <code className="font-mono font-bold">{"{{producto}}"}</code>, <code className="font-mono font-bold">{"{{precio}}"}</code>{showVariantToken ? <>, <code className="font-mono font-bold">{"{{variante}}"}</code></> : null}. Si lo dejas vacío, enviamos el mensaje estándar de compra.
            </p>

            {/* Selector de Imagen para WhatsApp con Drag & Drop y Explorador */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Imagen Específica para el Mensaje de WhatsApp
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Drag & Drop o Explorar Dispositivo
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Esta es la foto que acompaña el enlace enviado a WhatsApp (independiente de los videos o GIF decorativos del botón en la tienda).
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActiveWa(true);
                }}
                onDragLeave={() => setDragActiveWa(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActiveWa(false);
                  if (e.dataTransfer.files?.[0]) handleUploadWaImage(e.dataTransfer.files[0]);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
                  dragActiveWa
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-emerald-500/30 bg-card/60 hover:border-emerald-500/60"
                }`}
              >
                {b.whatsapp_image_url ? (
                  <div className="w-full flex items-center justify-between gap-3 text-left">
                    <span className="text-xs font-mono font-medium truncate block text-emerald-700 dark:text-emerald-300">
                      {b.whatsapp_image_url}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdate({ whatsapp_image_url: "" })}
                      className="shrink-0 text-xs text-red-500 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Arrastra aquí una foto para el mensaje o búscala en tus carpetas
                  </p>
                )}

                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-background px-3 py-1.5 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-xs">
                  <Upload className="h-3.5 w-3.5 text-emerald-600" />
                  {uploadingWa ? "Subiendo…" : "Explorar en dispositivo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUploadWaImage(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/80 px-3 py-2">
              <span className="text-xs font-semibold">
                Adjuntar automáticamente enlace con vista previa de imagen en WhatsApp
                <span className="mt-0.5 block font-normal text-muted-foreground text-[11px]">
                  Al subir una imagen o activar esta opción, la foto se adjunta automáticamente sin escribir comandos.
                </span>
              </span>
              <Switch
                checked={b.include_image_link || Boolean(b.whatsapp_image_url)}
                onCheckedChange={(v) => onUpdate({ include_image_link: v })}
              />
            </label>
          </div>
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
