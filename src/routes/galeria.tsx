import { createFileRoute } from "@tanstack/react-router";
import { InstagramFeed } from "@/components/InstagramFeed";
import { siteContentQuery } from "@/lib/catalog";

export const Route = createFileRoute("/galeria")({
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.fetchQuery(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const title = siteContent?.seo_gallery_title || `Portafolio y Galería 3D | ${siteContent?.site_title || "Will Design 3D"}`;
    const desc = siteContent?.seo_gallery_description || "Portafolio en vivo y fotos del taller: piezas impresas en 3D, prototipos y acabados en Bogotá.";
    const image = siteContent?.seo_gallery_image || siteContent?.site_meta_thumbnail_url || "https://storage.googleapis.com/gpt-engineer-file-uploads/Hj8JfrWa2qQArO2BOXZdviQDjWA2/social-images/social-1783472807154-WILL_LOGO.webp";

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
        { property: "og:url", content: "https://will-design-3d.lovable.app/galeria" },
      ],
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
