import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, MessageCircle } from "lucide-react";
import { formatCOP, getContactInfo, gradientKeyFor, waLink, type Product } from "@/lib/catalog";
import { useSiteContent } from "@/hooks/use-site-content";
import { ProductButtons } from "@/components/ProductButtons";
import { ProductQuickView } from "@/components/ProductQuickView";
import { ShareButton } from "@/components/ShareButton";

const GRADIENTS: Record<string, string> = {
  orange:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-orange) 35%, white), color-mix(in oklab, var(--brand-orange) 75%, white))",
  teal: "linear-gradient(135deg, color-mix(in oklab, var(--brand-teal) 35%, white), color-mix(in oklab, var(--brand-teal) 75%, white))",
  wine: "linear-gradient(135deg, color-mix(in oklab, var(--brand-wine) 35%, white), color-mix(in oklab, var(--brand-wine) 70%, white))",
};

export function ProductCard({ product }: { product: Product }) {
  const gradient = GRADIENTS[gradientKeyFor(product.category?.slug)];
  const { content } = useSiteContent();
  const whatsappUrl = waLink(
    getContactInfo(content).whatsapp,
    `Hola, me interesa el producto: ${product.name}`,
  );
  const actionText = product.btn_text?.trim() || "Ver más";
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
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
          <ShareButton
            title={product.name}
            text={product.custom_share_text}
            url={`https://will-design-3d.lovable.app/tienda/${product.slug}`}
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickOpen(true);
            }}
            aria-label={`Vista rápida de ${product.name}`}
            className="absolute inset-x-0 bottom-3 mx-auto inline-flex w-max items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-background md:inset-0 md:bottom-auto md:my-auto md:h-9 md:opacity-0 md:group-hover:opacity-100"
          >
            <Eye className="h-3.5 w-3.5" />
            Vista Rápida
          </button>
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
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 pb-2">
        {product.quote_only ? (
          <span className="text-sm font-bold text-[var(--brand-teal-deep)]">
            Sujeto a cotización
          </span>
        ) : (
          <span className="text-lg font-black text-[var(--brand-wine)]">
            {formatCOP(product.price_cop)}
          </span>
        )}
        {!product.hide_default_cta && (
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
        )}
      </div>
      {product.custom_buttons.length > 0 && (
        <ProductButtons
          product={product}
          buttons={product.custom_buttons}
          className="px-4 pb-4"
          quoteOnly={product.quote_only}
        />
      )}
      {product.custom_buttons.length === 0 && <div className="pb-2" />}

      <ProductQuickView product={product} open={quickOpen} onOpenChange={setQuickOpen} />
    </article>
  );
}
