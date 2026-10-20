import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Quoter } from "@/components/Quoter";
import { siteContentQuery } from "@/lib/catalog";
import { quoterServicesQuery } from "@/lib/quoter";
import { SITE_URL } from "@/lib/site-url";
import { dehydrateQueryClient, hydrateQueryClient } from "@/lib/ssr-query";

const searchSchema = z.object({
  servicio: z.string().max(80).optional(),
});

export const Route = createFileRoute("/cotizador")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const [content] = await Promise.all([
      context.queryClient.fetchQuery({ ...siteContentQuery(), staleTime: 0 }).catch(() => ({} as Record<string, string>)),
      context.queryClient.fetchQuery({ ...quoterServicesQuery(), staleTime: 0 }).catch(() => []),
    ]);
    return { content, dehydratedState: dehydrateQueryClient(context.queryClient) };
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content ?? {};
    const title = content.seo_quoter_title?.trim() || content.seo_title?.trim() ||
      "Cotizador de Impresión 3D en línea — Will Design 3D";
    const description = (
      content.seo_quoter_description?.trim() || content.seo_description?.trim() ||
      "Calcula el precio de tu impresión 3D, diseño, escaneo o post-procesado. Ajusta material, tamaño y acabado y recibe tu cotización por WhatsApp."
    ).slice(0, 300);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${SITE_URL}/cotizador` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/cotizador` }],
    };
  },
  component: CotizadorPage,
});

function CotizadorPage() {
  const { queryClient } = Route.useRouteContext();
  const { dehydratedState } = Route.useLoaderData();
  hydrateQueryClient(queryClient, dehydratedState);
  const { servicio } = Route.useSearch();
  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <span className="chip-teal">Cotizador en línea</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Calcula tu proyecto{" "}
            <span style={{ color: "var(--brand-orange)" }}>en tiempo real</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Desde un rollo de filamento hasta una pieza de gran formato: elige el servicio, mueve
            los deslizadores y verás el precio estimado al instante.
          </p>
        </div>
      </section>
      <Quoter initialServiceSlug={servicio} />
    </>
  );
}
