import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calculator, ExternalLink, Image as ImageIcon, Box } from "lucide-react";
import { useSiteContent } from "@/hooks/use-site-content";
import { REVERSE_REF_ALIASES } from "@/lib/whatsapp-buttons";
import { resolveStatShareImage } from "@/lib/stat-share-image";

export const Route = createFileRoute("/r/$slug")({
  loader: async ({ params }) => {
    let img = "";
    const rawSlug = (params.slug || "").trim();
    const lowerSlug = rawSlug.toLowerCase();

    const { supabase } = await import("@/integrations/supabase/client");

    if (/^(?:(?:s|stat|a|v|t)\d+|stat_[a-z0-9_]+)$/i.test(rawSlug)) {
      const { data } = await supabase.from("site_content").select("key,value").in("key", ["hero_stats", "about_stats", "about_values_items", "about_workshop_items"]);
      img = resolveStatShareImage(rawSlug, Object.fromEntries((data || []).map(row => [row.key, row.value]))) || "";
      return { img, title: "Will Design 3D", desc: "" };
    }

    // 2. Botones del Hero: formato heroN, hN (ej: hero1, hero2, hero3, h1, h2, h3, o "hero")
    const heroBtnMatch = lowerSlug.match(/^(?:h|hero)(\d+)$/i);
    const isHeroAlias = lowerSlug === "hero" || Boolean(heroBtnMatch);

    if (!img && isHeroAlias) {
      const targetIndex = heroBtnMatch ? parseInt(heroBtnMatch[1], 10) - 1 : 0;
      if (targetIndex >= 0) {
        const { data } = await supabase
          .from("site_content")
          .select("key, value")
          .in("key", [
            "hero_buttons",
            "hero_cta_whatsapp_image_url",
            "hero_secondary_cta_whatsapp_image_url",
          ]);

        const contentMap: Record<string, string> = {};
        for (const row of data || []) {
          if (row.key && row.value) {
            contentMap[row.key] = String(row.value);
          }
        }

        // Primero verificar si hero_buttons existe en JSON
        let hasModernButtons = false;
        if (contentMap.hero_buttons) {
          try {
            const arr = JSON.parse(contentMap.hero_buttons);
            hasModernButtons = Array.isArray(arr);
            if (Array.isArray(arr) && targetIndex < arr.length) {
              const btn = arr[targetIndex];
              if (btn && typeof btn === "object" && btn.whatsapp_image_url) {
                img = String(btn.whatsapp_image_url).trim();
              }
            }
          } catch {
            /* ignore */
          }
        }

        // Si no se resolvió por hero_buttons, usar fallback a claves legadas
        if (!img && !hasModernButtons) {
          if (targetIndex === 0 && contentMap.hero_cta_whatsapp_image_url) {
            img = contentMap.hero_cta_whatsapp_image_url.trim();
          } else if (targetIndex === 1 && contentMap.hero_secondary_cta_whatsapp_image_url) {
            img = contentMap.hero_secondary_cta_whatsapp_image_url.trim();
          }
        }
      }
    }

    if (isHeroAlias) return { img, title: "Will Design 3D", desc: "" };

    // 3. Si no se resolvió como estadística ni botón Hero, resolver por alias de botones o claves directas
    if (!img) {
      const key = REVERSE_REF_ALIASES[lowerSlug] || lowerSlug;
      const candidateKeys = [key];

      if (lowerSlug === "hero" || lowerSlug === "h1") {
        candidateKeys.push("hero_cta_whatsapp_image_url");
      }
      if (lowerSlug === "hero2" || lowerSlug === "h2") {
        candidateKeys.push("hero_secondary_cta_whatsapp_image_url");
      }
      if (lowerSlug === "nosotros") {
        candidateKeys.push("about_cta_whatsapp_image_url", "nosotros_whatsapp_image_url");
      }
      if (lowerSlug === "mision") {
        candidateKeys.push("about_mission_cta_whatsapp_image_url", "mision_whatsapp_image_url");
      }
      if (lowerSlug === "vision") {
        candidateKeys.push("about_vision_cta_whatsapp_image_url", "vision_whatsapp_image_url");
      }
      if (lowerSlug === "logo") {
        candidateKeys.push("site_logo_url");
      }

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
      title: "Will Design 3D",
      desc: "",
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

    if (true) {
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
  component: ShortRefPreviewPage,
});

function ShortRefPreviewPage() {
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
