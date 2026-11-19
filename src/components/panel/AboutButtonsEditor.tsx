import { useRef, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Copy,
  GripVertical,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaDropZone } from "@/components/MediaDropZone";
import { UnifiedButton } from "@/components/UnifiedButton";
import { useSiteContent } from "@/hooks/use-site-content";
import { parseAboutButtons, type AboutButtonItem } from "@/lib/about-buttons";
import { accentPalette } from "@/lib/hero-stats";
import {
  BUTTON_ICON_SHAPES,
  ICON_SHAPE_LABELS,
  type ButtonIconShape,
} from "@/lib/product-buttons";
import { SITE_INTERNAL_PAGES } from "@/lib/site-pages";
import { getActiveTheme } from "@/lib/theme";
import { getWhatsAppPayloadForButton } from "@/lib/whatsapp-buttons";

function shortMediaName(url?: string): string {
  if (!url) return "logo Will (/logo.png)";
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "imagen";
    return last.slice(0, 35);
  } catch {
    return url.split("/").pop()?.split("?")[0]?.slice(0, 35) || "imagen";
  }
}

function SortableAboutButtonItemCard({
  button,
  index,
  palette,
  onUpdate,
  onDuplicate,
  onRemove,
  canToggle,
}: {
  button: AboutButtonItem;
  index: number;
  palette: Array<{ id: string; name: string; hex: string }>;
  onUpdate: (patch: Partial<AboutButtonItem>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canToggle: () => boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: button.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const buttonLabel = button.text?.trim() || `Botón #${index + 1}`;
  const { content } = useSiteContent();

  const textColor = button.text_color || "";
  const customHex = button.custom_hex || "";
  const shadeNum =
    button.shade !== undefined ? Math.max(0, Math.min(100, button.shade)) : undefined;
  const buttonWidth = button.width || "auto";
  const mediaMode = button.media_mode || "fill";
  const mediaUrl = button.media_url || "";
  const mediaFit = button.media_fit || "cover";
  const iconPos = button.icon_position || "none";
  const iconUrl = button.icon_url || "";
  const iconShape = button.icon_shape || "circle";
  const actionType = button.action_type || "link";
  const actionValue = button.action_value || "";
  const whatsappNumber = button.whatsapp_number || "";
  const whatsappMsg = button.whatsapp_message || "";
  const whatsappImageUrl = button.whatsapp_image_url || "";

  const isVid = /\.(mp4|webm|quicktime)($|\?)/i.test(mediaUrl);
  const isGif = /\.gif($|\?)/i.test(mediaUrl);
  const isLottie = /\.json($|\?)/i.test(mediaUrl);
  const animType = isVid ? "video" : isGif ? "gif" : isLottie ? "lottie" : mediaUrl ? "image" : "none";

  const shortKey = index === 0 ? "nosotros" : `n${index + 1}`;

  const payload = getWhatsAppPayloadForButton(
    {
      whatsapp_message: whatsappMsg,
      whatsapp_image_logic: button.whatsapp_image_logic || "auto",
      whatsapp_image_url: whatsappImageUrl,
      whatsapp_image_key: shortKey,
    },
    mediaUrl || content?.about_image_url || "",
    content?.site_logo_url,
    "Hola Will Design 3D, me interesa conocer más sobre ustedes.",
    content?.whatsapp_default_message || "",
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-2xl border bg-card shadow-2xs transition ${
        isDragging
          ? "z-20 border-primary bg-primary/10 shadow-xl ring-2 ring-primary"
          : "border-border hover:border-border/80"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => {
          if (!canToggle()) return;
          setIsOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((o) => !o);
          }
        }}
        className={`flex items-center gap-3 p-3 transition hover:bg-muted/30 cursor-pointer select-none ${
          isOpen ? "bg-muted/15" : ""
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Arrastrar ${buttonLabel}`}
          className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition shrink-0"
          title="Arrastrar para reordenar botón de Nosotros"
        >
          <GripVertical className="h-5 w-5 text-primary" />
        </button>

        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0 tabular-nums">
          #{index + 1}
        </span>

        <span className="text-sm font-bold flex-1 min-w-0 text-foreground flex items-center gap-2 truncate">
          <Layers className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="truncate">{buttonLabel}</span>
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            aria-label={`Duplicar ${buttonLabel}`}
            className="h-8 w-8 text-primary hover:bg-primary/10 shrink-0"
            title="Duplicar este botón"
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Eliminar ${buttonLabel}`}
            className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
            title="Eliminar este botón"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-6 p-4 border-t border-border/60 bg-card">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Vista previa en vivo:
                </span>
                <UnifiedButton
                  button={{
                    id: button.id,
                    text: button.text || "Vista Previa",
                    action_type: actionType === "cotizador" ? "link" : (actionType as any),
                    action_value: actionValue || "/nosotros",
                    whatsapp_message: whatsappMsg,
                    text_color: textColor || undefined,
                    custom_hex:
                      customHex || (index === 0 ? "var(--brand-orange)" : "var(--brand-teal)"),
                    media_url: mediaMode === "fill" ? mediaUrl : undefined,
                    media_mode: mediaMode,
                    icon_url: iconUrl || (mediaMode === "icon" ? mediaUrl : undefined),
                    icon_position:
                      iconPos !== "none" ? iconPos : mediaMode === "icon" ? "left" : "none",
                    animation_type: animType as any,
                    variant: index === 0 ? "default" : "secondary",
                    width: buttonWidth,
                    position: "left",
                    opacity: 100,
                    shade: shadeNum,
                    media_fit: mediaFit,
                    icon_shape: iconShape,
                  }}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Texto visible del Botón</Label>
                <Input
                  value={button.text || ""}
                  onChange={(e) => onUpdate({ text: e.target.value })}
                  placeholder="Ej: Conoce más sobre nosotros o Cotizar Proyecto"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                    Sección A: Diseño y Animación
                  </h4>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Color del Texto (Código HEX)</span>
                      {textColor && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full border border-border"
                            style={{ backgroundColor: textColor }}
                          />
                          {textColor}
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={textColor && /^#[0-9A-Fa-f]{6}$/.test(textColor) ? textColor : "#ffffff"}
                        onChange={(e) => onUpdate({ text_color: e.target.value })}
                        className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
                        title="Elegir color visualmente"
                      />
                      <Input
                        value={textColor}
                        onChange={(e) => onUpdate({ text_color: e.target.value })}
                        placeholder="Ej: #ffffff, #000000, #fbbf24"
                        className="text-xs font-mono uppercase"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Vacío = contraste automático según fondo o fondo vivo.
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Color de fondo del Botón</span>
                      {customHex && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full border border-border"
                            style={{ backgroundColor: customHex }}
                          />
                          {customHex}
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : "#f97316"}
                        onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                        className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
                        title="Elegir color de fondo"
                      />
                      <Input
                        value={customHex}
                        onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                        placeholder="Ej: #f97316 (vacío = color de marca)"
                        className="text-xs font-mono uppercase"
                      />
                    </div>
                    {palette.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Paleta del tema:
                        </span>
                        {accentPalette(palette).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onUpdate({ custom_hex: p.hex })}
                            className="h-5 px-1.5 rounded text-[10px] font-bold border border-border flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
                            style={{ backgroundColor: `${p.hex}25`, color: p.hex }}
                            title={p.name}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: p.hex }}
                            />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Sombreado / Contraste (shade)</Label>
                      <span className="text-xs font-mono font-bold text-primary">
                        {shadeNum === undefined ? "Auto" : `${shadeNum}%`}
                      </span>
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => onUpdate({ shade: undefined })}
                      >
                        Auto
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Capa oscura entre el fondo y el texto. 0% = sin sombreado.
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Cobertura / Ancho del botón</Label>
                    <Select
                      value={buttonWidth}
                      onValueChange={(val: "auto" | "full") => onUpdate({ width: val })}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Ancho automático (ajustado al texto)</SelectItem>
                        <SelectItem value="full">Ancho completo 100% (bloque total)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Controla si el botón se expande a todo lo ancho o según su texto.
                    </p>
                  </div>

                  <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Fondo Animado / Relleno Vivo (Llenar Botón Completo)
                      </Label>
                      <Select
                        value={mediaMode}
                        onValueChange={(val: "fill" | "none") => onUpdate({ media_mode: val })}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
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
                          onChange={(url) => onUpdate({ media_url: url })}
                        />
                        <div>
                          <Label className="text-xs font-semibold">
                            Espacio que cubre el fondo animado
                          </Label>
                          <Select
                            value={mediaFit}
                            onValueChange={(val: "cover" | "contain" | "fill") =>
                              onUpdate({ media_fit: val })
                            }
                          >
                            <SelectTrigger className="mt-1 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cover">
                                Cubrir todo el botón (recorta bordes)
                              </SelectItem>
                              <SelectItem value="contain">
                                Ajustar al centro (se ve completa)
                              </SelectItem>
                              <SelectItem value="fill">Estirar para llenar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-secondary" />
                        Ícono o Miniatura dentro del Botón
                      </Label>
                      <Select
                        value={iconPos}
                        onValueChange={(val: "none" | "left" | "right") =>
                          onUpdate({ icon_position: val })
                        }
                      >
                        <SelectTrigger className="h-7 text-[11px] w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin ícono</SelectItem>
                          <SelectItem value="left">A la izquierda</SelectItem>
                          <SelectItem value="right">A la derecha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Muestra una figura geométrica con imagen/ícono junto al texto.
                    </p>
                    {iconPos !== "none" && (
                      <>
                        <MediaDropZone
                          value={iconUrl}
                          onChange={(url) => onUpdate({ icon_url: url })}
                        />
                        <div>
                          <Label className="text-xs font-semibold">Forma del ícono</Label>
                          <Select
                            value={iconShape}
                            onValueChange={(val: ButtonIconShape) =>
                              onUpdate({ icon_shape: val })
                            }
                          >
                            <SelectTrigger className="mt-1 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BUTTON_ICON_SHAPES.map((shape) => (
                                <SelectItem key={shape} value={shape}>
                                  {ICON_SHAPE_LABELS[shape]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                    Sección B: Acción al Pulsar (Comportamiento del Botón)
                  </h4>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold">
                      ¿Qué acción debe ejecutar este botón?
                    </Label>
                    <Select
                      value={(() => {
                        if (actionType === "whatsapp") return "whatsapp";
                        if (actionType === "cotizador" || actionValue === "/cotizador")
                          return "/cotizador";
                        const matchedInternal = SITE_INTERNAL_PAGES.find(
                          (p) => p.path === actionValue,
                        );
                        if (matchedInternal) return matchedInternal.path;
                        return "custom_link";
                      })()}
                      onValueChange={(val) => {
                        if (val === "whatsapp") {
                          onUpdate({ action_type: "whatsapp" });
                        } else if (val === "custom_link") {
                          const isKnownInternal = SITE_INTERNAL_PAGES.some(
                            (p) => p.path === actionValue,
                          );
                          onUpdate({
                            action_type: "link",
                            action_value: isKnownInternal ? "" : actionValue,
                          });
                        } else {
                          onUpdate({
                            action_type: val === "/cotizador" ? "cotizador" : "link",
                            action_value: val,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue placeholder="Selecciona una acción o página de destino" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Páginas Oficiales del Sitio
                        </div>
                        {SITE_INTERNAL_PAGES.map((page) => (
                          <SelectItem key={page.path} value={page.path}>
                            {page.label} ({page.path})
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border/50">
                          Otras Acciones
                        </div>
                        <SelectItem value="whatsapp">
                          💬 Abrir Chat de WhatsApp con Mensaje Personalizado
                        </SelectItem>
                        <SelectItem value="custom_link">
                          🔗 Enlace Personalizado o URL Externa (https://...)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {actionType !== "whatsapp" &&
                    (() => {
                      const matchedPage = SITE_INTERNAL_PAGES.find(
                        (p) =>
                          p.path === actionValue ||
                          (actionType === "cotizador" && p.path === "/cotizador"),
                      );

                      if (matchedPage) {
                        return (
                          <div className="sm:col-span-2 rounded-lg bg-background/50 border border-border/60 p-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
                            <div>
                              <span>Redirección interna configurada a: </span>
                              <span className="font-semibold text-foreground">
                                {matchedPage.label}
                              </span>{" "}
                              <code className="font-mono text-primary font-bold">
                                ({matchedPage.path})
                              </code>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="sm:col-span-2">
                          <Label className="text-xs font-semibold">
                            Enlace o URL de Destino Personalizada
                          </Label>
                          <Input
                            value={actionValue}
                            onChange={(e) =>
                              onUpdate({ action_value: e.target.value, action_type: "link" })
                            }
                            placeholder="Ej: https://instagram.com/willdesign3d o /nosotros"
                            className="mt-1 text-xs"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Ingresa una URL externa completa con{" "}
                            <code className="text-xs font-mono">https://</code> o una ruta interna personalizada.
                          </p>
                        </div>
                      );
                    })()}
                </div>

                {actionType === "whatsapp" && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 space-y-4 mt-3">
                    <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <h5 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Parámetros de WhatsApp
                      </h5>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label className="text-xs font-semibold">
                          Número de WhatsApp (Opcional, vacío = WhatsApp de la marca)
                        </Label>
                        <Input
                          value={whatsappNumber}
                          onChange={(e) => onUpdate({ whatsapp_number: e.target.value })}
                          placeholder="573156724474 (solo números con código de país)"
                          className="mt-1 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-semibold">
                          Texto o Plantilla del Mensaje de WhatsApp
                        </Label>
                        <Textarea
                          rows={2}
                          value={whatsappMsg}
                          onChange={(e) => onUpdate({ whatsapp_message: e.target.value })}
                          placeholder="Hola Will Design 3D, me interesa conocer más sobre ustedes..."
                          className="text-xs resize-y"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Al subir una imagen abajo, se adjunta automáticamente al mensaje de WhatsApp sin tener que escribir comandos.
                        </p>
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            Imagen Específica que Acompaña el Enlace en WhatsApp
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            Drag & Drop o Explorar Dispositivo
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Sube una foto JPG, PNG o WEBP de cualquier tamaño: se comprime automáticamente a &lt;280KB.
                        </p>
                        <MediaDropZone
                          forWhatsapp
                          value={whatsappImageUrl}
                          onChange={(url) => onUpdate({ whatsapp_image_url: url })}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        {whatsappImageUrl ? (
                          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                Previsualización activa: Se incluirá enlace corto con tu foto
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Al enviar el mensaje por WhatsApp, se adjuntará el enlace corto Open Graph{" "}
                                <code className="text-[10px] font-mono font-bold">/r/{shortKey}</code>{" "}
                                para mostrar la tarjeta con la foto.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                Mensaje limpio: Se enviará solo texto plano
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Como no has configurado ninguna foto arriba, WhatsApp enviará exclusivamente el texto del mensaje sin enlaces ni tarjetas.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-1 text-xs">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          💬 Previsualización del enlace/mensaje que se enviará:
                        </span>
                        <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] bg-background/50 p-2 rounded-lg border border-emerald-500/20">
                          {payload.formattedText ||
                            "Hola Will Design 3D, me interesa conocer más sobre ustedes."}
                        </p>
                        <p className="text-[10px] text-emerald-700/90 dark:text-emerald-300/90 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                          {payload.mediaToSend ? (
                            <>
                              <span>
                                📎 Adjunto a enviar:{" "}
                                <strong>{shortMediaName(payload.mediaToSend)}</strong>
                              </span>
                              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">
                                Enlace ultra corto /r activo ✓
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              📄 Solo texto plano (sin adjunto ni enlace)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AboutButtonsEditor({
  values,
  setValues,
}: {
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const { content } = useSiteContent();
  const activeTheme = getActiveTheme(content);
  const palette = activeTheme.colors.palette || [];

  const buttons = parseAboutButtons(values);

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

  function syncLegacyKeys(updatedList: AboutButtonItem[]): Record<string, string> {
    const normalizedList = updatedList.map((b) => ({
      ...b,
      media_fit: b.media_fit || "cover",
    }));

    const patch: Record<string, string> = {
      about_buttons: JSON.stringify(normalizedList),
    };

    const b1 = normalizedList[0];
    if (b1) {
      patch.about_cta_text = b1.text || "";
      patch.about_cta_url = b1.action_value || "";
      patch.about_cta_action_type = b1.action_type || "link";
      patch.about_cta_whatsapp_message = b1.whatsapp_message || "";
      patch.about_cta_whatsapp_image_url = b1.whatsapp_image_url || "";
      patch.about_cta_whatsapp_image_logic = b1.whatsapp_image_logic || "auto";
      patch.about_cta_text_color = b1.text_color || "";
      patch.about_cta_custom_hex = b1.custom_hex || "";
      patch.about_cta_shade = b1.shade !== undefined ? String(b1.shade) : "";
      patch.about_cta_media_url = b1.media_url || "";
      patch.about_cta_media_mode = b1.media_mode || "fill";
      patch.about_cta_media_fit = b1.media_fit || "cover";
      patch.about_cta_icon_url = b1.icon_url || "";
      patch.about_cta_icon_position = b1.icon_position || "none";
      patch.about_cta_icon_shape = b1.icon_shape || "circle";
      patch.about_cta_width = b1.width || "auto";
    }

    return patch;
  }

  function handleUpdateButton(id: string, patch: Partial<AboutButtonItem>) {
    const updated = buttons.map((b) => (b.id === id ? { ...b, ...patch } : b));
    const sync = syncLegacyKeys(updated);
    setValues((v) => ({ ...v, ...sync }));
  }

  function handleDuplicateButton(id: string) {
    const idx = buttons.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const target = buttons[idx];
    const cloned: AboutButtonItem = {
      ...target,
      id: `about_btn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: target.text ? `${target.text} (Copia)` : "Nuevo Botón",
    };
    const next = [...buttons];
    next.splice(idx + 1, 0, cloned);
    const sync = syncLegacyKeys(next);
    setValues((v) => ({ ...v, ...sync }));
    toast.success("Botón duplicado con éxito");
  }

  function handleRemoveButton(id: string) {
    if (buttons.length <= 1) {
      toast.error("Debe haber al menos un botón en Nosotros");
      return;
    }
    const updated = buttons.filter((b) => b.id !== id);
    const sync = syncLegacyKeys(updated);
    setValues((v) => ({ ...v, ...sync }));
    toast.success("Botón eliminado de Nosotros");
  }

  function handleAddButton() {
    const newBtn: AboutButtonItem = {
      id: `about_btn_${Date.now()}`,
      text: "Nuevo Botón",
      action_type: "whatsapp",
      action_value: "",
      custom_hex: "var(--brand-teal)",
      shade: 0,
      width: "auto",
      media_mode: "fill",
      media_fit: "cover",
      icon_position: "none",
    };
    const updated = [...buttons, newBtn];
    const sync = syncLegacyKeys(updated);
    setValues((v) => ({ ...v, ...sync }));
    toast.success("Nuevo botón añadido a Nosotros");
  }

  function handleDragEnd(event: DragEndEvent) {
    markJustDragged();
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = buttons.findIndex((b) => b.id === activeId);
    const newIndex = buttons.findIndex((b) => b.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      const moved = arrayMove(buttons, oldIndex, newIndex);
      const sync = syncLegacyKeys(moved);
      setValues((v) => ({ ...v, ...sync }));
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <Label className="text-sm font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Botones de Acción de Nosotros (Ilimitados con Drag & Drop)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Se muestran en el Inicio (#nosotros) y en el encabezado de /nosotros. Arrastra para reordenar o haz clic para editar.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleAddButton}
          className="text-xs font-bold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Agregar Botón
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => {
          justDraggedRef.current = false;
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={markJustDragged}
      >
        <SortableContext
          items={buttons.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {buttons.map((b, idx) => (
              <SortableAboutButtonItemCard
                key={b.id}
                button={b}
                index={idx}
                palette={palette}
                canToggle={() => !justDraggedRef.current}
                onUpdate={(patch) => handleUpdateButton(b.id, patch)}
                onDuplicate={() => handleDuplicateButton(b.id)}
                onRemove={() => handleRemoveButton(b.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
