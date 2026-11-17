import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { productBySlugQuery } from "@/lib/catalog";
import { resolveProductShareImage } from "@/lib/product-share";

const idx = (raw: unknown): number | null => {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : null;
};

// Enlace corto de WhatsApp: /t/<producto>?v=<nº variante>&b=<nº botón>.
// La tarjeta usa: foto del botón > portada ★ de la variante > portada ★ del producto.
export const Route = createFileRoute("/t/$slug")({
  // Se conservan tal cual (número o texto) para no provocar una redirección 307.
  validateSearch: (s: Record<string, unknown>): { v?: string | number; b?: string | number } => {
    const keep = (x: unknown) => (typeof x === "number" ? x : typeof x === "string" && x ? x.slice(0, 64) : undefined);
    const v = keep(s.v), b = keep(s.b);
    return { ...(v !== undefined ? { v } : {}), ...(b !== undefined ? { b } : {}) };
  },
  loaderDeps: ({ search }) => ({ v: search.v, b: search.b }),
  loader: async ({ params, context, deps }) => {
    const match = params.slug.match(/^(.*?)(?:--v(\d+))?(?:--b(\d+))?$/);
    const productSlug = match && match[1] ? match[1] : params.slug;
    const parsedV = match && match[2] ? Number.parseInt(match[2], 10) : null;
    const parsedB = match && match[3] ? Number.parseInt(match[3], 10) : null;

    if (!productSlug) throw notFound();

    const product = await context.queryClient.ensureQueryData(productBySlugQuery(productSlug));
    if (!product) throw notFound();
    const variants = product.variants ?? [];

    // Compatibilidad con enlaces viejos ?v=<uuid> o ?v=<num> vs nuevo formato limpio en slug
    const byId = deps.v ? variants.findIndex((x) => x.id === String(deps.v)) : -1;
    const vIndex = byId >= 0 ? byId : deps.v ? idx(deps.v) : parsedV != null && parsedV >= 1 ? parsedV - 1 : null;
    const bIndex = deps.b ? idx(deps.b) : parsedB != null && parsedB >= 1 ? parsedB - 1 : null;
    const variant = vIndex != null ? variants[vIndex] ?? null : null;
    const title = variant ? `${product.name} — ${variant.name}` : product.name;
    const rawDescSource =
      variant?.short?.trim() ||
      product.short?.trim() ||
      variant?.description?.trim() ||
      product.description?.trim() ||
      "";
    const cleanDesc = rawDescSource.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const description = (
      cleanDesc.length >= 20
        ? cleanDesc
        : `${title} disponible en Will Design 3D, Bogotá.${cleanDesc ? ` ${cleanDesc}` : ""} Asesoría técnica y envíos a todo el país.`
    ).slice(0, 160);
    const img = resolveProductShareImage(product, variant ? vIndex : null, bIndex);
    return {
      slug: productSlug,
      productSlug,
      variantId: variant?.id ?? null,
      title,
      description,
      img: /^https:\/\//i.test(img) ? img : "",
    };
  },
  head: ({ params, loaderData }) => {
    const title = loaderData?.title ? `${loaderData.title} — Will Design 3D` : "Will Design 3D";
    const desc =
      loaderData?.description?.trim() ||
      `${title}. Impresión 3D profesional, filamentos, resinas y equipos en Bogotá.`;
    const img = loaderData?.img || "";
    const shareSlug = params?.slug || loaderData?.slug || "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        ...(shareSlug
          ? [{ property: "og:url", content: `https://will-design-3d.lovable.app/t/${shareSlug}` }]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        ...(img
          ? [
              { property: "og:image", content: img },
              { property: "og:image:secure_url", content: img },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { property: "og:image:alt", content: title },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
    };
  },
  component: ShareRedirect,
});

function ShareRedirect() {
  const { productSlug, variantId } = Route.useLoaderData();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/tienda/$slug", params: { slug: productSlug }, search: variantId ? { v: variantId } : {}, replace: true });
  }, [productSlug, variantId, navigate]);
  return <div className="min-h-[60vh]" />;
}
