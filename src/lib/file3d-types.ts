export type Dims3D = { x: number; y: number; z: number };

/** Texto listo para WhatsApp con las medidas de la pieza. */
export function dimsNote(dims: Dims3D | null | undefined): string {
  if (!dims) return "";
  const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return `Medidas: ${n(dims.x)} x ${n(dims.y)} x ${n(dims.z)} mm`;
}

export const FILE_3D_WA_NOTE = "Tengo un archivo 3D listo para enviar.";

/** Nota completa para WhatsApp: archivo listo + medidas si se pudieron calcular. */
export function file3dWaNote(fileName: string | null, dims: Dims3D | null): string | undefined {
  if (!fileName) return undefined;
  return [FILE_3D_WA_NOTE, dimsNote(dims)].filter(Boolean).join(" ");
}
