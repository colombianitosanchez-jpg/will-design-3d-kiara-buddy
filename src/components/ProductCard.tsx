import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle } from "lucide-react";
import {
  formatCOP,
  getContactInfo,
  gradientKeyFor,
  waLink,
  type Product,
} from "@/lib/catalog";
import { useSiteContent } from "@/hooks/use-site-content";

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
  const { content } = useSiteContent();
  const whatsappUrl = waLink(
    getContactInfo(content).whatsapp,
    `Hola, me interesa el producto: ${product.name}`,
  );
  const actionText = product.btn_text?.trim() || "Ver más";

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <Link
        to="/tienda/$slug"
        params={{ slug: product.slug }}
        className="flex flex-1 flex-col"
        aria-label={`${actionText}: ${product.name}`}
      >
        <div
          className="relative flex aspect-[4/3] items-center justify-center overflow-hidden text-4xl font-black text-primary-foreground/90"
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
            <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-wine)]">
              Destacado
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4 pb-2">
          {product.brand?.name && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {product.brand.name}
            </p>
          )}
          <h3 className="text-base font-bold leading-tight">{product.name}</h3>
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.short}</p>
        </div>
      </Link>
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 pb-4">
        <span className="text-lg font-black text-[var(--brand-wine)]">
          {formatCOP(product.price_cop)}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <Link
            to="/tienda/$slug"
            params={{ slug: product.slug }}
            className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-[var(--brand-orange)] transition group-hover:gap-2"
          >
            <span className="truncate">{actionText}</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
          </Link>
          {product.show_whatsapp && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Consultar ${product.name} por WhatsApp`}
              title="Consultar por WhatsApp"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--brand-teal-deep)] transition hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
