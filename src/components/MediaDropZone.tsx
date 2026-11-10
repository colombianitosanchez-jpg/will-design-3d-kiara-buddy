import { useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function MediaDropZone({
  value,
  onChange,
  forWhatsapp = false,
}: {
  value?: string;
  onChange: (url: string, detectedType?: "imageFill" | "videoFill") => void;
  forWhatsapp?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    if (forWhatsapp) {
      try {
        const { compressForWhatsapp } = await import("@/lib/whatsapp-image");
        file = await compressForWhatsapp(file);
      } catch (e) {
        toast.error("Foto no válida para WhatsApp", { description: (e as Error).message });
        return;
      }
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("El archivo supera el límite máximo de 50MB");
      return;
    }
    setUploading(true);
    try {
      const path = `stats/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("site-media").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;

      const url = signed.data.signedUrl;
      const isVid = file.type.includes("video") || /\.(mp4|webm|quicktime)$/i.test(file.name);
      onChange(url, isVid ? "videoFill" : "imageFill");
      toast.success("Archivo subido con éxito");
    } catch (e) {
      toast.error("Error al subir archivo", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  const isVideo = value && /\.(mp4|webm|quicktime)($|\?)/i.test(value);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
          isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
        }`}
      >
        {value ? (
          <div className="relative w-full aspect-video max-h-36 overflow-hidden rounded-xl border border-border bg-black/50">
            {isVideo ? (
              <video src={value} autoPlay loop muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={value} alt="Preview" className="h-full w-full object-cover" />
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
                onChange("");
              }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer z-10 transition-transform hover:scale-110 active:scale-95"
              title="Eliminar archivo multimedia"
              aria-label="Eliminar archivo multimedia"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer w-full py-3">
            <Upload className={`h-8 w-8 mb-2 ${uploading ? "animate-bounce text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs font-bold text-foreground">
              {uploading ? "Subiendo archivo..." : "Arrastra un archivo aquí o haz clic para buscar"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              Soporta: PNG, JPG, WEBP, GIF, MP4, WebM (Máx 50MB)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.gif,.webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        )}
      </div>
    </div>
  );
}
