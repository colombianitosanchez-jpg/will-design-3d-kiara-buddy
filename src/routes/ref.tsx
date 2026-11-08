import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowRight, Calculator, ExternalLink, Image as ImageIcon, Box } from "lucide-react";
import { useSiteContent } from "@/hooks/use-site-content";
import { REVERSE_REF_ALIASES } from "@/lib/whatsapp-buttons";

// Sin valores por defecto: un default obliga al router a "canonizar" la URL
// con una redirección 307 que añade &img=&title=...&desc=, y el robot de
// WhatsApp puede fallar al seguir ese salto. Los opcionales responden 200 directo.
const refSearchSchema = z.object({
  k: z.string().optional(),
  img: z.string().optional(),
  title: z.string().optional(),
  desc: z.string().optional(),
});

export const Route = createFileRoute("/ref")({
  validateSearch: refSearchSchema,
  loaderDeps: ({ search }) => ({
    k: search.k,
    img: search.img,
    title: search.title,
    desc: search.desc,
  }),
  loader: async ({ deps }) => {
    let img = (deps.img || "").trim();
    // Enlace corto: la imagen se busca en el contenido del sitio por su clave o alias.
    const rawKey = deps.k?.trim() || "";
    const key = REVERSE_REF_ALIASES[rawKey] || rawKey;

    // Estadísticas: k = id de la estadística (stat_...); la foto vive dentro del JSON.
    if (/^stat_[a-z0-9_]+$/i.test(rawKey)) {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("site_content")
        .select("key, value")
        .in("key", ["hero_stats", "about_stats"]);
      for (const row of data || []) {
        try {
          const arr = JSON.parse(String(row.value || "[]"));
          const found = Array.isArray(arr) ? arr.find((s: any) => s?.id === rawKey) : null;
          if (found?.whatsapp_image_url) {
            img = String(found.whatsapp_image_url);
            break;
          }
        } catch {
          /* ignore */
        }
      }
    } else if (key && (key === "site_logo_url" || /^[a-z0-9_]+_image_url$/i.test(key))) {
      const { supabase } = await import("@/integrations/supabase/client");
      // Posibles claves equivalentes en site_content para garantizar retrocompatibilidad
      const candidateKeys = [key];
      if (key === "nosotros_whatsapp_image_url") candidateKeys.push("about_cta_whatsapp_image_url");
      if (key === "about_cta_whatsapp_image_url") candidateKeys.push("nosotros_whatsapp_image_url");
      if (key === "mision_whatsapp_image_url") candidateKeys.push("about_mission_cta_whatsapp_image_url");
      if (key === "about_mission_cta_whatsapp_image_url") candidateKeys.push("mision_whatsapp_image_url");
      if (key === "vision_whatsapp_image_url") candidateKeys.push("about_vision_cta_whatsapp_image_url");
      if (key === "about_vision_cta_whatsapp_image_url") candidateKeys.push("vision_whatsapp_image_url");

      for (const candidate of candidateKeys) {
        const { data } = await supabase
          .from("site_content")
          .select("value")
          .eq("key", candidate)
          .maybeSingle();
        if (data?.value) {
          img = String(data.value);
          break;
        }
      }
    }
    return {
      img,
      title: deps.title || "Will Design 3D",
      desc: deps.desc || "",
    };
  },
  head: ({ loaderData }: any) => {
    const title = loaderData?.title || "Will Design 3D";
    const desc = loaderData?.desc?.trim() || "";
    const img = loaderData?.img || "";

    const metaTags: Array<Record<string, string>> = [
      { title },
      { property: "og:title", content: title },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];

    if (desc) {
      metaTags.push(
        { name: "description", content: desc },
        { property: "og:description", content: desc }
      );
    }

    if (img) {
      metaTags.push(
        { property: "og:image", content: img },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: title },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: img }
      );
    }

    return {
      title,
      meta: metaTags,
    };
  },
  component: RefPreviewPage,
});

function RefPreviewPage() {
  const { img, title, desc } = Route.useLoaderData();
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
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {title}
          </h1>
          {desc?.trim() ? (
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {desc.trim()}
            </p>
          ) : null}
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
              {/^https?:\/\//i.test(img) && (
                <a
                  href={img}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition shadow-md"
                  title="Abrir imagen original"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
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
