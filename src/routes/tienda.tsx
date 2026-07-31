import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2, X } from "lucide-react";
import {
  productsQuery,
  categoriesQuery,
  resolveCategorySlug,
  brandSlugOf,
  slugify,
} from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/tienda")({
  validateSearch: (search: Record<string, unknown>) => ({
    categoria: typeof search.categoria === "string" ? search.categoria : undefined,
    marca: typeof search.marca === "string" ? search.marca : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tienda 3D — Impresoras, filamentos y accesorios | Will Design 3D" },
      {
        name: "description",
        content:
          "Catálogo de impresoras 3D, filamentos, resinas, repuestos, escáners 3D, lápices y cámaras 3D. Asesoría técnica incluida.",
      },
      { property: "og:title", content: "Tienda 3D — Will Design 3D" },
      { property: "og:description", content: "Impresoras, filamentos, resinas, repuestos y accesorios 3D con asesoría técnica en Bogotá." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(productsQuery());
    context.queryClient.prefetchQuery(categoriesQuery());
  },
  component: TiendaPage,
});

function TiendaPage() {
  const { data: products = [], isLoading } = useQuery(productsQuery());
  const { data: categories = [] } = useQuery(categoriesQuery());
  const { categoria, marca } = Route.useSearch();
  const navigate = useNavigate({ from: "/tienda" });
  const [query, setQuery] = useState("");

  const catSlug = useMemo(
    () => resolveCategorySlug(categoria, categories),
    [categoria, categories],
  );
  const brandSlug = marca ? slugify(marca) : null;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const okCat = !catSlug || p.category?.slug === catSlug;
      const okBrand = !brandSlug || brandSlugOf(p.brand) === brandSlug;
      const okQ =
        !query ||
        (p.name + " " + (p.brand?.name ?? "") + " " + p.short)
          .toLowerCase()
          .includes(query.toLowerCase());
      return okCat && okBrand && okQ;
    });
  }, [products, catSlug, brandSlug, query]);

  const catLabel =
    categories.find((c) => c.slug === catSlug)?.name ??
    (categoria ? categoria.replace(/-/g, " ") : null);
  const brandLabel =
    products.find((p) => brandSlugOf(p.brand) === brandSlug)?.brand?.name ??
    (marca ? marca.replace(/-/g, " ") : null);
  const hasFilter = Boolean(catSlug || brandSlug);

  const setCat = (slug: string | null) =>
    navigate({
      search: (prev) => ({ ...prev, categoria: slug ?? undefined, marca: undefined }),
    });

  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <span className="chip-teal">Tienda</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
            Todo para tu <span style={{ color: "var(--brand-orange)" }}>taller 3D</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Marcas líderes con soporte y asesoría en Bogotá. ¿No encuentras algo?{" "}
            <Link to="/contacto" className="font-semibold text-foreground underline">
              Escríbenos
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <button
              onClick={() => setCat(null)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                !catSlug
                  ? "bg-[var(--brand-wine)] text-white"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.slug)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  catSlug === c.slug
                    ? "bg-[var(--brand-wine)] text-white"
                    : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 100))}
            placeholder="Buscar producto…"
            className="w-full rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </div>

        {hasFilter && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
            <span className="text-sm">
              Mostrando:{" "}
              <strong className="capitalize">
                {catLabel ?? "Todos"}
                {brandLabel ? ` > ${brandLabel}` : ""}
              </strong>
            </span>
            <button
              onClick={() => navigate({ search: {} })}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-wine)] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              <X className="h-3.5 w-3.5" /> Quitar filtro
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="mt-10 flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogo…
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl border-2 border-dashed border-border p-10 text-center text-muted-foreground">
            No encontramos productos con ese filtro.{" "}
            <Link to="/contacto" className="font-semibold text-foreground underline">
              Pídelo por WhatsApp
            </Link>
            .
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
