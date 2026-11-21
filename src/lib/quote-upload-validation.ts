export const ALLOWED_QUOTE_EXT =
  /\.(stl|obj|3mf|step|stp|iges|igs|fbx|blend|zip|rar|7z|png|jpe?g|webp|pdf|dxf)$/i;

/**
 * Sanitiza un nombre de archivo para cotizaciones 3D y verifica la lista blanca de extensiones.
 * Excluye explícitamente .svg y otros formatos activos para prevenir cargas maliciosas.
 */
export function sanitizeAndValidateQuoteFileName(rawFileName: string): string {
  const safe = rawFileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".");

  if (!safe || safe.startsWith(".") || !ALLOWED_QUOTE_EXT.test(safe)) {
    throw new Error("Tipo de archivo no permitido");
  }

  return safe;
}
