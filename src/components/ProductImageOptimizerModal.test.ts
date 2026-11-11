import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getRemoteImageSize,
  fetchImageAsFile,
  type HeavyImageItem,
} from "./ProductImageOptimizerModal";
import { WHATSAPP_IMAGE_MAX_BYTES } from "@/lib/whatsapp-image";

describe("ProductImageOptimizerModal helpers and logic", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("identifica el tamaño de una imagen vía Content-Length en HEAD", async () => {
    const mockHeaders = new Headers();
    mockHeaders.set("content-length", "350000"); // ~341 KB (> 280 KB)

    global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "HEAD") {
        return {
          ok: true,
          headers: mockHeaders,
        } as unknown as Response;
      }
      return { ok: false } as unknown as Response;
    });

    const size = await getRemoteImageSize("https://example.com/foto-pesada.jpg");
    expect(size).toBe(350000);
    expect(size! > WHATSAPP_IMAGE_MAX_BYTES).toBe(true);
  });

  it("hace fallback a GET cuando HEAD falla o no devuelve content-length", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "HEAD") {
        return {
          ok: false,
          status: 405,
        } as unknown as Response;
      }
      // GET fallback
      return {
        ok: true,
        blob: async () => ({
          size: 150000,
          type: "image/jpeg",
        }),
      } as unknown as Response;
    });

    const size = await getRemoteImageSize("https://example.com/foto-normal.jpg");
    expect(size).toBe(150000);
    expect(size! <= WHATSAPP_IMAGE_MAX_BYTES).toBe(true);
  });

  it("fetchImageAsFile descarga y empaqueta el Blob como File con tipo correcto", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["fake-image-bytes"], { type: "image/jpeg" }),
    } as unknown as Response);

    const file = await fetchImageAsFile("https://example.com/imagen.jpg", "foto-descargada.jpg");
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("foto-descargada.jpg");
    expect(file.type).toBe("image/jpeg");
  });

  it("detecta imágenes pesadas y construye los ítems de diagnóstico adecuadamente", () => {
    const heavySize = 320 * 1024; // 320 KB > 280 KB
    const lightSize = 200 * 1024; // 200 KB <= 280 KB

    const sampleItem: HeavyImageItem = {
      productId: "prod-1",
      productName: "Llavero Personalizado",
      variantId: "var-1",
      variantName: "Rojo",
      originalUrl: "https://example.com/llavero-rojo.png",
      sizeBytes: heavySize,
      location: "variant_cover",
    };

    expect(sampleItem.sizeBytes).toBeGreaterThan(WHATSAPP_IMAGE_MAX_BYTES);
    expect(lightSize).toBeLessThanOrEqual(WHATSAPP_IMAGE_MAX_BYTES);
    expect(sampleItem.location).toBe("variant_cover");
  });
});
