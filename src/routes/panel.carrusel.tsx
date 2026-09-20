import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  Film,
  Image as ImageIcon,
} from "lucide-react";
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
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
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
    setSlides((s) => s.map((x) => (x.id === slide.id ? { ...x, is_active: !slide.is_active } : x)));
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
    setSlides((s) =>
      s.map((x) => (x.id === slide.id ? { ...x, action_url: url || undefined } : x)),
    );
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
    toast.success("Elemento eliminado");
    await load();
    refreshPublic();
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= slides.length) return;
    const a = slides[index];
    const b = slides[j];
    const next = [...slides];
    next[index] = b;
    next[j] = a;
    setSlides(next);
    const updates = next.map((s, i) =>
      supabase.from("hero_carousel").update({ display_order: i }).eq("id", s.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("No pudimos reordenar", { description: failed.error.message });
      await load();
      return;
    }
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
            <ul className="space-y-3">
              {slides.map((s, i) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-3"
                >
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
                      value={durations[s.id] ?? String((s.duration_ms || DEFAULT_SLIDE_MS) / 1000)}
                      onChange={(e) => setDurations((d) => ({ ...d, [s.id]: e.target.value }))}
                      onBlur={() => saveDuration(s)}
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
                      value={actionUrls[s.id] ?? (s.action_url || "")}
                      onChange={(e) => setActionUrls((d) => ({ ...d, [s.id]: e.target.value }))}
                      onBlur={() => saveActionUrl(s)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </label>

                  <div className="ml-auto flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                      {s.is_active ? "Visible" : "Oculto"}
                    </label>
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      aria-label="Subir en el orden"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      aria-label="Bajar en el orden"
                      onClick={() => move(i, 1)}
                      disabled={i === slides.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      aria-label="Eliminar"
                      onClick={() => remove(s)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
