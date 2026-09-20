import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

const ACCEPT = ".stl,.obj,.step,.stp";

/** Zona simple de arrastrar y soltar para archivos 3D. El archivo queda solo en memoria. */
export function FileDropzone3D({
  fileName,
  onFileChange,
  className = "",
}: {
  fileName: string | null;
  onFileChange: (name: string | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileChange(file.name);
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${
          dragging ? "border-[var(--brand-orange)] bg-muted" : "border-border hover:bg-muted/60"
        }`}
      >
        <UploadCloud className="h-5 w-5 text-[var(--brand-teal-deep)]" />
        <p className="text-sm font-semibold">Sube tu archivo 3D (.stl, .obj, .step)</p>
        <p className="text-xs text-muted-foreground">
          Arrastra el archivo aquí o haz clic para elegirlo
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => pick(e.target.files)}
        />
      </div>
      {fileName && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-xs">
          <span className="truncate font-medium">{fileName}</span>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            aria-label="Quitar archivo"
            className="shrink-0 rounded-full p-1 hover:bg-background"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export const FILE_3D_WA_NOTE = "Tengo un archivo 3D listo para enviar.";
