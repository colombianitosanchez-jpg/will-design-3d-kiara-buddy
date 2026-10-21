import { createFileRoute } from "@tanstack/react-router";
import { InstagramFeed } from "@/components/InstagramFeed";
import { siteContentQuery } from "@/lib/catalog";

export const Route = createFileRoute("/galeria")({
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.ensureQueryData(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const title = siteContent?.seo_gallery_title || siteContent?.site_title || "Galería — Will Design 3D";
    const desc = siteContent?.seo_gallery_description || siteContent?.site_description || "";
    const image = siteContent?.seo_gallery_image || siteContent?.site_meta_thumbnail_url || siteContent?.site_logo_url || "";

    const metaTags: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: "https://will-design-3d.lovable.app/galeria" },
    ];

    if (image) {
      metaTags.push(
        { property: "og:image", content: image },
        { name: "twitter:image", content: image }
      );
    }

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: "https://will-design-3d.lovable.app/galeria" }],
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
