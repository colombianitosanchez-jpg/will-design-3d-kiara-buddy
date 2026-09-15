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
import { FileDropzone3D, FILE_3D_WA_NOTE } from "@/components/FileDropzone3D";
import { ProductButtons } from "@/components/ProductButtons";
import { formatCOP, gradientKeyFor, type Product } from "@/lib/catalog";

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
  const gradient = GRADIENTS[gradientKeyFor(product.category?.slug)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto p-0">
        <div className="grid gap-0 md:grid-cols-2">
          <div
            className="flex aspect-[4/3] items-center justify-center overflow-hidden text-4xl font-black text-primary-foreground/90 md:aspect-auto md:h-full md:min-h-[320px]"
            style={{ background: gradient }}
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
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
              <DialogTitle className="text-xl font-bold leading-tight">{product.name}</DialogTitle>
              <DialogDescription className="text-sm">{product.short}</DialogDescription>
            </DialogHeader>

            <p className="text-2xl font-black text-[var(--brand-wine)]">
              {formatCOP(product.price_cop)}
            </p>

            {product.accepts_3d_file && (
              <FileDropzone3D fileName={fileName} onFileChange={setFileName} className="mt-1" />
            )}

            {product.custom_buttons.length > 0 && (
              <ProductButtons
                product={product}
                buttons={product.custom_buttons}
                extraWhatsappNote={fileName ? FILE_3D_WA_NOTE : undefined}
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
