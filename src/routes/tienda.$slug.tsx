import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { formatCOP, productBySlug, PRODUCTS } from "@/data/products";
import { KiaraTip } from "@/components/KiaraTip";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/tienda/$slug")({
  loader: ({ params }) => {
    const product = productBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — Will Design 3D` },
          { name: "description", content: loaderData.product.short },
          { property: "og:title", content: `${loaderData.product.name} — Will Design 3D` },
          { property: "og:description", content: loaderData.product.short },
        ]
      : [
          { title: "Producto no encontrado — Will Design 3D" },
          { name: "robots", content: "noindex" },
        ],
  }),
  notFoundComponent: ProductNotFound,
  component: ProductPage,
});

function ProductNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-black">Producto no encontrado</h1>
      <p className="mt-3 text-muted-foreground">
        El producto que buscas no está disponible.
      </p>
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
  const { product } = Route.useLoaderData();
  const related = PRODUCTS.filter(
    (p) => p.category === product.category && p.slug !== product.slug,
  ).slice(0, 3);

  const waMessage = encodeURIComponent(
    `Hola Will Design 3D, me interesa el producto: ${product.name} (${formatCOP(product.price)}). ¿Está disponible?`,
  );

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
            className="flex aspect-square w-full items-center justify-center rounded-3xl text-5xl font-black text-white/90 shadow-lg"
            style={{ background: GRADIENTS[product.image] ?? GRADIENTS.orange }}
          >
            {product.name.split(" ")[0]}
          </div>
        </div>

        <div>
          {product.brand && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {product.brand}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-muted-foreground">{product.description}</p>

          <p className="mt-6 text-4xl font-black text-[var(--brand-wine)]">
            {formatCOP(product.price)}
          </p>
          <p className="text-xs text-muted-foreground">
            Precio referencial · Consulta stock y descuentos por volumen.
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

          <div className="mt-6">
            <KiaraTip tip={product.kiaraTip} />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <h2 className="text-2xl font-black">También te puede interesar</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
