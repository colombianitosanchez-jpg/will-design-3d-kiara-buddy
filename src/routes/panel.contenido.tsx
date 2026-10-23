import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Upload,
  Check,
  Eye,
  EyeOff,
  Film,
  ArrowUp,
  ArrowDown,
  Trash2,
  Layout,
  Plus,
  GripVertical,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sanitizeWidgetId, parsePhotos, type PortfolioPhoto } from "@/components/InstagramFeed";
import { HomeSectionsOrder } from "@/components/HomeSectionsOrder";
import { parseHomeOrder } from "@/lib/home-sections";
import { ProductMedia, isVideoUrl } from "@/components/ProductMedia";
import { useSiteContent } from "@/hooks/use-site-content";
import { getActiveTheme } from "@/lib/theme";
import { Lottie } from "lottie-react";
import { motion } from "framer-motion";
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

export const Route = createFileRoute("/panel/contenido")({
  ssr: false,
  component: ContenidoAdmin,
});

export type HeroStatItem = {
  id: string;
  k: string;
  v: string;
  action_type?: "none" | "link" | "whatsapp";
  action_value?: string;
  color_id?: string;
  custom_hex?: string;
  media_url?: string;
  animation_type?: "none" | "image" | "video" | "gif" | "lottie";
  animation_style?: string;
};

export function parseHeroStats(values: Record<string, string>): HeroStatItem[] {
  if (values.hero_stats) {
    try {
      const parsed = JSON.parse(values.hero_stats);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
  }

  const legacy: HeroStatItem[] = [];
  for (let i = 1; i <= 6; i++) {
    const k = values[`hero_stat_${i}_k`]?.trim();
    const v = values[`hero_stat_${i}_v`]?.trim();
    if (k || v) {
      legacy.push({
        id: `stat_${i}`,
        k: k || "",
        v: v || "",
        action_type: "none",
        action_value: "",
        animation_type: "none",
      });
    }
  }
  return legacy.length > 0
    ? legacy
    : [
        { id: "stat_1", k: "50×50", v: "cm mínimo", action_type: "none" },
        { id: "stat_2", k: "1.8 m", v: "en una sola pieza", action_type: "none" },
        { id: "stat_3", k: "24/7", v: "atención y cotización", action_type: "none" },
      ];
}

type Row = { key: string; value: string };

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "images" | "switch" | "select" | "order" | "hero_stats";
  help?: string;
  section: string;
  group: string;
  options?: { value: string; label: string }[];
};

const FIELDS: FieldDef[] = [
  // Orden de la Página de Inicio (Home Builder)
  { key: "home_sections_order", label: "Orden de las Secciones del Inicio", type: "order", help: "Arrastra las secciones para decidir qué aparece primero al entrar a la página.", section: "Inicio", group: "Orden de Secciones" },

  // ---------------------------------------------------------------- Home Builder & Hero
  { key: "hero_title", label: "Título del Hero", type: "textarea", section: "Inicio", group: "Hero Principal" },
  { key: "hero_subtitle", label: "Subtítulo del Hero", type: "textarea", section: "Inicio", group: "Hero Principal" },
  {
    key: "hero_image_url",
    label: "Imagen del Hero (Respaldo)",
    type: "image",
    help: "Se usa como respaldo si el Carrusel Hero no tiene diapositivas activas.",
    section: "Inicio",
    group: "Hero Principal",
  },
  { key: "hero_badge_title", label: "Etiqueta Flotante (Pieza destacada)", type: "text", help: "Ej: Escultura 1.8 m — PLA reforzado", section: "Inicio", group: "Hero Principal" },

  // Estadísticas del Hero (Convertidas en Botones de Acción con Drag & Drop)
  {
    key: "hero_stats",
    label: "Botones de Acción y Estadísticas del Hero",
    type: "hero_stats",
    help: "Reordena por Drag & Drop, asigna colores de la paleta del tema, animaciones (Lottie/Video/GIF) y acciones clickeables.",
    section: "Inicio",
    group: "Estadísticas del Hero",
  },

  // Sección Servicios
  { key: "services_section_title", label: "Título Sección Servicios", type: "text", section: "Inicio", group: "Sección Servicios" },
  { key: "services_section_subtitle", label: "Subtítulo Sección Servicios", type: "text", section: "Inicio", group: "Sección Servicios" },

  // Portafolio e Instagram
  { key: "show_manual_gallery", label: "Mostrar Galería Manual de Portafolio", type: "switch", help: "Se muestra si está activo y hay al menos una foto/video subida.", section: "Inicio", group: "Portafolio y Redes" },
  { key: "show_instagram_widget", label: "Mostrar Widget de Instagram en Vivo", type: "switch", help: "Se muestra si está activo y el ID del widget Elfsight es válido.", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_display_order", label: "Orden de Visualización del Portafolio", type: "select", help: "Decide cuál sección del portafolio aparece primero.", section: "Inicio", group: "Portafolio y Redes", options: [
    { value: "manual_first", label: "Fotos manuales primero, luego Instagram" },
    { value: "instagram_first", label: "Instagram primero, luego fotos manuales" },
  ] },
  { key: "portfolio_images", label: "Fotos y Videos del Portafolio Manual", type: "images", help: "Se muestran en el inicio y en /galeria. Admite fotos y videos cortos (hasta 50MB).", section: "Inicio", group: "Portafolio y Redes" },
  { key: "elfsight_instagram_id", label: "ID del Widget de Instagram (Elfsight)", type: "text", help: "Ej: elfsight-app-abc123", section: "Inicio", group: "Portafolio y Redes" },

  // Nosotros
  { key: "about_short", label: "Descripción Corta 'Nosotros'", type: "textarea", help: "Resumen que se muestra en la página principal.", section: "Inicio", group: "Sección Nosotros" },
];

