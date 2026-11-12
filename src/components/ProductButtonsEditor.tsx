import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Layers, Trash2, Plus, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function detectAnimType(url: string, kind?: "imageFill" | "videoFill"): ButtonAnimationType {
  if (!url) return "none";
  if (kind === "videoFill" || /\.(mp4|webm|mov|quicktime)($|\?)/i.test(url)) return "video";
  if (/\.gif($|\?)/i.test(url)) return "gif";
  if (/\.json($|\?)/i.test(url)) return "lottie";
  return "image";
}

function SortableButtonCard({
  button: b,
  index,
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const [isOpen, setIsOpen] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const textColor = b.text_color || "";
  const customHex = b.custom_hex || "";
  const shadeNum = typeof b.shade === "number" ? Math.max(0, Math.min(100, b.shade)) : undefined;
  const legacyIcon = b.media_mode === "icon";
  const mediaMode: "fill" | "none" = legacyIcon || b.media_mode === "none" ? "none" : "fill";
  const mediaUrl = legacyIcon ? "" : b.media_url || "";
  const mediaFit = b.media_fit || "cover";
  const iconUrl = b.icon_url || (legacyIcon ? b.media_url || "" : "");
  const iconPos = b.icon_position && b.icon_position !== "none" ? b.icon_position : legacyIcon ? "left" : "none";
  const iconShape = b.icon_shape || "circle";
  const actionType = b.action_type;
  const actionValue = b.action_value || "";

  const selectValue = (() => {
    if (actionType === "whatsapp" || actionType === "add_to_cart" || actionType === "checkout") return actionType;
    const matched = SITE_INTERNAL_PAGES.find((p) => p.path === actionValue);
    return matched ? matched.path : "custom_link";
  })();
  const matchedPage = actionType === "link" ? SITE_INTERNAL_PAGES.find((p) => p.path === actionValue) : undefined;

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-border bg-card shadow-2xs">
      {/* Encabezado: arrastre, #, nombre, eliminar y vista previa */}
      <div className={`flex flex-wrap items-center justify-between gap-2.5 p-3 ${isOpen ? "border-b border-border/50" : ""}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Arrastrar botón #${index + 1}`}
            className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition"
            title="Arrastrar para reordenar"
          >
            <GripVertical className="h-5 w-5 text-primary" />
          </button>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
            #{index + 1}
          </span>
          <button type="button" onClick={() => setIsOpen((o) => !o)} className="text-sm font-bold text-foreground truncate hover:underline text-left flex-1 min-w-0">
            {b.text || "Sin texto"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setIsOpen((o) => !o)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title={isOpen ? "Plegar controles" : "Desplegar controles"}
            aria-label={isOpen ? "Plegar controles" : "Desplegar controles"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <div className="shrink-0 max-w-[220px]">
            <UnifiedButton
              button={{
                ...b,
                text: b.text || "Vista Previa",
                media_url: mediaMode === "fill" ? mediaUrl : undefined,
                media_mode: mediaMode,
                icon_url: iconUrl || undefined,
                icon_position: iconPos,
                animation_type: detectAnimType(mediaMode === "fill" ? mediaUrl : ""),
                animation_style: "none",
              }}
              onClick={() => {}}
            />
          </div>
        </div>
      </div>

      {isOpen && (
      <div className="p-4 sm:p-5 space-y-6 bg-muted/[0.04] rounded-b-2xl">
      {/* Texto visible */}
      <div>
        <Label className="text-xs font-semibold">Texto visible del Botón</Label>
        <Input
          value={b.text || ""}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Ej: Comprar ahora o Cotizar por WhatsApp"
          className="mt-1 text-xs"
        />
      </div>

      {/* SECCIÓN A */}
      <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Sección A: Diseño y Animación</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-semibold">Color del Texto (Código HEX)</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(textColor) ? textColor : "#ffffff"}
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
              />
              <Input
                value={textColor}
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                placeholder="Ej: #ffffff, #000000"
                className="text-xs font-mono uppercase"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Vacío = contraste automático según fondo o fondo vivo.</p>
          </div>

          <div>
            <Label className="text-xs font-semibold">Color de fondo del Botón</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : "#f97316"}
                onChange={(e) => onUpdate({ custom_hex: e.target.value, color_id: "" })}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
              />
              <Input
                value={customHex}
                onChange={(e) => onUpdate({ custom_hex: e.target.value, color_id: "" })}
                placeholder="Ej: #f97316 (vacío = color de marca)"
                className="text-xs font-mono uppercase"
              />
            </div>
            {palette.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-semibold">Paleta del tema:</span>
                {accentPalette(palette).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onUpdate({ custom_hex: p.hex, color_id: "" })}
                    className="h-5 px-1.5 rounded text-[10px] font-bold border border-border flex items-center gap-1 hover:opacity-80 transition"
                    style={{ backgroundColor: `${p.hex}25`, color: p.hex }}
                    title={p.name}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.hex }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Sombreado / Contraste (shade)</Label>
              <span className="text-xs font-mono font-bold text-primary">{shadeNum === undefined ? "Auto" : `${shadeNum}%`}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={shadeNum ?? (mediaUrl && mediaMode === "fill" ? 45 : 0)}
                onChange={(e) => onUpdate({ shade: Number(e.target.value) })}
                className="w-full accent-primary cursor-pointer"
              />
              <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => onUpdate({ shade: undefined })}>
                Auto
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Capa oscura entre el fondo y el texto. 0% = sin sombreado.</p>
          </div>

          <div>
            <Label className="text-xs font-semibold">Cobertura / Ancho del botón</Label>
            <Select value={b.width || "auto"} onValueChange={(val: "auto" | "full") => onUpdate({ width: val })}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Ancho automático (ajustado al texto)</SelectItem>
                <SelectItem value="full">Ancho completo 100% (bloque total)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-0.5">Controla si el botón se expande a todo lo ancho o según su texto.</p>
          </div>

          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Fondo Animado / Relleno Vivo (Llenar Botón Completo)
              </Label>
              <Select
                value={mediaMode}
                onValueChange={(val: "fill" | "none") =>
                  onUpdate(
                    val === "none"
                      ? { media_mode: "none", media_url: legacyIcon ? b.media_url : "", animation_type: "none" }
                      : { media_mode: "fill", media_url: legacyIcon ? "" : b.media_url, icon_url: iconUrl, icon_position: iconPos }
                  )
                }
              >
                <SelectTrigger className="h-7 text-[11px] w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fill">Llenar botón</SelectItem>
                  <SelectItem value="none">Sin fondo animado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Soporta video MP4/WebM en bucle, GIF o imagen para cubrir el fondo completo con contraste garantizado.
            </p>
            {mediaMode === "fill" && (
              <>
                <MediaDropZone
                  value={mediaUrl}
                  onChange={(url, kind) => onUpdate({ media_url: url, media_mode: "fill", animation_type: detectAnimType(url, kind) })}
                />
                <div>
                  <Label className="text-xs font-semibold">Espacio que cubre el fondo animado</Label>
                  <Select value={mediaFit} onValueChange={(val: "cover" | "contain" | "fill") => onUpdate({ media_fit: val })}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cubrir todo el botón (recorta bordes)</SelectItem>
                      <SelectItem value="contain">Ajustar al centro (se ve completa)</SelectItem>
                      <SelectItem value="fill">Estirar para llenar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                Ícono o Miniatura dentro del Botón
              </Label>
              <Select
                value={iconPos}
                onValueChange={(val: "none" | "left" | "right") =>
                  onUpdate(
                    legacyIcon
                      ? { icon_position: val, icon_url: iconUrl, media_mode: "none", media_url: "" }
                      : { icon_position: val }
                  )
                }
              >
                <SelectTrigger className="h-7 text-[11px] w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin ícono</SelectItem>
                  <SelectItem value="left">A la izquierda</SelectItem>
                  <SelectItem value="right">A la derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">Muestra una figura geométrica con imagen/ícono junto al texto.</p>
            {iconPos !== "none" && (
              <>
                <MediaDropZone
                  value={iconUrl}
                  onChange={(url) =>
                    onUpdate(legacyIcon ? { icon_url: url, media_mode: "none", media_url: "", icon_position: iconPos } : { icon_url: url })
                  }
                />
                <div>
                  <Label className="text-xs font-semibold">Forma del ícono</Label>
                  <Select value={iconShape} onValueChange={(val: ButtonIconShape) => onUpdate({ icon_shape: val })}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUTTON_ICON_SHAPES.map((shape) => (
                        <SelectItem key={shape} value={shape}>{ICON_SHAPE_LABELS[shape]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN B */}
      <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-primary">
            Sección B: Acción al Pulsar (Comportamiento del Botón)
          </h4>
        </div>

        <div>
          <Label className="text-xs font-semibold">¿Qué acción debe ejecutar este botón?</Label>
          <Select
            value={selectValue}
            onValueChange={(val) => {
              if (val === "whatsapp" || val === "add_to_cart" || val === "checkout") {
                onUpdate({ action_type: val, action_value: actionType === val ? actionValue : "" });
              } else if (val === "custom_link") {
                const known = SITE_INTERNAL_PAGES.some((p) => p.path === actionValue);
                onUpdate({ action_type: "link", action_value: actionType === "link" && !known ? actionValue : "" });
              } else {
                onUpdate({ action_type: "link", action_value: val });
              }
            }}
          >
            <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Selecciona una acción" /></SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Compra</div>
              <SelectItem value="add_to_cart">🛒 Añadir al carrito</SelectItem>
              <SelectItem value="checkout">⚡ Comprar ahora (ir al carrito)</SelectItem>
              <div className="px-2 py-1 mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border/50">
                Páginas Oficiales del Sitio
              </div>
              {SITE_INTERNAL_PAGES.map((page) => (
                <SelectItem key={page.path} value={page.path}>{page.label} ({page.path})</SelectItem>
              ))}
              <div className="px-2 py-1 mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border/50">
                Otras Acciones
              </div>
              <SelectItem value="whatsapp">💬 Abrir Chat de WhatsApp con Mensaje Personalizado</SelectItem>
              <SelectItem value="custom_link">🔗 Enlace Personalizado o URL Externa (https://...)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(actionType === "add_to_cart" || actionType === "checkout") && (
          <div className="rounded-lg bg-background/50 border border-border/60 p-3 text-xs text-muted-foreground">
            {actionType === "add_to_cart"
              ? "Añade este producto (con la variante elegida) al carrito del visitante."
              : "Añade el producto y lleva directo al carrito para confirmar el pedido."}
          </div>
        )}

        {actionType === "link" &&
          (matchedPage ? (
            <div className="rounded-lg bg-background/50 border border-border/60 p-3 text-xs text-muted-foreground">
              Redirección interna configurada a: <span className="font-semibold text-foreground">{matchedPage.label}</span>{" "}
              <code className="font-mono text-primary font-bold">({matchedPage.path})</code>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold">Enlace o URL de Destino Personalizada</Label>
              <Input
                value={actionValue}
                onChange={(e) => onUpdate({ action_value: e.target.value })}
                placeholder="Ej: https://instagram.com/willdesign3d o /promociones"
                className="mt-1 text-xs"
              />
            </div>
          ))}

        {actionType === "whatsapp" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <h5 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Parámetros de WhatsApp</h5>
            </div>
            <div>
              <Label className="text-xs font-semibold">Número de WhatsApp (Opcional, vacío = WhatsApp de la marca)</Label>
              <Input
                value={actionValue}
                onChange={(e) => onUpdate({ action_value: e.target.value })}
                placeholder="573156724474 (solo números con código de país)"
                className="mt-1 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Texto o Plantilla del Mensaje de WhatsApp</Label>
              <Textarea
                rows={2}
                value={b.whatsapp_message}
                onChange={(e) => onUpdate({ whatsapp_message: e.target.value })}
                placeholder="Hola Will Design 3D, me interesa el producto {{producto}}..."
                className="text-xs resize-y"
              />
              <p className="text-[11px] text-muted-foreground">
                Variables: <code className="font-mono font-bold">{"{{producto}}"}</code>, <code className="font-mono font-bold">{"{{precio}}"}</code>
                {showVariantToken ? <>, <code className="font-mono font-bold">{"{{variante}}"}</code></> : null}. Vacío = mensaje estándar de compra.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Imagen Específica que Acompaña el Enlace en WhatsApp</Label>
              <p className="text-[11px] text-muted-foreground">Sube una foto JPG, PNG o WEBP: se comprime automáticamente a &lt;280KB.</p>
              <MediaDropZone
                forWhatsapp
                value={b.whatsapp_image_url || ""}
                onChange={(url) => onUpdate({ whatsapp_image_url: url })}
              />
            </div>
            {b.whatsapp_image_url ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Se usará esta foto en la tarjeta de WhatsApp</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">WhatsApp mostrará la tarjeta con esta foto.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">Se usará la foto ★ de la variante o del producto</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Sin foto aquí, la tarjeta muestra la portada ★ de la variante elegida o, si no tiene, la del producto. Si no hay ninguna foto, se envía solo texto.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
