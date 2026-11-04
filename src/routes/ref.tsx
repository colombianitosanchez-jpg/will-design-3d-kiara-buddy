import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowRight, Calculator, ExternalLink, Image as ImageIcon, Box } from "lucide-react";
import { useSiteContent } from "@/hooks/use-site-content";

const refSearchSchema = z.object({
  img: z.string().optional().default(""),
  title: z.string().optional().default("Referencia de Cotización - Will Design 3D"),
  desc: z.string().optional().default("Pieza de impresión 3D para cotización"),
});

export const Route = createFileRoute("/ref")({
  validateSearch: refSearchSchema,
  loaderDeps: ({ search }) => ({
    img: search.img,
    title: search.title,
    desc: search.desc,
  }),
  loader: ({ deps }) => {
    return {
      img: deps.img || "",
      title: deps.title || "Referencia de Cotización - Will Design 3D",
      desc: deps.desc || "Pieza de impresión 3D para cotización",
    };
  },
  head: ({ loaderData }: any) => {
    const title = loaderData?.title || "Referencia de Cotización - Will Design 3D";
    const desc = loaderData?.desc || "Pieza de impresión 3D para cotización";
    const img = loaderData?.img || "";

    const metaTags: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];

    if (img) {
      metaTags.push(
        { property: "og:image", content: img },
        { name: "twitter:image", content: img }
      );
    }

    return {
      meta: metaTags,
    };
  },
  component: RefPreviewPage,
});

function RefPreviewPage() {
  const { img, title, desc } = Route.useSearch();
  const { content } = useSiteContent();
  const logoUrl = content?.site_logo_url?.trim();
  const businessName = content?.site_business_name?.trim() || "Will Design 3D";

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
        {/* Encabezado con Logo y Marca */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <Link to="/" className="inline-flex items-center gap-2 transition hover:opacity-85">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-12 sm:h-14 w-auto object-contain mx-auto"
              />
            ) : (
              <div className="flex items-center gap-2 text-foreground font-black text-xl">
                <Box className="h-7 w-7 text-primary" />
                <span>{businessName}</span>
              </div>
            )}
          </Link>
          <span className="chip-teal text-xs">Referencia de Cotización</span>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {title}
          </h1>
          {desc && (
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {desc}
            </p>
          )}
        </div>

        {/* Contenedor de la Imagen */}
        <div className="relative group rounded-2xl border border-border bg-muted/40 overflow-hidden aspect-square sm:aspect-video flex items-center justify-center max-h-[460px] mx-auto w-full">
          {img ? (
            <>
              <img
                src={img}
                alt={title}
                className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                loading="eager"
              />
              <a
                href={img}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition shadow-md"
                title="Abrir imagen original"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground space-y-2">
              <ImageIcon className="h-12 w-12 stroke-1" />
              <p className="text-sm">Sin imagen de referencia especificada</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/cotizador"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-black text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-lg"
          >
            <Calculator className="h-4 w-4" />
            Cotizar esta pieza en la web
            <ArrowRight className="h-4 w-4 ml-0.5" />
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
