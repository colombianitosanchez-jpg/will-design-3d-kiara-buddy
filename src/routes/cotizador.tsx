import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Quoter } from "@/components/Quoter";
import { siteContentQuery } from "@/lib/catalog";
import { getCanonicalBaseUrl, resolvePageSeo } from "@/lib/seo";

const searchSchema = z.object({
  servicio: z.string().max(80).optional(),
});

export const Route = createFileRoute("/cotizador")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.ensureQueryData(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: { loaderData?: { siteContent?: Record<string, string> } }) => {
    const siteContent = loaderData?.siteContent;
    const canonicalUrl = `${getCanonicalBaseUrl(siteContent)}/cotizador`;
    const seo = resolvePageSeo("cotizador", siteContent);

    const metaTags: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: canonicalUrl },
    ];

    if (seo.image) {
      metaTags.push(
        { property: "og:image", content: seo.image },
        { name: "twitter:image", content: seo.image },
      );
    }

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: canonicalUrl }],
    };
  },
  component: CotizadorPage,
});

function CotizadorPage() {
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
