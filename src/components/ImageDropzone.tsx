import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProductMedia } from "@/components/ProductMedia";
import { UploadCloud, X, Star, Loader2 } from "lucide-react";

async function uploadToStorage(file: File, bucket: string): Promise<string> {
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const up = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (up.error) throw up.error;
  const signed = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

/** Zona de arrastrar y soltar para galerías de imágenes (con portada y reordenado). */
export function ImageDropzone({
  images,
  onChange,
  bucket = "product-images",
  coverIndex = 0,
  onSetCover,
  label = "Arrastra tus imágenes aquí",
}: {
  images: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
  coverIndex?: number;
  onSetCover?: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => {
      const lower = f.name.toLowerCase();
      return (
        f.type.startsWith("image/") ||
        f.type.startsWith("video/") ||
        lower.endsWith(".stl") ||
        lower.endsWith(".obj") ||
        lower.endsWith(".3mf")
      );
    });
    if (!list.length) return setError("Solo se aceptan fotos, GIFs, videos o archivos 3D (.stl, .obj, .3mf).");
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (let f of list) {
        const is3d = f.name.toLowerCase().endsWith(".stl") || f.name.toLowerCase().endsWith(".obj") || f.name.toLowerCase().endsWith(".3mf");
        const maxMb = is3d ? 100 : f.type.startsWith("video/") ? 50 : 25;
        if (f.size > maxMb * 1024 * 1024) throw new Error(`${f.name} pesa más de ${maxMb} MB`);

        if (f.type.startsWith("image/") && f.type !== "image/gif" && f.type !== "image/svg+xml") {
          try {
            const { compressForWhatsapp } = await import("@/lib/whatsapp-image");
            f = await compressForWhatsapp(f);
          } catch (compressErr) {
            toast.error(`Error al optimizar imagen ${f.name} para WhatsApp: ${(compressErr as Error).message}`);
          }
        }

        if (f.type.startsWith("image/") && f.size > 300 * 1024) {
          toast.warning(`La imagen ${f.name} supera los 300 KB (${Math.round(f.size / 1024)} KB) y podría no verse en WhatsApp.`);
        }

        urls.push(await uploadToStorage(f, bucket));
      }
      onChange([...images, ...urls]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    if (onSetCover && (i === 0 || j === 0)) onSetCover(next[0]);
  }

  /** Estrella: mueve la imagen al inicio del array y la marca como portada. */
  function setCover(url: string) {
    const next = [url, ...images.filter((u) => u !== url)];
    onChange(next);
    onSetCover?.(url);
  }


  return (
    <div className="mt-1 space-y-3">
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
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          over
            ? "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_10%,transparent)]"
            : "border-border bg-muted/30 hover:bg-muted/60"
        }`}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-orange)]" />
        ) : (
          <UploadCloud className="h-6 w-6 text-[var(--brand-teal-deep)]" />
        )}
        <p className="text-sm font-semibold">{busy ? "Subiendo archivos…" : label}</p>
        <p className="text-xs text-muted-foreground">
          o haz clic para elegir archivos · fotos, GIFs, videos MP4/WEBM o modelos 3D STL (.stl, .obj, .3mf) hasta 100 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,video/mp4,video/webm,video/quicktime,.stl,.obj,.3mf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((url, i) => (
            <div
              key={url + i}
              className={`group relative overflow-hidden rounded-xl border-2 ${
                i === coverIndex ? "border-[var(--brand-orange)]" : "border-border"
              }`}
            >
              <ProductMedia thumb src={url} className="aspect-square w-full object-cover" />
              {i === coverIndex && (
                <span className="absolute left-1 top-1 rounded-full bg-[var(--brand-orange)] px-2 py-0.5 text-[10px] font-bold text-white">
                  Portada
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 px-1 py-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Mover izquierda"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="px-1 text-xs font-bold text-white disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Usar como portada"
                  onClick={() => setCover(url)}
                  className="px-1 text-white"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${i === coverIndex ? "fill-[var(--brand-orange)] text-[var(--brand-orange)]" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  aria-label="Mover derecha"
                  disabled={i === images.length - 1}
                  onClick={() => move(i, 1)}
                  className="px-1 text-xs font-bold text-white disabled:opacity-30"
                >
                  →
                </button>
              </div>
              <button
                type="button"
                aria-label="Quitar imagen"
                onClick={() => {
                  const next = images.filter((_, j) => j !== i);
                  onChange(next);
                  if (onSetCover && i === 0) onSetCover(next[0] ?? "");
                }}
                className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

          ))}
        </div>
      )}
    </div>
  );
}
