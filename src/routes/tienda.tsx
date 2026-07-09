import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { CATEGORIES, PRODUCTS, type ProductCategory } from "@/data/products";
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
  component: TiendaPage,
});

function TiendaPage() {
  const [cat, setCat] = useState<ProductCategory | "todos">("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const okCat = cat === "todos" || p.category === cat;
      const okQ =
        !query ||
        (p.name + " " + (p.brand ?? "") + " " + p.short)
          .toLowerCase()
          .includes(query.toLowerCase());
      return okCat && okQ;
    });
  }, [cat, query]);

  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <span className="chip-teal">Tienda</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
            Todo para tu{" "}
            <span style={{ color: "var(--brand-orange)" }}>taller 3D</span>
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
        {/* Filters */}
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
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  cat === c.id
                    ? "bg-[var(--brand-wine)] text-white"
                    : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                {c.label}
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

        {filtered.length === 0 ? (
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
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
