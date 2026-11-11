import { describe, it, expect, vi } from "vitest";
import { compressForWhatsapp, WHATSAPP_IMAGE_MAX_BYTES } from "./whatsapp-image";

describe("compressForWhatsapp", () => {
  it("lanza un error para formatos no soportados", async () => {
    const txtFile = new File(["test"], "doc.txt", { type: "text/plain" });
    await expect(compressForWhatsapp(txtFile)).rejects.toThrow("Usa una foto JPG, PNG o WEBP.");

    const gifFile = new File(["gif"], "anim.gif", { type: "image/gif" });
    await expect(compressForWhatsapp(gifFile)).rejects.toThrow("Usa una foto JPG, PNG o WEBP.");

    const svgFile = new File(["<svg></svg>"], "vector.svg", { type: "image/svg+xml" });
    await expect(compressForWhatsapp(svgFile)).rejects.toThrow("Usa una foto JPG, PNG o WEBP.");
  });

  it("retorna el archivo original intacto si es JPEG y pesa <= 280 KB", async () => {
    // 200 KB JPEG
    const smallContent = new Uint8Array(200 * 1024);
    const jpgFile = new File([smallContent], "foto.jpg", { type: "image/jpeg" });

    // Spy en createImageBitmap para confirmar que no se invoca innecesariamente
    const bitmapSpy = vi.fn();
    vi.stubGlobal("createImageBitmap", bitmapSpy);

    const result = await compressForWhatsapp(jpgFile);
    expect(result).toBe(jpgFile);
    expect(bitmapSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("retorna el archivo original intacto si es WEBP y pesa <= 280 KB", async () => {
    // 250 KB WebP
    const smallContent = new Uint8Array(250 * 1024);
    const webpFile = new File([smallContent], "foto.webp", { type: "image/webp" });

    const bitmapSpy = vi.fn();
    vi.stubGlobal("createImageBitmap", bitmapSpy);

    const result = await compressForWhatsapp(webpFile);
    expect(result).toBe(webpFile);
    expect(bitmapSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("continúa al flujo de compresión si es PNG aunque pese <= 280 KB", async () => {
    const pngContent = new Uint8Array(50 * 1024);
    const pngFile = new File([pngContent], "grafico.png", { type: "image/png" });

    // En entorno node/vitest createImageBitmap fallará o será llamado
    const bitmapSpy = vi.fn().mockRejectedValue(new Error("createImageBitmap called"));
    vi.stubGlobal("createImageBitmap", bitmapSpy);

    await expect(compressForWhatsapp(pngFile)).rejects.toThrow("createImageBitmap called");
    expect(bitmapSpy).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("continúa al flujo de compresión si es JPEG pero supera los 280 KB", async () => {
    const largeContent = new Uint8Array(350 * 1024);
    const largeJpg = new File([largeContent], "grande.jpg", { type: "image/jpeg" });

    const bitmapSpy = vi.fn().mockRejectedValue(new Error("createImageBitmap called"));
    vi.stubGlobal("createImageBitmap", bitmapSpy);

    await expect(compressForWhatsapp(largeJpg)).rejects.toThrow("createImageBitmap called");
    expect(bitmapSpy).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("continúa al flujo de compresión si es WEBP pero supera los 280 KB", async () => {
    const largeContent = new Uint8Array(300 * 1024);
    const largeWebp = new File([largeContent], "grande.webp", { type: "image/webp" });

    const bitmapSpy = vi.fn().mockRejectedValue(new Error("createImageBitmap called"));
    vi.stubGlobal("createImageBitmap", bitmapSpy);

    await expect(compressForWhatsapp(largeWebp)).rejects.toThrow("createImageBitmap called");
    expect(bitmapSpy).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
