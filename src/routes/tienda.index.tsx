import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2, MessageCircle, PackageSearch, X } from "lucide-react";
import {
  productsQuery,
  categoriesQuery,
  brandsQuery,
  attributesQuery,
  categoryAttributesQuery,
  siteContentQuery,
  getContactInfo,
  waLink,
  resolveStoreFilter,
  brandSlugOf,
  buildCategoryTree,
  flattenCategoryTree,
  categoryPath,
  categoryBranchSlugs,
  filterProducts,
  parseAttrParam,
  serializeAttrParam,
  prettySlug,
  slugify,
  matchesSearch,
  type AttrFilter,
  type Product,
} from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { getMatchingVariants, type ProductVariant } from "@/lib/product-variants";

export const Route = createFileRoute("/tienda/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { categoria?: string; marca?: string; atributo?: string } => ({
    ...(typeof search.categoria === "string" ? { categoria: search.categoria } : {}),
    ...(typeof search.marca === "string" ? { marca: search.marca } : {}),
    ...(typeof search.atributo === "string" ? { atributo: search.atributo } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Tienda 3D — Impresoras, filamentos y accesorios" },
      {
        name: "description",
        content:
          "Catálogo de impresoras 3D, filamentos, resinas, repuestos, escáners 3D, lápices y cámaras 3D. Asesoría técnica incluida.",
      },
      { property: "og:title", content: "Tienda 3D — Will Design 3D" },
      { property: "og:description", content: "Impresoras, filamentos, resinas, repuestos y accesorios 3D con asesoría técnica en Bogotá." },
      { property: "og:url", content: "https://will-design-3d.lovable.app/tienda" },
    ],
    links: [{ rel: "canonical", href: "https://will-design-3d.lovable.app/tienda" }],
  }),

  loader: ({ context }) => {
    context.queryClient.prefetchQuery(productsQuery());
    context.queryClient.prefetchQuery(categoriesQuery());
    context.queryClient.prefetchQuery(attributesQuery());
  },
  component: TiendaPage,
});

