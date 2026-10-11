import { ProductMedia } from "@/components/ProductMedia";
import { StockIndicator } from "@/components/StockIndicator";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDropzone3D, file3dWaNote, type Dims3D } from "@/components/FileDropzone3D";
import { ProductButtons } from "@/components/ProductButtons";
import { ShareButton } from "@/components/ShareButton";
import { formatCOP, gradientKeyFor, type Product } from "@/lib/catalog";
import { parseVariants, type ProductVariant } from "@/lib/product-variants";

const GRADIENTS: Record<string, string> = {
  orange:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-orange) 35%, white), color-mix(in oklab, var(--brand-orange) 75%, white))",
  teal:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-teal) 35%, white), color-mix(in oklab, var(--brand-teal) 75%, white))",
  wine:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-wine) 35%, white), color-mix(in oklab, var(--brand-wine) 70%, white))",
};

export function ProductQuickView({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dims, setDims] = useState<Dims3D | null>(null);
  const variants = parseVariants(product.variants ?? []);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const gradient = GRADIENTS[gradientKeyFor(product.category?.slug)];

  // Determina la imagen, precio y stock efectivos
  const displayImage = selectedVariant?.image_url ?? product.image_url;
  const displayPrice = selectedVariant?.price_cop ?? product.price_cop;
  const displayStock = selectedVariant?.stock ?? product.stock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto p-0">
        <div className="grid gap-0 md:grid-cols-2">
          <div
            className="flex aspect-[4/3] items-center justify-center overflow-hidden text-4xl font-black text-primary-foreground/90 md:aspect-auto md:h-full md:min-h-[320px]"
            style={{ background: gradient }}
          >
            {displayImage ? (
              <ProductMedia
                src={displayImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="drop-shadow-md">{product.name.split(" ")[0]}</span>
            )}
          </div>

          <div className="flex flex-col gap-3 p-5 sm:p-6">
            <DialogHeader className="space-y-1 text-left">
              {product.brand?.name && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {product.brand.name}
                </p>
              )}
              <div className="flex items-start justify-between gap-2">
                <DialogTitle className="text-xl font-bold leading-tight">{product.name}</DialogTitle>
                <ShareButton
                  title={product.name}
                  text={product.custom_share_text}
                  url={`https://will-design-3d.lovable.app/tienda/${product.slug}`}
                  className="-mr-2 -mt-1 h-8 w-8 shrink-0 text-muted-foreground"
                />
              </div>
              <DialogDescription className="text-sm">{product.short}</DialogDescription>
            </DialogHeader>

            {/* Selector de variantes */}
            {variants.length > 0 && (
              <div className="mt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Variantes
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition ${
                        selectedVariant?.id === variant.id
                          ? "border-[var(--brand-wine)] bg-[var(--brand-wine)]/10"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      {variant.image_url && (
                        <ProductMedia
                          thumb
                          src={variant.image_url}
                          alt={variant.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <span className="text-[10px] font-semibold text-center">{variant.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.quote_only ? (
              <p className="text-lg font-bold text-[var(--brand-teal-deep)]">Sujeto a cotización</p>
            ) : (
              <p className="text-2xl font-black text-[var(--brand-wine)]">
                {formatCOP(displayPrice)}
              </p>
            )}
            <StockIndicator stock={displayStock} />

            {product.accepts_3d_file && (
              <FileDropzone3D
                fileName={fileName}
                onFileChange={(name, d) => {
                  setFileName(name);
                  setDims(d ?? null);
                }}
                className="mt-1"
              />
            )}

            {product.custom_buttons.length > 0 && (
              <ProductButtons
                product={product}
                buttons={product.custom_buttons}
                extraWhatsappNote={file3dWaNote(fileName, dims)}
                quoteOnly={product.quote_only}
                variantName={selectedVariant?.name}
              />
            )}

            <Link
              to="/tienda/$slug"
              params={{ slug: product.slug }}
              onClick={() => onOpenChange(false)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-orange)]"
            >
              Ver ficha completa
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
