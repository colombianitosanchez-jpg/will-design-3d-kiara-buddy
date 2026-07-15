import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { formatCOP, gradientKeyFor, type Product } from "@/lib/catalog";

const GRADIENTS: Record<string, string> = {
  orange:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-orange) 35%, white), color-mix(in oklab, var(--brand-orange) 75%, white))",
  teal:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-teal) 35%, white), color-mix(in oklab, var(--brand-teal) 75%, white))",
  wine:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-wine) 35%, white), color-mix(in oklab, var(--brand-wine) 70%, white))",
};

export function ProductCard({ product }: { product: Product }) {
  const gradient = GRADIENTS[gradientKeyFor(product.category?.slug)];
  return (
    <Link
      to="/tienda/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden text-4xl font-black text-white/90"
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
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-wine)]">
            Destacado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brand?.name && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {product.brand.name}
          </p>
        )}
        <h3 className="text-base font-bold leading-tight">{product.name}</h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">{product.short}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-black text-[var(--brand-wine)]">
            {formatCOP(product.price_cop)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-orange)] transition group-hover:gap-2">
            Ver <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
