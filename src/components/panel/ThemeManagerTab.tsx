import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Paintbrush,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AMBIENT_EFFECT_LABELS,
  PRESET_THEMES,
  THEME_BACKGROUND_FIT_LABELS,
  THEME_BACKGROUND_TYPE_LABELS,
  THEME_BUTTON_STYLE_LABELS,
  THEME_RADIUS_TOKENS,
  clampAmbientIntensity,
  clampOverlayOpacity,
  ensureThemePalette,
  normalizeTheme,
  resolveThemes,
  type AmbientEffectType,
  type ColorToken,
  type SiteTheme,
  type ThemeAnimation,
  type ThemeBackgroundFit,
  type ThemeBackgroundType,
  type ThemeBorderRadius,
  type ThemeButtonStyle,
} from "@/lib/theme";

function SortableColorRow({
  token,
  onUpdate,
  onDelete,
}: {
  token: ColorToken;
  onUpdate: (id: string, patch: Partial<ColorToken>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: token.id,
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
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
        title="Arrastrar para reordenar color"
        aria-label={`Reordenar color ${token.name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border shadow-inner">
        <input
          type="color"
          value={token.hex.startsWith("#") ? token.hex : "#000000"}
          onChange={(e) => onUpdate(token.id, { hex: e.target.value })}
          className="absolute -inset-2 h-14 w-14 cursor-pointer border-0"
          aria-label={`Selector de color ${token.name}`}
        />
      </div>

      <div className="flex-1 min-w-[140px]">
        <Input
          type="text"
          value={token.name}
          onChange={(e) => onUpdate(token.id, { name: e.target.value })}
          placeholder="Nombre del color (Ej: Rojo Acento)"
          className="h-9 text-xs font-semibold"
        />
      </div>

      <div className="w-28 shrink-0">
        <Input
          type="text"
          value={token.hex}
          onChange={(e) => onUpdate(token.id, { hex: e.target.value })}
          placeholder="#FF0000"
          className="h-9 text-xs font-mono"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(token.id)}
        className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        title="Eliminar color de la paleta"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PaletteEditor({
  palette,
  onChange,
}: {
  palette: ColorToken[];
  onChange: (newPalette: ColorToken[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleAddColor() {
    const nextId = `color_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newColor: ColorToken = {
      id: nextId,
      name: `Color ${palette.length + 1}`,
      hex: "#3b82f6",
    };
    onChange([...palette, newColor]);
    toast.success("Nuevo color añadido a la paleta");
  }

  function handleUpdateColor(id: string, patch: Partial<ColorToken>) {
    onChange(palette.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function handleDeleteColor(id: string) {
    if (palette.length <= 1) {
      toast.error("El tema debe tener al menos un color en la paleta");
      return;
    }
    onChange(palette.filter((c) => c.id !== id));
    toast.success("Color eliminado");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = palette.findIndex((c) => c.id === active.id);
    const newIndex = palette.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(arrayMove(palette, oldIndex, newIndex));
    }
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={palette.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {palette.map((token) => (
              <SortableColorRow
                key={token.id}
                token={token}
                onUpdate={handleUpdateColor}
                onDelete={handleDeleteColor}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddColor}
        className="mt-2 text-xs font-bold"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar color a la paleta
      </Button>
    </div>
  );
}

function ThemeColorControl({
  label,
  hint,
  value,
  fallback,
  onChange,
  onReset,
}: {
  label: string;
  hint?: string;
  value?: string;
  fallback: string;
  onChange: (hex: string) => void;
  onReset?: () => void;
}) {
  const effective = value && value.trim() ? value.trim() : fallback;
  const pickerHex =
    effective.startsWith("#") && (effective.length === 7 || effective.length === 4)
      ? effective
      : fallback;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-bold text-foreground">{label}</Label>
        {onReset && value && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            title="Restaurar valor automático"
          >
            <RotateCcw className="h-3 w-3" /> Auto
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border">
          <input
            type="color"
            value={pickerHex}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="absolute -inset-2 h-12 w-12 cursor-pointer border-0"
          />
        </div>
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Automático (${fallback})`}
          className="h-8 text-xs font-mono"
        />
      </div>
    </div>
  );
}

export function ThemeManagerTab({
  values,
  onChange,
  onUploadMedia,
  uploadingKey,
  onSaveAppearance,
  saving = false,
}: {
  values: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
  onUploadMedia: (key: string, file: File) => Promise<string | null>;
  uploadingKey: string | null;
  onSaveAppearance?: (patch?: Record<string, string>) => Promise<void> | void;
  saving?: boolean;
}) {
  const activeThemeId = values.active_theme_id || "default";
  const themes = resolveThemes(values.custom_themes);
  const [editingTheme, setEditingTheme] = useState<SiteTheme | null>(null);
  const editorCardRef = useRef<HTMLDivElement | null>(null);

  const activeTheme = normalizeTheme(
    themes.find((t) => t.id === activeThemeId) || PRESET_THEMES[0],
  );
  const activePalette = ensureThemePalette(activeTheme.colors).palette;
  const activeBgLabel = THEME_BACKGROUND_TYPE_LABELS[activeTheme.background?.type ?? "solid"];
  const activeRadiusLabel =
    THEME_RADIUS_TOKENS[activeTheme.buttonStyle.globalRadius ?? "default"].label;
  const activeBtnStyleLabel =
    THEME_BUTTON_STYLE_LABELS[activeTheme.buttonStyle.visualStyle ?? "solid"];

  function scrollToEditor() {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      editorCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectTheme(id: string) {
    onChange({ active_theme_id: id });
    const target = themes.find((t) => t.id === id);
    if (target && !target.isPreset && editingTheme) {
      setEditingTheme(normalizeTheme(target));
    }
    toast.success("Tema activado globalmente");
  }

  function handleCreateTheme(baseTheme?: SiteTheme, customName?: string) {
    const newId = `custom_${Date.now()}`;
    const baseNormalized = baseTheme ? normalizeTheme(baseTheme) : normalizeTheme(PRESET_THEMES[0]);
    const resolvedName =
      customName || (baseTheme ? `${baseTheme.name} (Copia)` : "Nuevo Tema Libre Multimedia");

    const newTheme = normalizeTheme({
      id: newId,
      name: resolvedName,
      description: baseTheme
        ? `Versión personalizada basada en ${baseTheme.name}`
        : "Tema personalizado libre con fondos multimedia, velo de contraste y colores de texto",
      isPreset: false,
      colors: ensureThemePalette(baseNormalized.colors),
      background: baseNormalized.background
        ? { ...baseNormalized.background }
        : { type: "solid", mediaUrl: "", fit: "cover", overlayOpacity: 0, overlayColor: "#000000" },
      buttonStyle: { ...baseNormalized.buttonStyle },
      ambient: baseNormalized.ambient ? { ...baseNormalized.ambient } : { effect: "none", intensity: 55 },
      customCss: baseNormalized.customCss || "",
    });
    const customList = themes.filter((t) => !t.isPreset);
    const updatedCustom = [...customList, newTheme];
    onChange({
      custom_themes: JSON.stringify(updatedCustom),
      active_theme_id: newId,
    });
    setEditingTheme(newTheme);
    scrollToEditor();
    toast.success(
      customName
        ? `Se creó tu copia editable «${resolvedName}» lista para personalizar`
        : "Tema creado y activado",
    );
  }

  function handleCustomizeActiveTheme() {
    if (activeTheme.isPreset) {
      handleCreateTheme(activeTheme, "Mi Tema Personalizado");
      return;
    }
    setEditingTheme(activeTheme);
    scrollToEditor();
  }

  function handleSaveEditingTheme(updated: SiteTheme) {
    const p = updated.colors.palette;
    const brandOrange = p.find((c) => c.id === "brandOrange")?.hex || p[0]?.hex || updated.colors.brandOrange;
    const brandTeal = p.find((c) => c.id === "brandTeal")?.hex || p[1]?.hex || updated.colors.brandTeal;
    const brandWine = p.find((c) => c.id === "brandWine")?.hex || p[2]?.hex || updated.colors.brandWine;
    const background = p.find((c) => c.id === "background")?.hex || p[3]?.hex || updated.colors.background;

    const normalizedTheme = normalizeTheme({
      ...updated,
      colors: {
        ...updated.colors,
        brandOrange,
        brandTeal,
        brandWine,
        background,
      },
    });

    const customList = themes.filter((t) => !t.isPreset);
    const nextCustom = customList.map((t) => (t.id === normalizedTheme.id ? normalizedTheme : t));
    if (!customList.some((t) => t.id === normalizedTheme.id)) {
      nextCustom.push(normalizedTheme);
    }
    onChange({ custom_themes: JSON.stringify(nextCustom) });
    setEditingTheme(normalizedTheme);
  }

  async function handlePersistNow() {
    if (editingTheme) {
      handleSaveEditingTheme(editingTheme);
    }
    if (onSaveAppearance) {
      await onSaveAppearance();
    } else {
      toast.success("Cambios de apariencia guardados");
    }
  }

  function handleDeleteTheme(id: string) {
    const nextCustom = themes.filter((t) => !t.isPreset && t.id !== id);
    const nextActive = activeThemeId === id ? "default" : activeThemeId;
    onChange({
      custom_themes: JSON.stringify(nextCustom),
      active_theme_id: nextActive,
    });
    if (editingTheme?.id === id) setEditingTheme(null);
    toast.success("Tema eliminado");
  }

  async function handleUploadBackgroundMedia(file: File) {
    if (!editingTheme) return;
    const url = await onUploadMedia(`theme-bg-${editingTheme.id}`, file);
    if (!url) return;
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
    const isGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
    const inferredType: ThemeBackgroundType = isVideo
      ? "video"
      : isGif
        ? "gif"
        : editingTheme.background?.type === "pattern"
          ? "pattern"
          : "image";

    handleSaveEditingTheme({
      ...editingTheme,
      background: {
        ...editingTheme.background,
        type: inferredType,
        mediaUrl: url,
        fit: inferredType === "pattern" ? "repeat" : editingTheme.background?.fit ?? "cover",
        overlayOpacity:
          typeof editingTheme.background?.overlayOpacity === "number" &&
          editingTheme.background.overlayOpacity > 0
            ? editingTheme.background.overlayOpacity
            : 45,
        overlayColor: editingTheme.background?.overlayColor || "#000000",
      },
    });
  }

  async function handleUploadButtonMedia(file: File) {
    if (!editingTheme) return;
    const url = await onUploadMedia(`theme-btn-${editingTheme.id}`, file);
    if (!url) return;
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
    const isGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
    const isLottie = file.type === "application/json" || /\.json$/i.test(file.name);

    handleSaveEditingTheme({
      ...editingTheme,
      buttonStyle: {
        ...editingTheme.buttonStyle,
        mediaUrl: url,
        mediaType: isVideo ? "video" : isGif ? "gif" : isLottie ? "lottie" : "image",
        overlayOpacity: editingTheme.buttonStyle.overlayOpacity ?? 35,
      },
    });
  }

  const editingBg = editingTheme?.background ?? {
    type: "solid" as ThemeBackgroundType,
    mediaUrl: "",
    fit: "cover" as ThemeBackgroundFit,
    overlayOpacity: 0,
    overlayColor: "#000000",
  };
  const bgUploadKey = editingTheme ? `theme-bg-${editingTheme.id}` : "";
  const btnUploadKey = editingTheme ? `theme-btn-${editingTheme.id}` : "";
  const isEditingActive = editingTheme?.id === activeTheme.id;

  return (
    <div className="space-y-6">
      {/* Tarjeta destacada: Tema Activo Actualmente */}
      <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                <Check className="h-3.5 w-3.5" /> Tema Activo Actualmente
              </span>
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {activeTheme.isPreset ? "Preset Oficial" : "Tema Personalizado"}
              </span>
            </div>
            <CardTitle className="text-xl font-black">{activeTheme.name}</CardTitle>
            <CardDescription className="max-w-2xl">
              {activeTheme.description} · Fondo: <strong className="text-foreground">{activeBgLabel}</strong> ·{" "}
              {activeRadiusLabel} · {activeBtnStyleLabel}
            </CardDescription>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {activePalette.slice(0, 6).map((col) => (
                <span
                  key={col.id}
                  className="h-5 w-5 rounded-full border border-black/15 shadow-xs"
                  style={{ background: col.hex }}
                  title={`${col.name}: ${col.hex}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              size="lg"
              onClick={handleCustomizeActiveTheme}
              className="gap-2 font-bold shadow-sm"
            >
              <Paintbrush className="h-4 w-4" />
              {isEditingActive ? "Editando Apariencia Activa" : "🎨 Personalizar Apariencia Activa"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Completo e Intuitivo de Apariencia */}
      {editingTheme && !editingTheme.isPreset && (
        <div ref={editorCardRef}>
          <Card className="border-2 border-primary/40">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Editando Apariencia: {editingTheme.name}</CardTitle>
                <CardDescription>
                  Sube tu video MP4, GIF o imagen de fondo, calibra el velo de contraste y ajusta los colores de títulos, textos y botones con vista previa instantánea.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handlePersistNow()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Guardar cambios de apariencia
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingTheme(null)}>
                  Cerrar editor
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* 1. Identidad */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">Nombre del Tema</Label>
                  <Input
                    value={editingTheme.name}
                    onChange={(e) =>
                      handleSaveEditingTheme({ ...editingTheme, name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Descripción</Label>
                  <Input
                    value={editingTheme.description}
                    onChange={(e) =>
                      handleSaveEditingTheme({ ...editingTheme, description: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* 2. Fondo Global del Sitio + Velo de Contraste */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-primary" /> Fondo Global del Sitio (Video MP4, GIF, Imagen o Mosaico)
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sube directamente tu archivo multimedia y ajusta el Velo de Contraste (0% a 90%) para que los textos siempre se lean perfectamente.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="default" size="sm" type="button">
                      <label className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingKey === bgUploadKey
                          ? "Subiendo archivo…"
                          : "Subir Video MP4, GIF o Imagen"}
                        <input
                          type="file"
                          accept="image/*,video/mp4,video/webm"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleUploadBackgroundMedia(f);
                          }}
                        />
                      </label>
                    </Button>

                    {editingBg.mediaUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleSaveEditingTheme({
                            ...editingTheme,
                            background: { ...editingBg, mediaUrl: "" },
                          })
                        }
                      >
                        Quitar archivo
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold">Tipo de Fondo</Label>
                    <Select
                      value={editingBg.type}
                      onValueChange={(val: ThemeBackgroundType) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          background: {
                            ...editingBg,
                            type: val,
                            fit: val === "pattern" ? "repeat" : editingBg.fit || "cover",
                            overlayOpacity:
                              val === "solid" ? 0 : editingBg.overlayOpacity || 45,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(THEME_BACKGROUND_TYPE_LABELS) as ThemeBackgroundType[]).map(
                          (bt) => (
                            <SelectItem key={bt} value={bt}>
                              {THEME_BACKGROUND_TYPE_LABELS[bt]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Ajuste en Pantalla (Cubrir / Mosaico)</Label>
                    <Select
                      value={editingBg.fit || "cover"}
                      onValueChange={(val: ThemeBackgroundFit) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          background: { ...editingBg, fit: val },
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(THEME_BACKGROUND_FIT_LABELS) as ThemeBackgroundFit[]).map(
                          (bf) => (
                            <SelectItem key={bf} value={bf}>
                              {THEME_BACKGROUND_FIT_LABELS[bf]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {editingBg.type !== "solid" && (
                  <div>
                    <Label className="text-xs font-semibold">
                      URL del medio (opcional si ya subiste un archivo)
                    </Label>
                    <Input
                      value={editingBg.mediaUrl ?? ""}
                      onChange={(e) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          background: { ...editingBg, mediaUrl: e.target.value },
                        })
                      }
                      placeholder="https://… (se completa automáticamente al subir)"
                      className="mt-1 text-xs"
                    />
                  </div>
                )}

                {/* Velo de Contraste (0% - 90%) siempre visible */}
                <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">
                      Color del Velo de Contraste
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border">
                        <input
                          type="color"
                          value={editingBg.overlayColor || "#000000"}
                          onChange={(e) =>
                            handleSaveEditingTheme({
                              ...editingTheme,
                              background: { ...editingBg, overlayColor: e.target.value },
                            })
                          }
                          aria-label="Color del velo de contraste"
                          className="absolute -inset-2 h-12 w-12 cursor-pointer border-0"
                        />
                      </div>
                      <Input
                        value={editingBg.overlayColor || "#000000"}
                        onChange={(e) =>
                          handleSaveEditingTheme({
                            ...editingTheme,
                            background: { ...editingBg, overlayColor: e.target.value },
                          })
                        }
                        className="h-8 w-28 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px]"
                        onClick={() =>
                          handleSaveEditingTheme({
                            ...editingTheme,
                            background: { ...editingBg, overlayColor: "#000000" },
                          })
                        }
                      >
                        Velo oscuro
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px]"
                        onClick={() =>
                          handleSaveEditingTheme({
                            ...editingTheme,
                            background: { ...editingBg, overlayColor: "#ffffff" },
                          })
                        }
                      >
                        Velo claro
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Velo de Contraste (Opacidad 0% – 90%)</span>
                      <span className="font-mono text-primary tabular-nums">
                        {clampOverlayOpacity(editingBg.overlayOpacity, 0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={90}
                      step={5}
                      value={clampOverlayOpacity(editingBg.overlayOpacity, 0)}
                      onChange={(e) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          background: { ...editingBg, overlayOpacity: Number(e.target.value) },
                        })
                      }
                      aria-label="Opacidad del velo de contraste"
                      className="mt-2 w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Colores de Textos, Títulos y Superficies */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Colores de Textos, Títulos y Superficies
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Configura directamente el color de Títulos (--heading-color), Texto General (--foreground), Subtítulos (--muted-foreground) y tarjetas.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ThemeColorControl
                    label="Color de Títulos (--heading-color)"
                    value={editingTheme.colors.headingColor}
                    fallback="#1c1917"
                    onChange={(hex) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, headingColor: hex },
                      })
                    }
                    onReset={() =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, headingColor: undefined },
                      })
                    }
                  />
                  <ThemeColorControl
                    label="Texto General (--foreground)"
                    value={editingTheme.colors.foreground}
                    fallback="#1c1917"
                    onChange={(hex) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, foreground: hex },
                      })
                    }
                    onReset={() =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, foreground: undefined },
                      })
                    }
                  />
                  <ThemeColorControl
                    label="Subtítulos (--muted-foreground)"
                    value={editingTheme.colors.mutedForeground}
                    fallback="#6b7280"
                    onChange={(hex) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, mutedForeground: hex },
                      })
                    }
                    onReset={() =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, mutedForeground: undefined },
                      })
                    }
                  />
                  <ThemeColorControl
                    label="Fondo base (--background)"
                    value={editingTheme.colors.background}
                    fallback="#ffffff"
                    onChange={(hex) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: {
                          ...editingTheme.colors,
                          background: hex,
                          palette: ensureThemePalette(editingTheme.colors).palette.map((c) =>
                            c.id === "background" ? { ...c, hex } : c,
                          ),
                        },
                      })
                    }
                  />
                  <ThemeColorControl
                    label="Fondo de tarjetas"
                    value={editingTheme.colors.card}
                    fallback="#ffffff"
                    onChange={(hex) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, card: hex },
                      })
                    }
                    onReset={() =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, card: undefined },
                      })
                    }
                  />
                  <ThemeColorControl
                    label="Texto dentro de tarjetas"
                    value={editingTheme.colors.cardForeground}
                    fallback="#1c1917"
                    onChange={(hex) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, cardForeground: hex },
                      })
                    }
                    onReset={() =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, cardForeground: undefined },
                      })
                    }
                  />
                  <ThemeColorControl
                    label="Texto en botón principal"
                    value={editingTheme.buttonStyle.textColor ?? editingTheme.colors.primaryForeground}
                    fallback="#ffffff"
                    onChange={(hex) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, primaryForeground: hex },
                        buttonStyle: { ...editingTheme.buttonStyle, textColor: hex },
                      })
                    }
                    onReset={() =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, primaryForeground: undefined },
                        buttonStyle: { ...editingTheme.buttonStyle, textColor: undefined },
                      })
                    }
                  />
                  <ThemeColorControl
                    label="Bordes y separadores"
                    value={editingTheme.colors.border}
                    fallback="#e5e7eb"
                    onChange={(hex) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, border: hex },
                      })
                    }
                    onReset={() =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, border: undefined },
                      })
                    }
                  />
                </div>
              </div>

              {/* 4. Paleta de Colores Dinámica con @dnd-kit */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Paleta de Colores Dinámica (Arrastra para reordenar)
                </h4>
                <PaletteEditor
                  palette={ensureThemePalette(editingTheme.colors).palette}
                  onChange={(newPalette) =>
                    handleSaveEditingTheme({
                      ...editingTheme,
                      colors: {
                        ...editingTheme.colors,
                        palette: newPalette,
                      },
                    })
                  }
                />
              </div>

              {/* 5. Estilo de Botones y Multimedia Opcional */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 space-y-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estilo de Botones, Curvatura y Decoración Opcional
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold">Radio de Curvatura Global (--radius)</Label>
                    <Select
                      value={editingTheme.buttonStyle.globalRadius || "default"}
                      onValueChange={(val: ThemeBorderRadius) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          buttonStyle: { ...editingTheme.buttonStyle, globalRadius: val },
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(THEME_RADIUS_TOKENS) as ThemeBorderRadius[]).map((rk) => (
                          <SelectItem key={rk} value={rk}>
                            {THEME_RADIUS_TOKENS[rk].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Estilo Visual de Botones</Label>
                    <Select
                      value={editingTheme.buttonStyle.visualStyle || "solid"}
                      onValueChange={(val: ThemeButtonStyle) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          buttonStyle: { ...editingTheme.buttonStyle, visualStyle: val },
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(THEME_BUTTON_STYLE_LABELS) as ThemeButtonStyle[]).map((sk) => (
                          <SelectItem key={sk} value={sk}>
                            {THEME_BUTTON_STYLE_LABELS[sk]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Animación de Botones (Opcional)</Label>
                    <Select
                      value={editingTheme.buttonStyle.animation || "none"}
                      onValueChange={(val: ThemeAnimation) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          buttonStyle: { ...editingTheme.buttonStyle, animation: val },
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin animación</SelectItem>
                        <SelectItem value="neon_glow">Neón Cyberpunk</SelectItem>
                        <SelectItem value="cyber_pulse">Pulso Dinámico</SelectItem>
                        <SelectItem value="shimmer">Brillo Shimmer</SelectItem>
                        <SelectItem value="festive_sparkle">Destello Festivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Efecto Ambiental Extra (Opcional)</Label>
                    <Select
                      value={editingTheme.ambient?.effect || "none"}
                      onValueChange={(val: AmbientEffectType) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          ambient: {
                            effect: val,
                            intensity: clampAmbientIntensity(editingTheme.ambient?.intensity),
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(AMBIENT_EFFECT_LABELS) as AmbientEffectType[]).map((ak) => (
                          <SelectItem key={ak} value={ak}>
                            {AMBIENT_EFFECT_LABELS[ak]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {editingTheme.ambient?.effect && editingTheme.ambient.effect !== "none" && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Intensidad del Efecto Ambiental</span>
                      <span className="font-mono text-primary">
                        {clampAmbientIntensity(editingTheme.ambient.intensity)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={clampAmbientIntensity(editingTheme.ambient.intensity)}
                      onChange={(e) =>
                        handleSaveEditingTheme({
                          ...editingTheme,
                          ambient: {
                            effect: editingTheme.ambient?.effect ?? "none",
                            intensity: Number(e.target.value),
                          },
                        })
                      }
                      className="mt-2 w-full accent-primary cursor-pointer"
                    />
                  </div>
                )}

                {/* Fondo multimedia opcional en botones */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Fondo Multimedia en Botones (Opcional)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Sube una textura, GIF, video o animación Lottie para aplicarla como fondo global de los botones.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm" type="button">
                        <label className="cursor-pointer">
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                          {uploadingKey === btnUploadKey
                            ? "Subiendo…"
                            : "Subir fondo multimedia de botón"}
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/webm,application/json,.json"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void handleUploadButtonMedia(f);
                            }}
                          />
                        </label>
                      </Button>
                      {editingTheme.buttonStyle.mediaUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleSaveEditingTheme({
                              ...editingTheme,
                              buttonStyle: { ...editingTheme.buttonStyle, mediaUrl: "" },
                            })
                          }
                        >
                          Quitar
                        </Button>
                      )}
                    </div>
                  </div>

                  {editingTheme.buttonStyle.mediaUrl && (
                    <div className="grid gap-3 sm:grid-cols-3 pt-1">
                      <div>
                        <Label className="text-[11px] font-semibold">Tipo de Medio</Label>
                        <Select
                          value={editingTheme.buttonStyle.mediaType || "image"}
                          onValueChange={(val: "image" | "gif" | "video" | "lottie") =>
                            handleSaveEditingTheme({
                              ...editingTheme,
                              buttonStyle: { ...editingTheme.buttonStyle, mediaType: val },
                            })
                          }
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image">Imagen</SelectItem>
                            <SelectItem value="gif">GIF</SelectItem>
                            <SelectItem value="video">Video MP4/WebM</SelectItem>
                            <SelectItem value="lottie">Lottie JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold">Ajuste</Label>
                        <Select
                          value={editingTheme.buttonStyle.mediaFit || "cover"}
                          onValueChange={(val: "cover" | "contain" | "fill") =>
                            handleSaveEditingTheme({
                              ...editingTheme,
                              buttonStyle: { ...editingTheme.buttonStyle, mediaFit: val },
                            })
                          }
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cover">Cubrir (Cover)</SelectItem>
                            <SelectItem value="contain">Contener (Contain)</SelectItem>
                            <SelectItem value="fill">Estirar (Fill)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span>Velo en botón</span>
                          <span className="font-mono text-primary">
                            {editingTheme.buttonStyle.overlayOpacity ?? 35}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={85}
                          step={5}
                          value={editingTheme.buttonStyle.overlayOpacity ?? 35}
                          onChange={(e) =>
                            handleSaveEditingTheme({
                              ...editingTheme,
                              buttonStyle: {
                                ...editingTheme.buttonStyle,
                                overlayOpacity: Number(e.target.value),
                              },
                            })
                          }
                          className="mt-2.5 w-full accent-primary cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Previsualización en Vivo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Previsualización en Vivo (Fondo, Velo, Títulos, Textos y Botones)
                </div>
                <div
                  className="relative overflow-hidden border p-6 transition-all"
                  style={{
                    backgroundColor: editingTheme.colors.background,
                    color: editingTheme.colors.foreground || undefined,
                    borderRadius:
                      THEME_RADIUS_TOKENS[editingTheme.buttonStyle.globalRadius ?? "default"]
                        .cssRadius,
                    borderColor: editingTheme.colors.border || "var(--border)",
                  }}
                >
                  {editingBg.type !== "solid" && editingBg.mediaUrl && (
                    <>
                      {editingBg.type === "video" ||
                      /\.(mp4|webm|mov)(\?|$)/i.test(editingBg.mediaUrl) ? (
                        <video
                          src={editingBg.mediaUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className={`pointer-events-none absolute inset-0 h-full w-full ${
                            editingBg.fit === "contain" ? "object-contain" : "object-cover"
                          }`}
                        />
                      ) : editingBg.type === "pattern" || editingBg.fit === "repeat" ? (
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            backgroundImage: `url("${editingBg.mediaUrl}")`,
                            backgroundRepeat: "repeat",
                            backgroundPosition: "center",
                          }}
                        />
                      ) : (
                        <img
                          src={editingBg.mediaUrl}
                          alt=""
                          className={`pointer-events-none absolute inset-0 h-full w-full ${
                            editingBg.fit === "contain" ? "object-contain" : "object-cover"
                          }`}
                        />
                      )}
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          backgroundColor: editingBg.overlayColor || "#000000",
                          opacity: clampOverlayOpacity(editingBg.overlayOpacity, 45) / 100,
                        }}
                      />
                    </>
                  )}

                  <div className="relative z-10 space-y-4">
                    <div>
                      <h5
                        className="text-lg font-black"
                        style={{
                          color:
                            editingTheme.colors.headingColor ||
                            editingTheme.colors.foreground ||
                            undefined,
                        }}
                      >
                        Título de ejemplo sobre tu fondo
                      </h5>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: editingTheme.colors.mutedForeground || undefined }}
                      >
                        Subtítulo secundario · Verifica aquí la legibilidad del texto antes de guardar.
                      </p>
                    </div>

                    <div
                      className="border p-4"
                      style={{
                        backgroundColor: editingTheme.colors.card || "var(--card)",
                        color:
                          editingTheme.colors.cardForeground ||
                          editingTheme.colors.foreground ||
                          undefined,
                        borderColor: editingTheme.colors.border || "var(--border)",
                        borderRadius:
                          THEME_RADIUS_TOKENS[editingTheme.buttonStyle.globalRadius ?? "default"]
                            .cssRadius,
                      }}
                    >
                      <p className="text-xs font-bold">Tarjeta de contenido de muestra</p>
                      <p className="mt-0.5 text-[11px] opacity-80">
                        Texto dentro de tarjeta con contraste configurable.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="btn-primary unified-theme-btn relative overflow-hidden px-5 py-2.5 text-xs"
                        style={{
                          background: editingTheme.colors.brandOrange,
                          color:
                            editingTheme.buttonStyle.textColor ||
                            editingTheme.colors.primaryForeground ||
                            "#ffffff",
                          borderRadius:
                            THEME_RADIUS_TOKENS[editingTheme.buttonStyle.globalRadius ?? "default"]
                              .buttonRadius,
                        }}
                      >
                        {editingTheme.buttonStyle.mediaUrl &&
                          (editingTheme.buttonStyle.mediaType === "video" ? (
                            <video
                              src={editingTheme.buttonStyle.mediaUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                            />
                          ) : editingTheme.buttonStyle.mediaType !== "lottie" ? (
                            <img
                              src={editingTheme.buttonStyle.mediaUrl}
                              alt=""
                              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                            />
                          ) : null)}
                        {editingTheme.buttonStyle.mediaUrl && (
                          <span
                            className="pointer-events-none absolute inset-0 bg-black"
                            style={{ opacity: (editingTheme.buttonStyle.overlayOpacity ?? 35) / 100 }}
                          />
                        )}
                        <span className="relative z-10">Botón Principal</span>
                      </button>
                      <button
                        type="button"
                        className="btn-outline unified-theme-btn px-5 py-2.5 text-xs"
                        style={{
                          borderColor: editingTheme.colors.brandTeal,
                          color: editingTheme.colors.brandTeal,
                          borderRadius:
                            THEME_RADIUS_TOKENS[editingTheme.buttonStyle.globalRadius ?? "default"]
                              .buttonRadius,
                        }}
                      >
                        Botón Secundario
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón final claro de guardar cambios de apariencia */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <p className="text-xs text-muted-foreground">
                  Los cambios se sincronizan con la configuración global del sitio.
                </p>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => void handlePersistNow()}
                  disabled={saving}
                  className="font-bold"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar cambios de apariencia
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Galería de temas disponibles */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Estudio Libre de Temas Multimedia</CardTitle>
            <CardDescription>
              Explora los temas oficiales o crea temas propios de temporada (Navidad, Black Friday, Aniversario) con fondos multimedia, velo de contraste y colores personalizados.
            </CardDescription>
          </div>
          <Button onClick={() => handleCreateTheme()}>
            <Plus className="mr-1.5 h-4 w-4" /> Crear Tema Libre
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((rawTheme) => {
              const t = normalizeTheme(rawTheme);
              const isActive = t.id === activeThemeId;
              const palette = ensureThemePalette(t.colors).palette;
              const radiusLabel =
                THEME_RADIUS_TOKENS[t.buttonStyle.globalRadius ?? "default"].label;
              const btnStyleLabel = THEME_BUTTON_STYLE_LABELS[t.buttonStyle.visualStyle ?? "solid"];
              const bgLabel = THEME_BACKGROUND_TYPE_LABELS[t.background?.type ?? "solid"];

              return (
                <div
                  key={t.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                    isActive
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm">{t.name}</h3>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        {t.isPreset ? "Oficial" : "Libre"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {t.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {palette.slice(0, 6).map((col) => (
                        <span
                          key={col.id}
                          className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                          style={{ background: col.hex }}
                          title={`${col.name}: ${col.hex}`}
                        />
                      ))}
                    </div>

                    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                      Fondo: {bgLabel} · {radiusLabel} · {btnStyleLabel}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {!isActive ? (
                      <Button size="sm" onClick={() => selectTheme(t.id)}>
                        Activar tema
                      </Button>
                    ) : (
                      <span className="text-xs font-bold text-primary">✓ Activo</span>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateTheme(t)}
                    >
                      {t.isPreset ? "Duplicar y personalizar" : "Duplicar"}
                    </Button>

                    {!t.isPreset && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingTheme(t);
                            scrollToEditor();
                          }}
                        >
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteTheme(t.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
