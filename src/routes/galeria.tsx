import { createFileRoute } from "@tanstack/react-router";
import { InstagramFeed } from "@/components/InstagramFeed";
import { siteContentQuery } from "@/lib/catalog";
import { getSeo } from "@/lib/seo";

export const Route = createFileRoute("/galeria")({
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.ensureQueryData(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const seo = getSeo(
      {
        title: siteContent?.site_title ? `Galería de Proyectos · ${siteContent.site_title}` : "Galería de Proyectos — Will Design 3D",
      },
      siteContent
    );

    const metaTags: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: "https://willdesign3d.com/galeria" },
    ];

    if (seo.image) {
      metaTags.push(
        { property: "og:image", content: seo.image },
        { name: "twitter:image", content: seo.image }
      );
    }

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: "https://willdesign3d.com/galeria" }],
    };
  },
  component: GaleriaPage,
});

function GaleriaPage() {
  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <span className="chip-teal">Portafolio</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
            Nuestro{" "}
            <span style={{ color: "var(--brand-orange)" }}>portafolio</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Proyectos reales del taller y las últimas publicaciones de Instagram, en un solo lugar.
          </p>
        </div>
      </section>
      <InstagramFeed />
    </>
  );
}
