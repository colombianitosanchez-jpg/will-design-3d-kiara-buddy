// Reduce una foto para que WhatsApp pueda mostrarla en la tarjeta del enlace.
// WhatsApp descarta imágenes de más de ~300 KB, así que comprimimos a JPG.
export const WHATSAPP_IMAGE_MAX_BYTES = 280 * 1024;

export async function compressForWhatsapp(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    throw new Error("Usa una foto JPG, PNG o WEBP.");
  }
  const bitmap = await createImageBitmap(file);
  let maxSide = 1200;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= WHATSAPP_IMAGE_MAX_BYTES) {
        const name = file.name.replace(/\.[^.]+$/, "") + "-whatsapp.jpg";
        return new File([blob], name, { type: "image/jpeg" });
      }
    }
    maxSide = Math.round(maxSide * 0.8);
  }
  throw new Error("No se pudo reducir la foto lo suficiente.");
}
