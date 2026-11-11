import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { compressForWhatsapp, WHATSAPP_IMAGE_MAX_BYTES } from "@/lib/whatsapp-image";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProductMedia } from "@/components/ProductMedia";

export interface ProductImageOptimizerModalProps {
  onComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export type HeavyImageItem = {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  originalUrl: string;
  sizeBytes: number;
  /** Tipo de campo al que pertenece */
  location: "product_cover" | "product_gallery" | "variant_cover" | "variant_gallery";
  galleryIndex?: number;
};

export type OptimizationProgress = {
  total: number;
  current: number;
  successCount: number;
  failedCount: number;
  currentLabel: string;
};

async function uploadToStorage(file: File, bucket = "product-images"): Promise<string> {
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

/**
 * Obtiene el tamaño de un archivo remoto a través de HEAD o GET parcial
 */
export async function getRemoteImageSize(url: string): Promise<number | null> {
  try {
    const headRes = await fetch(url, { method: "HEAD" });
    if (headRes.ok) {
      const len = headRes.headers.get("content-length");
      if (len) {
        const parsed = parseInt(len, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
  } catch {
    // Si HEAD falla por CORS o restricciones de método, intentamos GET
  }

  try {
    const getRes = await fetch(url);
    if (!getRes.ok) return null;
    const blob = await getRes.blob();
    return blob.size;
  } catch {
    return null;
  }
}

/**
 * Descarga una imagen remota y la convierte en un objeto File
 */
export async function fetchImageAsFile(url: string, filename = "image.jpg"): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar imagen`);
  const blob = await res.blob();
  const mimeType = blob.type || "image/jpeg";
  return new File([blob], filename, { type: mimeType });
}

export function ProductImageOptimizerModal({
  onComplete,
  open = true,
  onOpenChange,
}: ProductImageOptimizerModalProps) {
  const [scanning, setScanning] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [heavyImages, setHeavyImages] = useState<HeavyImageItem[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);

  const scanProducts = useCallback(async () => {
    setScanning(true);
    setHasScanned(false);
    setHeavyImages([]);
    setProgress(null);

    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, slug, image_url, images, variants");

      if (error) {
        throw error;
      }

      if (!products || products.length === 0) {
        setHasScanned(true);
        setScanning(false);
        return;
      }

      const detected: HeavyImageItem[] = [];

      for (const p of products) {
        // 1. Portada del producto
        if (p.image_url && typeof p.image_url === "string") {
          const size = await getRemoteImageSize(p.image_url);
          if (size !== null && size > WHATSAPP_IMAGE_MAX_BYTES) {
            detected.push({
              productId: p.id,
              productName: p.name,
              originalUrl: p.image_url,
              sizeBytes: size,
              location: "product_cover",
            });
          }
        }

        // 2. Galería del producto
        if (Array.isArray(p.images)) {
          for (let i = 0; i < p.images.length; i++) {
            const img = p.images[i];
            if (img && typeof img === "string" && img !== p.image_url) {
              const size = await getRemoteImageSize(img);
              if (size !== null && size > WHATSAPP_IMAGE_MAX_BYTES) {
                detected.push({
                  productId: p.id,
                  productName: p.name,
                  originalUrl: img,
                  sizeBytes: size,
                  location: "product_gallery",
                  galleryIndex: i,
                });
              }
            }
          }
        }

        // 3. Variantes
        if (Array.isArray(p.variants)) {
          for (const v of p.variants) {
            if (!v || typeof v !== "object") continue;
            const varObj = v as Record<string, unknown>;
            const vId = typeof varObj.id === "string" ? varObj.id : undefined;
            const vName = typeof varObj.name === "string" ? varObj.name : "Variante";
            const vCover = typeof varObj.image_url === "string" ? varObj.image_url : null;
            const vImages = Array.isArray(varObj.images) ? (varObj.images as string[]) : [];

            if (vCover) {
              const size = await getRemoteImageSize(vCover);
              if (size !== null && size > WHATSAPP_IMAGE_MAX_BYTES) {
                detected.push({
                  productId: p.id,
                  productName: p.name,
                  variantId: vId,
                  variantName: vName,
                  originalUrl: vCover,
                  sizeBytes: size,
                  location: "variant_cover",
                });
              }
            }

            for (let vi = 0; vi < vImages.length; vi++) {
              const vImg = vImages[vi];
              if (vImg && typeof vImg === "string" && vImg !== vCover) {
                const size = await getRemoteImageSize(vImg);
                if (size !== null && size > WHATSAPP_IMAGE_MAX_BYTES) {
                  detected.push({
                    productId: p.id,
                    productName: p.name,
                    variantId: vId,
                    variantName: vName,
                    originalUrl: vImg,
                    sizeBytes: size,
                    location: "variant_gallery",
                    galleryIndex: vi,
                  });
                }
              }
            }
          }
        }
      }

      setHeavyImages(detected);
      setHasScanned(true);

      if (detected.length === 0) {
        toast.success("¡Excelente! Todas las imágenes ya son óptimas para WhatsApp (<= 280 KB).");
      } else {
        toast.info(`Se encontraron ${detected.length} imágenes que superan los 280 KB.`);
      }
    } catch (err) {
      toast.error(`Error al escanear productos: ${(err as Error).message}`);
    } finally {
      setScanning(false);
    }
  }, []);

  // Escanear automáticamente al abrir
  useEffect(() => {
    if (open && !hasScanned && !scanning) {
      scanProducts();
    }
  }, [open, hasScanned, scanning, scanProducts]);

  const handleOptimizeAll = async () => {
    if (heavyImages.length === 0) return;

    setOptimizing(true);
    let success = 0;
    let failed = 0;

    // Cache de URLs ya optimizadas para no recomprimir la misma imagen si está repetida
    const urlReplacements = new Map<string, string>();

    setProgress({
      total: heavyImages.length,
      current: 0,
      successCount: 0,
      failedCount: 0,
      currentLabel: "Iniciando optimización...",
    });

    // Agrupamos por producto para minimizar las operaciones de actualización en base de datos
    const byProduct = new Map<string, HeavyImageItem[]>();
    for (const item of heavyImages) {
      const list = byProduct.get(item.productId) || [];
      list.push(item);
      byProduct.set(item.productId, list);
    }

    let processedCount = 0;

    for (const [productId, items] of byProduct.entries()) {
      try {
        // Cargar producto actual completo
        const { data: product, error: fetchErr } = await supabase
          .from("products")
          .select("id, name, image_url, images, variants")
          .eq("id", productId)
          .single();

        if (fetchErr || !product) {
          failed += items.length;
          processedCount += items.length;
          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  current: processedCount,
                  failedCount: failed,
                  currentLabel: `Error cargando ${items[0]?.productName || "producto"}`,
                }
              : null
          );
          continue;
        }

        let updatedImageUrl = product.image_url;
        let updatedImages = Array.isArray(product.images) ? [...product.images] : [];
        let updatedVariants = Array.isArray(product.variants) ? [...product.variants] : [];

        for (const item of items) {
          processedCount++;
          setProgress({
            total: heavyImages.length,
            current: processedCount,
            successCount: success,
            failedCount: failed,
            currentLabel: `Optimizando imagen de ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}...`,
          });

          let optimizedUrl = urlReplacements.get(item.originalUrl);

          if (!optimizedUrl) {
            try {
              // 1. Descargar imagen
              const file = await fetchImageAsFile(item.originalUrl, "product-photo.jpg");

              // 2. Comprimir con compressForWhatsapp
              const compressedFile = await compressForWhatsapp(file);

              // 3. Subir archivo comprimido al almacenamiento sin eliminar el original
              optimizedUrl = await uploadToStorage(compressedFile, "product-images");
              urlReplacements.set(item.originalUrl, optimizedUrl);
              success++;
            } catch (optErr) {
              console.error(`Error optimizando ${item.originalUrl}:`, optErr);
              failed++;
              continue;
            }
          } else {
            success++;
          }

          // Asignar en las estructuras
          if (item.location === "product_cover") {
            updatedImageUrl = optimizedUrl;
          } else if (item.location === "product_gallery") {
            updatedImages = updatedImages.map((u) => (u === item.originalUrl ? optimizedUrl! : u));
          } else if (item.location === "variant_cover" && item.variantId) {
            updatedVariants = updatedVariants.map((v) => {
              if (v && typeof v === "object" && (v as Record<string, unknown>).id === item.variantId) {
                const varImgs = Array.isArray((v as Record<string, unknown>).images)
                  ? ((v as Record<string, unknown>).images as string[]).map((u) => (u === item.originalUrl ? optimizedUrl! : u))
                  : [optimizedUrl!];
                return {
                  ...(v as Record<string, unknown>),
                  image_url: optimizedUrl,
                  images: varImgs,
                };
              }
              return v;
            });
          } else if (item.location === "variant_gallery" && item.variantId) {
            updatedVariants = updatedVariants.map((v) => {
              if (v && typeof v === "object" && (v as Record<string, unknown>).id === item.variantId) {
                const varImgs = Array.isArray((v as Record<string, unknown>).images)
                  ? ((v as Record<string, unknown>).images as string[]).map((u) => (u === item.originalUrl ? optimizedUrl! : u))
                  : [];
                return {
                  ...(v as Record<string, unknown>),
                  images: varImgs,
                };
              }
              return v;
            });
          }
        }

        // Actualizar en base de datos
        const { error: updateErr } = await supabase
          .from("products")
          .update({
            image_url: updatedImageUrl,
            images: updatedImages,
            variants: updatedVariants,
          })
          .eq("id", productId);

        if (updateErr) {
          console.error(`Error actualizando base de datos para producto ${productId}:`, updateErr);
        }
      } catch (prodErr) {
        console.error(`Error procesando lote de producto ${productId}:`, prodErr);
      }
    }

    setOptimizing(false);
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            current: heavyImages.length,
            successCount: success,
            failedCount: failed,
            currentLabel: "¡Optimización completada!",
          }
        : null
    );

    if (success > 0) {
      toast.success(`Se optimizaron con éxito ${success} imagen(es) para WhatsApp.`);
      onComplete?.();
    }
    if (failed > 0) {
      toast.error(`${failed} imagen(es) no pudieron ser procesadas.`);
    }

    // Re-escanear para actualizar la lista
    await scanProducts();
  };

  const handleClose = () => {
    if (optimizing) {
      if (!confirm("Hay una optimización en curso. ¿Deseas cerrar el modal?")) {
        return;
      }
    }
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-[var(--brand-orange)]" />
            Optimización de imágenes para WhatsApp
          </DialogTitle>
          <DialogDescription>
            WhatsApp descarta imágenes mayores a 280 KB en sus tarjetas de enlace preview.
            Esta herramienta escanea tu catálogo y genera versiones livianas sin borrar tus archivos originales.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {scanning ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-orange)]" />
              <p className="text-sm font-medium">Analizando imágenes del catálogo...</p>
            </div>
          ) : !hasScanned ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-pulse text-muted-foreground" />
              <p className="text-sm">Listo para iniciar el análisis.</p>
            </div>
          ) : heavyImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
                ¡Todas las imágenes están optimizadas!
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                Ninguna imagen de portada o galería de productos supera los 280 KB. Tus enlaces se verán perfectos al compartirse en WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    Se encontraron <b>{heavyImages.length}</b> imagen(es) que superan el límite de 280 KB.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={scanProducts}
                  disabled={optimizing}
                  className="flex items-center gap-1 font-semibold text-[var(--brand-orange)] hover:underline disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-escanear
                </button>
              </div>

              {progress && (
                <div className="space-y-1.5 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{progress.currentLabel}</span>
                    <span>
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-[var(--brand-orange)] transition-all duration-300"
                      style={{
                        width: `${Math.round((progress.current / Math.max(1, progress.total)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓ {progress.successCount} optimizadas
                    </span>
                    {progress.failedCount > 0 && (
                      <span className="text-red-500">
                        ✕ {progress.failedCount} fallidas
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {heavyImages.map((img, idx) => (
                  <div
                    key={`${img.productId}-${img.originalUrl}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-2 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <ProductMedia thumb src={img.originalUrl} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{img.productName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {img.variantName ? `Variante: ${img.variantName} · ` : ""}
                          {img.location === "product_cover"
                            ? "Portada del producto"
                            : img.location === "product_gallery"
                            ? "Galería del producto"
                            : img.location === "variant_cover"
                            ? "Portada de variante"
                            : "Galería de variante"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        {Math.round(img.sizeBytes / 1024)} KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <button
            type="button"
            onClick={scanProducts}
            disabled={scanning || optimizing}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Escaneando..." : "Actualizar escaneo"}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={optimizing}
              className="rounded-full border border-border px-5 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              Cerrar
            </button>

            {heavyImages.length > 0 && (
              <button
                type="button"
                onClick={handleOptimizeAll}
                disabled={optimizing || scanning}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Optimizar todas ({heavyImages.length})
                  </>
                )}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
