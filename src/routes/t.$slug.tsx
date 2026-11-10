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
  validateSearch: (s: Record<string, unknown>): { v?: string; b?: string } => ({
    ...(s.v != null && s.v !== "" ? { v: String(s.v).slice(0, 64) } : {}),
    ...(s.b != null && s.b !== "" ? { b: String(s.b).slice(0, 8) } : {}),
  }),
  loaderDeps: ({ search }) => ({ v: search.v, b: search.b }),
  loader: async ({ params, context, deps }) => {
    const product = await context.queryClient.ensureQueryData(productBySlugQuery(params.slug));
    if (!product) throw notFound();
    const variants = product.variants ?? [];
    // Compatibilidad con enlaces viejos ?v=<uuid>.
    const byId = deps.v ? variants.findIndex((x) => x.id === deps.v) : -1;
    const vIndex = byId >= 0 ? byId : idx(deps.v);
    const variant = vIndex != null ? variants[vIndex] ?? null : null;
    const img = resolveProductShareImage(product, variant ? vIndex : null, idx(deps.b));
    return {
      slug: product.slug,
      variantId: variant?.id ?? null,
      title: variant ? `${product.name} — ${variant.name}` : product.name,
      img: /^https:\/\//i.test(img) ? img : "",
    };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.title ? `${loaderData.title} — Will Design 3D` : "Will Design 3D";
    const img = loaderData?.img || "";
    return {
      meta: [
        { title },
        { name: "description", content: title },
        { property: "og:title", content: title },
        { property: "og:description", content: "" },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
        ...(img
          ? [
              { property: "og:image", content: img },
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
  const { slug, variantId } = Route.useLoaderData();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/tienda/$slug", params: { slug }, search: variantId ? { v: variantId } : {}, replace: true });
  }, [slug, variantId, navigate]);
  return <div className="min-h-[60vh]" />;
}
