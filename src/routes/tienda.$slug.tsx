import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, ShieldCheck, Truck, Loader2 } from "lucide-react";
import {
  formatCOP,
  gradientKeyFor,
  productBySlugQuery,
  productsQuery,
  type Product,
} from "@/lib/catalog";
import { KiaraTip } from "@/components/KiaraTip";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/tienda/$slug")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData(productBySlugQuery(params.slug));
    if (!product) throw notFound();
    context.queryClient.prefetchQuery(productsQuery());
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — Will Design 3D` },
          { name: "description", content: loaderData.product.short },
          { property: "og:title", content: `${loaderData.product.name} — Will Design 3D` },
          { property: "og:description", content: loaderData.product.short },
          ...(loaderData.product.image_url
            ? [
                { property: "og:image", content: loaderData.product.image_url },
                { name: "twitter:image", content: loaderData.product.image_url },
              ]
            : []),
        ]
      : [
          { title: "Producto no encontrado — Will Design 3D" },
          { name: "robots", content: "noindex" },
        ],
  }),
  notFoundComponent: ProductNotFound,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl font-black">No pudimos cargar el producto</h1>
      <p className="mt-3 text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: ProductPage,
});

function ProductNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-black">Producto no encontrado</h1>
      <p className="mt-3 text-muted-foreground">El producto que buscas no está disponible.</p>
      <Link to="/tienda" className="btn-primary mt-6 text-sm">
        Volver a la tienda
      </Link>
    </div>
  );
}

const GRADIENTS: Record<string, string> = {
  orange:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-orange) 30%, white), color-mix(in oklab, var(--brand-orange) 75%, white))",
  teal:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-teal) 30%, white), color-mix(in oklab, var(--brand-teal) 75%, white))",
  wine:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-wine) 30%, white), color-mix(in oklab, var(--brand-wine) 70%, white))",
};

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const { data: allProducts = [] } = useQuery(productsQuery());
  const related = allProducts
    .filter((p) => p.category?.slug === product.category?.slug && p.slug !== product.slug)
    .slice(0, 3);

  const waMessage = encodeURIComponent(
    `Hola Will Design 3D, me interesa el producto: ${product.name} (${formatCOP(product.price_cop)}). ¿Está disponible?`,
  );
  const gradient = GRADIENTS[gradientKeyFor(product.category?.slug)];

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <Link
          to="/tienda"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la tienda
        </Link>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 md:grid-cols-2 md:py-12">
        <div>
          <div
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl text-5xl font-black text-white/90 shadow-lg"
            style={{ background: gradient }}
          >
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <span>{product.name.split(" ")[0]}</span>
            )}
          </div>
        </div>

        <div>
          {product.brand?.name && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {product.brand.name}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-muted-foreground">{product.description}</p>

          <p className="mt-6 text-4xl font-black text-[var(--brand-wine)]">
            {formatCOP(product.price_cop)}
          </p>
          <p className="text-xs text-muted-foreground">
            {product.stock > 0
              ? `Disponible · ${product.stock} en stock`
              : "Consultar disponibilidad"}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/573156724474?text=${waMessage}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <MessageCircle className="h-4 w-4" />
              Comprar por WhatsApp
            </a>
            <Link to="/contacto" className="btn-outline">
              Solicitar asesoría
            </Link>
          </div>

          <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[var(--brand-teal-deep)]" />
              Envíos a toda Colombia
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--brand-teal-deep)]" />
              Garantía y soporte técnico
            </li>
          </ul>

          {product.specs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Especificaciones
              </h2>
              <dl className="mt-3 divide-y divide-border rounded-2xl border border-border">
                {product.specs.map((s) => (
                  <div key={s.label} className="grid grid-cols-2 gap-2 p-3 text-sm">
                    <dt className="font-medium text-muted-foreground">{s.label}</dt>
                    <dd className="font-semibold">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.kiara_tip && (
            <div className="mt-6">
              <KiaraTip tip={product.kiara_tip} />
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <h2 className="text-2xl font-black">También te puede interesar</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