function TiendaPage() {
  const { data: products = [], isLoading } = useQuery(productsQuery());
  const { data: allCategories = [] } = useQuery(categoriesQuery());
  const { data: brands = [] } = useQuery(brandsQuery());
  const { data: attributes = [] } = useQuery(attributesQuery());
  const { data: categoryAttributes = [] } = useQuery(categoryAttributesQuery());
  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);
  const { categoria, marca, atributo } = Route.useSearch();
  const navigate = useNavigate({ from: "/tienda/" });
  const [query, setQuery] = useState("");

  const categories = useMemo(() => allCategories.filter((c) => c.is_active), [allCategories]);
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const rootCategories = tree;

  const filter = useMemo(() => resolveStoreFilter(categoria, categories), [categoria, categories]);
  const brandSlug = marca ? slugify(marca) : null;
  const attrs = useMemo(() => parseAttrParam(atributo), [atributo]);

  const filtered = useMemo(
    () => filterProducts(products, { filter, brandSlug, attrs, query }),
    [products, filter, brandSlug, attrs, query],
  );

  const displayItems = useMemo(() => {
    const q = query.trim();
    if (!q) {
      return filtered.map((p) => ({ product: p, variant: null as ProductVariant | null, key: p.id }));
    }
    const items: { product: Product; variant: ProductVariant | null; key: string }[] = [];
    for (const p of filtered) {
      const matchedVars = getMatchingVariants(p.variants, q);
      if (matchedVars.length > 0) {
        for (const v of matchedVars) {
          items.push({ product: p, variant: v, key: `${p.id}-${v.id}` });
        }
      } else {
        items.push({ product: p, variant: null, key: p.id });
      }
    }
    return items;
  }, [filtered, query]);

  /** Subcategorías directas de la categoría activa, para navegar la rama. */
  const activeNode = useMemo(
    () => flattenCategoryTree(tree).find(({ category }) => category.slug === filter.categorySlug),
    [tree, filter.categorySlug],
  );
  const subcategories = activeNode?.category.children ?? [];

  /** Atributos filtrables aplicables a la rama activa (o todos si no hay categoría). */
  const visibleAttributes = useMemo(() => {
    const filterable = attributes.filter((a) => a.is_filterable && a.values.length);
    if (!filter.categorySlug) return filterable;
    const branchIds = new Set(
      categoryBranchSlugs(filter.categorySlug, categories)
        .map((s) => categories.find((c) => c.slug === s)?.id)
        .filter(Boolean) as string[],
    );
    // incluir también los ancestros (Color definido en Filamentos aplica a PLA)
    let cur = categories.find((c) => c.slug === filter.categorySlug) ?? null;
    let guard = 0;
    while (cur?.parent_id && guard++ < 20) {
      branchIds.add(cur.parent_id);
      cur = categories.find((c) => c.id === cur!.parent_id) ?? null;
    }
    const allowed = new Set(
      categoryAttributes.filter((ca) => branchIds.has(ca.category_id)).map((ca) => ca.attribute_id),
    );
    const scoped = filterable.filter((a) => allowed.has(a.id));
    return scoped.length ? scoped : [];
  }, [attributes, categoryAttributes, categories, filter.categorySlug]);

  /** Conteo real por opción, respetando los otros filtros activos. */
  function countFor(attributeSlug: string, valueSlug: string) {
    const others = attrs.filter((f) => f.attribute !== attributeSlug);
    return filterProducts(products, {
      filter,
      brandSlug,
      attrs: [...others, { attribute: attributeSlug, value: valueSlug }],
      query,
    }).length;
  }

  const brandCounts = useMemo(() => {
    const base = filterProducts(products, { filter, attrs, query });
    const map = new Map<string, number>();
    base.forEach((p) => {
      const s = brandSlugOf(p.brand);
      if (s) map.set(s, (map.get(s) ?? 0) + 1);
    });
    return map;
  }, [products, filter, attrs, query]);

  const catLabel =
    (filter.categorySlug ? categoryPath(filter.categorySlug, categories) : null) ??
    (categoria ? prettySlug(categoria) : null);
  const brandLabel =
    brands.find((b) => brandSlugOf(b) === brandSlug)?.name ?? (marca ? prettySlug(marca) : null);
  const attrLabels = attrs.map((f) => {
    const a = attributes.find((x) => x.slug === f.attribute);
    const v = a?.values.find((x) => x.slug === f.value);
    return `${a?.name ?? prettySlug(f.attribute)}: ${v?.label ?? prettySlug(f.value)}`;
  });
  const hasFilter = Boolean(categoria || brandSlug || attrs.length);

  const emptyMessage = (() => {
    const parts = [brandLabel, catLabel ? catLabel.toLowerCase() : null].filter(Boolean);
    if (parts.length === 0) return "No encontramos productos con ese filtro.";
    return `Todavía no tenemos productos ${parts.join(" de ")} en inventario.`;
  })();
  const emptyWaLink = waLink(
    contact.whatsapp,
    `Hola Will Design 3D, quiero saber cuándo llegan productos ${[brandLabel, catLabel, ...attrLabels]
      .filter(Boolean)
      .join(" / ")}`,
  );

  const setCat = (slug: string | null) =>
    navigate({ search: { categoria: slug ?? undefined, marca: undefined, atributo: undefined } });

  const setBrand = (slug: string | null) =>
    navigate({
      search: { categoria: categoria ?? undefined, marca: slug ?? undefined, atributo: atributo ?? undefined },
    });

  const toggleAttr = (f: AttrFilter) => {
    const exists = attrs.some((x) => x.attribute === f.attribute && x.value === f.value);
    const next = exists
      ? attrs.filter((x) => !(x.attribute === f.attribute && x.value === f.value))
      : [...attrs.filter((x) => x.attribute !== f.attribute), f];
    navigate({
      search: {
        categoria: categoria ?? undefined,
        marca: marca ?? undefined,
        atributo: serializeAttrParam(next),
      },
    });
  };

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
                !filter.categorySlug
                  ? "bg-[var(--brand-wine)] text-white"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              Todos
            </button>
            {rootCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.slug)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter.branch.includes(c.slug)
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

        {subcategories.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dentro de {catLabel}:
            </span>
            {subcategories.map((s) => (
              <button
                key={s.id}
                onClick={() => setCat(s.slug)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {hasFilter && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
            <span className="text-sm">
              Mostrando:{" "}
              <strong>
                {catLabel ?? "Todos"}
                {brandLabel ? ` › ${brandLabel}` : ""}
                {attrLabels.length ? ` · ${attrLabels.join(" · ")}` : ""}
              </strong>
            </span>
            <button
              onClick={() => navigate({ search: {} })}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-wine)] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              <X className="h-3.5 w-3.5" /> Quitar filtros
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-5">
            <FilterBlock title="Marca">
              <div className="flex flex-wrap gap-2">
                <Chip active={!brandSlug} onClick={() => setBrand(null)}>
                  Todas
                </Chip>
                {brands
                  .filter((b) => b.is_active)
                  .map((b) => {
                    const s = brandSlugOf(b)!;
                    const n = brandCounts.get(s) ?? 0;
                    return (
                      <Chip
                        key={b.id}
                        active={brandSlug === s}
                        disabled={n === 0 && brandSlug !== s}
                        onClick={() => setBrand(brandSlug === s ? null : s)}
                      >
                        {b.name} <span className="opacity-60">({n})</span>
                      </Chip>
                    );
                  })}
              </div>
            </FilterBlock>

            {visibleAttributes.map((a) => (
              <FilterBlock key={a.id} title={a.name}>
                <div className="flex flex-wrap gap-2">
                  {a.values.map((v) => {
                    const active = attrs.some((f) => f.attribute === a.slug && f.value === v.slug);
                    const n = countFor(a.slug, v.slug);
                    return (
                      <Chip
                        key={v.id}
                        active={active}
                        disabled={n === 0 && !active}
                        onClick={() => toggleAttr({ attribute: a.slug, value: v.slug })}
                      >
                        {v.color_hex && (
                          <span
                            className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-black/10 align-middle"
                            style={{ background: v.color_hex }}
                          />
                        )}
                        {v.label} <span className="opacity-60">({n})</span>
                      </Chip>
                    );
                  })}
                </div>
              </FilterBlock>
            ))}
          </aside>

          <div>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogo…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border p-10 text-center">
                <PackageSearch className="h-10 w-10 text-muted-foreground" />
                <p className="max-w-xl text-muted-foreground">
                  {emptyMessage} Escríbenos por WhatsApp y te avisamos apenas lleguen.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a href={emptyWaLink} target="_blank" rel="noreferrer" className="btn-primary text-sm">
                    <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                  </a>
                  <button
                    onClick={() => navigate({ search: {} })}
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Ver todo el catálogo
                  </button>
                  <Link to="/contacto" className="text-sm font-semibold underline">
                    Otras formas de contacto
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {displayItems.map((item) => (
                  <ProductCard key={item.key} product={item.product} variant={item.variant} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[var(--brand-teal-deep)] text-white"
          : "bg-muted text-foreground hover:bg-muted/70"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}