function LottiePreview({ url }: { url: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) setData(json);
      })
      .catch(() => {
        if (isMounted) setData(null);
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!data) return null;
  return <Lottie src={data} autoplay loop className="h-5 w-5" />;
}

function SortableHeroStatCard({
  item,
  index,
  palette,
  onUpdate,
  onRemove,
}: {
  item: HeroStatItem;
  index: number;
  palette: Array<{ id: string; name: string; hex: string }>;
  onUpdate: (patch: Partial<HeroStatItem>) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleUploadMedia(file: File) {
    setUploading(true);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("Supera 50MB");
      const path = `stats/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("site-media").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;

      let detectedType: HeroStatItem["animation_type"] = "image";
      if (file.type.includes("json")) detectedType = "lottie";
      else if (file.type.includes("video")) detectedType = "video";
      else if (file.type.includes("gif")) detectedType = "gif";

      onUpdate({ media_url: signed.data.signedUrl, animation_type: detectedType });
      toast.success("Animación subida para el botón");
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  let resolvedBg = "";
  if (item.color_id === "custom") {
    resolvedBg = item.custom_hex || "";
  } else if (item.color_id) {
    const found = palette.find((p) => p.id === item.color_id);
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
            Botón Estadístico {index + 1}
          </span>
        </div>

        {/* Live Preview Card */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={resolvedBg ? { borderColor: resolvedBg, backgroundColor: `${resolvedBg}10` } : undefined}
            className={`rounded-xl border border-border bg-card px-3 py-2 text-center shadow-2xs min-w-[100px] ${
              item.animation_style && item.animation_style !== "none" ? `theme-anim-${item.animation_style}` : ""
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 font-black text-sm" style={{ color: resolvedBg || "var(--brand-wine)" }}>
              {item.media_url && item.animation_type !== "none" && (
                <span>
                  {item.animation_type === "lottie" ? (
                    <LottiePreview url={item.media_url} />
                  ) : item.animation_type === "video" ? (
                    <video src={item.media_url} autoPlay loop muted playsInline className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <img src={item.media_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                  )}
                </span>
              )}
              {item.k || "50×50"}
            </div>
            <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{item.v || "cm mínimo"}</div>
          </motion.div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            title="Eliminar botón estadístico"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs font-semibold">Valor / Título Destacado (k)</Label>
          <Input
            value={item.k}
            onChange={(e) => onUpdate({ k: e.target.value })}
            placeholder="Ej: 50×50"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold">Descripción Corta (v)</Label>
          <Input
            value={item.v}
            onChange={(e) => onUpdate({ v: e.target.value })}
            placeholder="Ej: cm mínimo"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold">Acción Clickeable</Label>
          <Select
            value={item.action_type || "none"}
            onValueChange={(val: any) => onUpdate({ action_type: val })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin Acción (Texto Estático)</SelectItem>
              <SelectItem value="link">Abrir Enlace / URL</SelectItem>
              <SelectItem value="whatsapp">Abrir Chat de WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {item.action_type && item.action_type !== "none" && (
          <div>
            <Label className="text-xs font-semibold">
              {item.action_type === "link" ? "URL o Ruta de Destino" : "Número de WhatsApp (Opcional)"}
            </Label>
            <Input
              value={item.action_value || ""}
              onChange={(e) => onUpdate({ action_value: e.target.value })}
              placeholder={item.action_type === "link" ? "/cotizador o https://..." : "573156724474"}
              className="mt-1"
            />
          </div>
        )}

        <div>
          <Label className="text-xs font-semibold">Color Acento (Paleta del Tema / HEX)</Label>
          <Select
            value={item.color_id || ""}
            onValueChange={(val) => onUpdate({ color_id: val })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Color del Tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Por Defecto (Burgundy)</SelectItem>
              {palette.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.name} ({col.hex})
                </SelectItem>
              ))}
              <SelectItem value="custom">Color Personalizado (HEX Libre)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {item.color_id === "custom" && (
          <div>
            <Label className="text-xs font-semibold">HEX Libre</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={item.custom_hex?.startsWith("#") ? item.custom_hex : "#f97316"}
                onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded-lg border border-input p-0"
              />
              <Input
                type="text"
                value={item.custom_hex || ""}
                onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                placeholder="#FF0000"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Animación Decorativa
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-semibold">Tipo de Animación</Label>
            <Select
              value={item.animation_type || "none"}
              onValueChange={(val: any) => onUpdate({ animation_type: val })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin Animación</SelectItem>
                <SelectItem value="image">Imagen Fija</SelectItem>
                <SelectItem value="gif">GIF Animado</SelectItem>
                <SelectItem value="video">Video MP4 / WebM</SelectItem>
                <SelectItem value="lottie">Lottie JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Efecto Resplandor</Label>
            <Select
              value={item.animation_style || "none"}
              onValueChange={(val) => onUpdate({ animation_style: val })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin Resplandor</SelectItem>
                <SelectItem value="neon_glow">Neón Cyberpunk ⚡</SelectItem>
                <SelectItem value="cyber_pulse">Pulso Dinámico 💫</SelectItem>
                <SelectItem value="shimmer">Brillo Shimmer ✨</SelectItem>
                <SelectItem value="festive_sparkle">Destello Festivo 🌟</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {item.animation_type && item.animation_type !== "none" && (
          <div>
            <Label className="text-xs font-semibold">URL del Archivo Animado</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={item.media_url || ""}
                onChange={(e) => onUpdate({ media_url: e.target.value })}
                placeholder="https://... .gif, .mp4, .json"
                className="text-xs"
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
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStatsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (newValue: string) => void;
}) {
  const { content } = useSiteContent();
  const activeTheme = getActiveTheme(content);
  const palette = activeTheme.colors.palette || [];
  const items = parseHeroStats({ hero_stats: value });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleUpdateItem(id: string, patch: Partial<HeroStatItem>) {
    const updated = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
    onChange(JSON.stringify(updated));
  }

  function handleRemoveItem(id: string) {
    const updated = items.filter((it) => it.id !== id);
    onChange(JSON.stringify(updated));
  }

  function handleAddItem() {
    const newItem: HeroStatItem = {
      id: `stat_${Date.now()}`,
      k: "Nuevo Valor",
      v: "Descripción",
      action_type: "none",
    };
    onChange(JSON.stringify([...items, newItem]));
    toast.success("Nuevo botón estadístico añadido");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((it) => it.id === active.id);
    const newIndex = items.findIndex((it) => it.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(JSON.stringify(arrayMove(items, oldIndex, newIndex)));
    }
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <SortableHeroStatCard
                key={it.id}
                item={it}
                index={idx}
                palette={palette}
                onUpdate={(patch) => handleUpdateItem(it.id, patch)}
                onRemove={() => handleRemoveItem(it.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="mt-2 text-xs font-bold">
        <Plus className="mr-1.5 h-3.5 w-3.5" /> + Añadir botón estadístico
      </Button>
    </div>
  );
}

function ContenidoAdmin() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("site_content").select("key,value");
    const map: Record<string, string> = {};
    (data as Row[] | null)?.forEach((r) => (map[r.key] = r.value));
    for (const f of FIELDS) if (!(f.key in map)) map[f.key] = "";

    // Migración inicial de hero_stats si no existe en BD
    if (!map.hero_stats) {
      const parsedLegacy = parseHeroStats(map);
      map.hero_stats = JSON.stringify(parsedLegacy);
    }

    setValues(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const lastSaved = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!lastSaved.current) {
      lastSaved.current = values;
      return;
    }
    const changed = FIELDS.filter((f) => (values[f.key] ?? "") !== (lastSaved.current?.[f.key] ?? ""));
    if (!changed.length) return;
    const timer = setTimeout(() => save(changed, values), 800);
    return () => clearTimeout(timer);
  }, [values, loading]);

  async function save(fields: FieldDef[], snapshot: Record<string, string>) {
    setSaving(true);
    try {
      const rows = fields.map((f) => ({
        key: f.key,
        value: snapshot[f.key] ?? "",
        section: f.section,
      }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      lastSaved.current = { ...lastSaved.current, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
    } catch (e) {
      toast.error("No pudimos guardar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function uploadToStorage(key: string, file: File, bucket = "site-media") {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error(`El archivo ${file.name} supera el límite máximo de 50MB.`);
    }
    const path = `content/${key}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (up.error) throw up.error;
    const signed = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signed.error) throw signed.error;
    return signed.data.signedUrl;
  }

  async function uploadImage(key: string, file: File) {
    setUploadingKey(key);
    try {
      const url = await uploadToStorage(key, file);
      setValues((v) => ({ ...v, [key]: url }));
      toast.success("Imagen subida");
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setUploadingKey(null);
    }
  }

  function parseList(raw: string | undefined): PortfolioPhoto[] {
    return parsePhotos(raw);
  }

  async function uploadImages(key: string, files: File[]) {
    setUploadingKey(key);
    try {
      const added: PortfolioPhoto[] = [];
      for (const f of files) {
        const url = await uploadToStorage(key, f, "site-media");
        added.push({ id: crypto.randomUUID(), url, is_visible: true });
      }
      setValues((v) => ({
        ...v,
        [key]: JSON.stringify([...parseList(v[key]), ...added]),
      }));
      toast.success(`${added.length} elemento(s) subido(s)`);
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setUploadingKey(null);
    }
  }

  function removeImageAt(key: string, index: number) {
    setValues((v) => {
      const list = parseList(v[key]).filter((_, i) => i !== index);
      return { ...v, [key]: list.length ? JSON.stringify(list) : "" };
    });
  }

  function movePhotoAt(key: string, index: number, dir: -1 | 1) {
    setValues((v) => {
      const list = parseList(v[key]);
      const target = index + dir;
      if (target < 0 || target >= list.length) return v;
      const next = [...list];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return { ...v, [key]: JSON.stringify(next) };
    });
  }

  function updatePhotoLinkAt(key: string, index: number, link_url: string) {
    setValues((v) => {
      const list = parseList(v[key]).map((p, i) =>
        i === index ? { ...p, link_url: link_url ? link_url : undefined } : p,
      );
      return { ...v, [key]: list.length ? JSON.stringify(list) : "" };
    });
  }

  function togglePhotoAt(key: string, index: number) {
    setValues((v) => {
      const list = parseList(v[key]).map((p, i) =>
        i === index ? { ...p, is_visible: !p.is_visible } : p,
      );
      return { ...v, [key]: list.length ? JSON.stringify(list) : "" };
    });
  }

  function isFlagOn(key: string) {
    const v = (values[key] ?? "").trim().toLowerCase();
    if (!v) return true;
    return !["false", "0", "no", "off"].includes(v);
  }

  function renderField(f: FieldDef) {
    if (f.type === "hero_stats") {
      return (
        <div key={f.key} className="space-y-2">
          <Label className="text-sm font-bold">{f.label}</Label>
          {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          <HeroStatsEditor
            value={values[f.key] ?? ""}
            onChange={(next) => setValues((v) => ({ ...v, [f.key]: next }))}
          />
        </div>
      );
    }
    if (f.type === "order") {
      return (
        <div key={f.key} className="space-y-2">
          <Label className="text-sm font-bold">{f.label}</Label>
          {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          <HomeSectionsOrder
            value={parseHomeOrder(values[f.key])}
            onChange={(next) => setValues((v) => ({ ...v, [f.key]: JSON.stringify(next) }))}
          />
        </div>
      );
    }
    if (f.type === "switch") {
      return (
        <div
          key={f.key}
          className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4"
        >
          <div className="space-y-1">
            <Label htmlFor={f.key} className="text-sm font-bold">
              {f.label}
            </Label>
            {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          </div>
          <Switch
            id={f.key}
            checked={isFlagOn(f.key)}
            onCheckedChange={(on) =>
              setValues((v) => ({ ...v, [f.key]: on ? "true" : "false" }))
            }
          />
        </div>
      );
    }

    return (
      <div key={f.key} className="space-y-2">
        <Label htmlFor={f.key} className="text-sm font-bold">
          {f.label}
        </Label>
        {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}

        {(f.type === "text" || f.type === "textarea") && (
          <Textarea
            id={f.key}
            rows={f.type === "text" ? 1 : 3}
            value={values[f.key] ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              const next =
                f.key === "elfsight_instagram_id" ? sanitizeWidgetId(raw) : raw;
              setValues((v) => ({ ...v, [f.key]: next }));
            }}
            className="resize-y"
          />
        )}

        {f.type === "select" && f.options && (
          <Select
            value={values[f.key] ?? ""}
            onValueChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
          >
            <SelectTrigger id={f.key} className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {f.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {f.type === "image" && (
          <div className="flex flex-wrap items-center gap-4">
            {values[f.key] ? (
              <img src={values[f.key]} alt="" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-muted" />
            )}
            <Button asChild variant="outline" size="sm" type="button">
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploadingKey === f.key ? "Subiendo…" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(f.key, e.target.files[0])}
                />
              </label>
            </Button>
            {values[f.key] && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setValues((v) => ({ ...v, [f.key]: "" }))}
              >
                Quitar
              </Button>
            )}
          </div>
        )}

        {f.type === "images" && (
          <div>
            <div className="space-y-3">
              {parseList(values[f.key]).map((photo, idx, arr) => (
                <div
                  key={photo.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                    <ProductMedia
                      src={photo.url}
                      thumb={true}
                      className={`h-full w-full object-cover ${photo.is_visible ? "" : "opacity-40"}`}
                    />
                    {isVideoUrl(photo.url) && (
                      <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-md bg-black/70 px-1 py-0.5 text-[10px] font-bold text-white">
                        <Film className="h-3 w-3" />
                      </span>
                    )}
                    {!photo.is_visible && (
                      <span className="absolute top-1 left-1 rounded-md bg-foreground/80 px-1 py-0.5 text-[9px] font-bold text-background">
                        Oculto
                      </span>
                    )}
                  </div>

                  <div className="w-full flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Enlace de acción (opcional)
                    </Label>
                    <Input
                      type="text"
                      placeholder="Ej: /tienda/lampara-luna o https://..."
                      className="h-9 text-xs"
                      value={photo.link_url ?? ""}
                      onChange={(e) => updatePhotoLinkAt(f.key, idx, e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => togglePhotoAt(f.key, idx)}
                      aria-label={photo.is_visible ? "Ocultar elemento" : "Mostrar elemento"}
                      title={photo.is_visible ? "Ocultar elemento" : "Mostrar elemento"}
                    >
                      {photo.is_visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => movePhotoAt(f.key, idx, -1)}
                      disabled={idx === 0}
                      aria-label="Mover arriba"
                      title="Mover arriba"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => movePhotoAt(f.key, idx, 1)}
                      disabled={idx === arr.length - 1}
                      aria-label="Mover abajo"
                      title="Mover abajo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeImageAt(f.key, idx)}
                      aria-label="Eliminar elemento"
                      title="Eliminar elemento"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {parseList(values[f.key]).length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No hay fotos ni videos subidos en el portafolio.
                </div>
              )}
            </div>
            <Button asChild variant="outline" size="sm" type="button" className="mt-3">
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploadingKey === f.key ? "Subiendo…" : "Subir fotos o videos"}
                <input
                  type="file"
                  accept="image/*,video/*,video/mp4,video/webm,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) uploadImages(f.key, files);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando contenido de la página principal…
      </div>
    );
  }

  const groups = Array.from(new Set(FIELDS.map((f) => f.group)));

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-20 -mx-1 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" /> Home Builder & Contenido de la Página
          </h1>
          <p className="text-sm text-muted-foreground">
            Personaliza las secciones, el orden visual del inicio, textos y galería.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Guardando…" : "Guardado automático"}
        </span>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-base">{group}</CardTitle>
              <CardDescription>
                {FIELDS.filter((f) => f.group === group).length} campos editables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {FIELDS.filter((f) => f.group === group).map(renderField)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
