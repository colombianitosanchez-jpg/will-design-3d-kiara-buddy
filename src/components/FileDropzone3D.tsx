import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

const ACCEPT = ".stl,.obj,.step,.stp";

import { type Dims3D, dimsNote, file3dWaNote, FILE_3D_WA_NOTE } from "@/lib/file3d-types";
export { type Dims3D, dimsNote, file3dWaNote, FILE_3D_WA_NOTE };

/**
 * Calcula la caja que contiene el modelo (en mm) leyendo el .STL.
 * Solo matemáticas: no se monta ningún canvas WebGL.
 */
async function measureStl(file: File): Promise<Dims3D | null> {
  try {
    const [{ Vector3 }, { STLLoader }] = await Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/STLLoader.js"),
    ]);
    const buffer = await file.arrayBuffer();
    const geometry = new STLLoader().parse(buffer);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return null;
    const size = box.getSize(new Vector3());
    const round = (v: number) => Math.round(v * 10) / 10;
    if (![size.x, size.y, size.z].every((v) => Number.isFinite(v) && v > 0)) return null;
    return { x: round(size.x), y: round(size.y), z: round(size.z) };
  } catch {
    return null;
  }
}

/** Zona simple de arrastrar y soltar para archivos 3D. El archivo queda solo en memoria. */
export function FileDropzone3D({
  fileName,
  onFileChange,
  className = "",
}: {
  fileName: string | null;
  onFileChange: (name: string | null, dims?: Dims3D | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dims, setDims] = useState<Dims3D | null>(null);
  const [measuring, setMeasuring] = useState(false);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setDims(null);
    onFileChange(file.name, null);
    if (!/\.stl$/i.test(file.name)) return;
    setMeasuring(true);
    const measured = await measureStl(file);
    setMeasuring(false);
    setDims(measured);
    if (measured) onFileChange(file.name, measured);
  }

  function clear() {
    setDims(null);
    onFileChange(null, null);
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
          void pick(e.dataTransfer.files);
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
          onChange={(e) => void pick(e.target.files)}
        />
      </div>
      {fileName && (
        <div className="mt-2 rounded-xl bg-muted px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{fileName}</span>
            <button
              type="button"
              onClick={clear}
              aria-label="Quitar archivo"
              className="shrink-0 rounded-full p-1 hover:bg-background"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {measuring && <p className="mt-1 text-muted-foreground">Calculando medidas…</p>}
          {!measuring && dims && (
            <p className="mt-1 font-semibold text-[var(--brand-teal-deep)]">{dimsNote(dims)}</p>
          )}
        </div>
      )}
    </div>
  );
}

