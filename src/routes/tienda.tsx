import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2 } from "lucide-react";
import { productsQuery, categoriesQuery } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/tienda")({
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
  const [cat, setCat] = useState<string>("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const okCat = cat === "todos" || p.category?.slug === cat;
      const okQ =
        !query ||
        (p.name + " " + (p.brand?.name ?? "") + " " + p.short)
          .toLowerCase()
          .includes(query.toLowerCase());
      return okCat && okQ;
    });
  }, [products, cat, query]);

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
              onClick={() => setCat("todos")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                cat === "todos"
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
                  cat === c.slug
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
