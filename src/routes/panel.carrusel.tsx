import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  UploadCloud,
  Trash2,
  GripVertical,
  Film,
  Image as ImageIcon,
} from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SLIDE_MS,
  HERO_MEDIA_BUCKET,
  detectMediaType,
  type HeroSlide,
} from "@/lib/hero-carousel";

export const Route = createFileRoute("/panel/carrusel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Carrusel del inicio · Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CarruselAdmin,
});

const MAX_MB = 50;

function CarruselAdmin() {
  const queryClient = useQueryClient();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [actionUrls, setActionUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("hero_carousel")
      .select("id,media_url,media_type,is_active,display_order,duration_ms,action_url")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error("No pudimos cargar el carrusel", { description: error.message });
    setSlides((data ?? []) as HeroSlide[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function refreshPublic() {
    queryClient.invalidateQueries({ queryKey: ["hero_carousel"] });
  }

  async function uploadFile(file: File) {
    const kind = detectMediaType(file);
    if (!kind) throw new Error(`${file.name} no es una foto ni un video`);
    if (file.size > MAX_MB * 1024 * 1024) throw new Error(`${file.name} pesa más de ${MAX_MB} MB`);
    const path = `hero/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from(HERO_MEDIA_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (up.error) throw up.error;
    const signed = await supabase.storage
      .from(HERO_MEDIA_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed.error) throw signed.error;
    return { url: signed.data.signedUrl, kind };
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    try {
      let order = slides.length ? Math.max(...slides.map((s) => s.display_order)) + 1 : 0;
      const rows: {
        media_url: string;
        media_type: string;
        display_order: number;
        duration_ms: number;
      }[] = [];
      for (const f of list) {
        const { url, kind } = await uploadFile(f);
        rows.push({
          media_url: url,
          media_type: kind,
          display_order: order++,
          duration_ms: DEFAULT_SLIDE_MS,
        });
      }
      const { error } = await supabase.from("hero_carousel").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} elemento(s) agregados al carrusel`);
      await load();
      refreshPublic();
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(slide: HeroSlide) {
    setSlides((s) =>
      s.map((x) => (x.id === slide.id ? { ...x, is_active: !slide.is_active } : x)),
    );
    const { error } = await supabase
      .from("hero_carousel")
      .update({ is_active: !slide.is_active })
      .eq("id", slide.id);
    if (error) {
      toast.error("No pudimos cambiar la visibilidad", { description: error.message });
      await load();
      return;
    }
    refreshPublic();
  }

  async function saveDuration(slide: HeroSlide) {
    const raw = durations[slide.id];
    if (raw === undefined) return;
    const seconds = Number(raw.replace(",", "."));
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 60) {
      toast.error("La duración debe estar entre 1 y 60 segundos");
      setDurations((d) => {
        const next = { ...d };
        delete next[slide.id];
        return next;
      });
      return;
    }
    const ms = Math.round(seconds * 1000);
    if (ms === slide.duration_ms) return;
    setSlides((s) => s.map((x) => (x.id === slide.id ? { ...x, duration_ms: ms } : x)));
    const { error } = await supabase
      .from("hero_carousel")
      .update({ duration_ms: ms })
      .eq("id", slide.id);
    if (error) {
      toast.error("No pudimos guardar la duración", { description: error.message });
      await load();
      return;
    }
    toast.success(`Duración guardada: ${seconds} s`);
    refreshPublic();
  }

  async function saveActionUrl(slide: HeroSlide) {
    const raw = actionUrls[slide.id];
    if (raw === undefined) return;
    const url = raw.trim();
    if (url === (slide.action_url ?? "")) return;
    setSlides((s) => s.map((x) => (x.id === slide.id ? { ...x, action_url: url || undefined } : x)));
    const { error } = await supabase
      .from("hero_carousel")
      .update({ action_url: url || null })
      .eq("id", slide.id);
    if (error) {
      toast.error("No pudimos guardar el enlace", { description: error.message });
      await load();
      return;
    }
    toast.success("Enlace guardado");
    refreshPublic();
  }

  async function remove(slide: HeroSlide) {
    if (!confirm("¿Quitar este elemento del carrusel?")) return;
    const { error } = await supabase.from("hero_carousel").delete().eq("id", slide.id);
    if (error) {
      toast.error("No pudimos eliminar", { description: error.message });
      return;
    }
    const match = slide.media_url.match(/\/object\/(?:sign|public)\/site-media\/([^?]+)/);
    if (match) {
      await supabase.storage.from(HERO_MEDIA_BUCKET).remove([decodeURIComponent(match[1])]);
    }
    toast.success("Elemento eliminado");
    await load();
    refreshPublic();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(slides, oldIndex, newIndex).map((s, idx) => ({
      ...s,
      display_order: idx,
    }));
    setSlides(reordered);
    const results = await Promise.all(
      reordered.map((s, idx) =>
        supabase.from("hero_carousel").update({ display_order: idx }).eq("id", s.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("No pudimos reordenar", { description: failed.error.message });
      await load();
      return;
    }
    toast.success("Orden del carrusel actualizado");
    refreshPublic();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Carrusel del inicio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube fotos y videos para el carrusel principal de la página de inicio. Se muestran en el
          orden de la lista y solo los que estén visibles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agregar fotos o videos</CardTitle>
          <CardDescription>
            JPG, PNG, GIF o WEBP para fotos · MP4, WEBM o MOV para videos · hasta {MAX_MB} MB cada
            archivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
              over
                ? "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_10%,transparent)]"
                : "border-border bg-muted/30"
            }`}
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-orange)]" />
            ) : (
              <UploadCloud className="h-6 w-6 text-[var(--brand-teal-deep)]" />
            )}
            <p className="text-sm font-semibold">
              {busy ? "Subiendo archivos…" : "Arrastra tus archivos aquí"}
            </p>
            <p className="text-xs text-muted-foreground">o haz clic para elegirlos</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              multiple
              className="hidden"
              onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Elementos del carrusel</CardTitle>
          <CardDescription>{slides.length} elemento(s) en total.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : slides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay elementos. Mientras esté vacío, el inicio muestra la imagen definida en
              Contenido.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-3">
                  {slides.map((s, index) => (
                    <SortableSlideItem
                      key={s.id}
                      slide={s}
                      index={index}
                      durationValue={
                        durations[s.id] ?? String((s.duration_ms || DEFAULT_SLIDE_MS) / 1000)
                      }
                      actionUrlValue={actionUrls[s.id] ?? (s.action_url || "")}
                      onDurationChange={(val) => setDurations((d) => ({ ...d, [s.id]: val }))}
                      onDurationSave={() => saveDuration(s)}
                      onActionUrlChange={(val) => setActionUrls((d) => ({ ...d, [s.id]: val }))}
                      onActionUrlSave={() => saveActionUrl(s)}
                      onToggleActive={() => toggleActive(s)}
                      onRemove={() => remove(s)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SortableSlideItem({
  slide: s,
  index,
  durationValue,
  actionUrlValue,
  onDurationChange,
  onDurationSave,
  onActionUrlChange,
  onActionUrlSave,
  onToggleActive,
  onRemove,
}: {
  slide: HeroSlide;
  index: number;
  durationValue: string;
  actionUrlValue: string;
  onDurationChange: (val: string) => void;
  onDurationSave: () => void;
  onActionUrlChange: (val: string) => void;
  onActionUrlSave: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: s.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-background p-3 shadow-2xs"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar elemento ${index + 1}`}
        className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        title="Arrastra para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {s.media_type === "video" ? (
          <video
            src={s.media_url}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img src={s.media_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {s.media_type === "video" ? (
          <>
            <Film className="h-3.5 w-3.5" /> Video
          </>
        ) : (
          <>
            <ImageIcon className="h-3.5 w-3.5" /> Foto
          </>
        )}
      </span>

      <label className="flex items-center gap-2 text-xs font-semibold">
        Duración (segundos)
        <Input
          type="number"
          min={1}
          max={60}
          step={0.5}
          className="h-9 w-20"
          value={durationValue}
          onChange={(e) => onDurationChange(e.target.value)}
          onBlur={onDurationSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </label>

      <label className="flex min-w-[12rem] flex-1 items-center gap-2 text-xs font-semibold">
        URL de destino / Enlace (Opcional)
        <Input
          type="text"
          placeholder="/tienda"
          className="h-9 flex-1"
          value={actionUrlValue}
          onChange={(e) => onActionUrlChange(e.target.value)}
          onBlur={onActionUrlSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </label>

      <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold">
          <Switch checked={s.is_active} onCheckedChange={onToggleActive} />
          {s.is_active ? "Visible" : "Oculto"}
        </label>
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label={`Eliminar elemento ${index + 1}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </li>
  );
}
