import { createFileRoute, Link } from "@tanstack/react-router";
import { ShareButton } from "@/components/ShareButton";
import { useQuery, queryOptions } from "@tanstack/react-query";
import {
  Boxes,
  Wrench,
  PenTool,
  Sparkles,
  Ruler,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  ScanLine,
  GraduationCap,
  Printer,
  FileUp,
} from "lucide-react";
import { KiaraTip } from "@/components/KiaraTip";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { quoterServicesQuery, formatCOP } from "@/lib/quoter";
import { supabase } from "@/integrations/supabase/client";
import { parseProductButtons } from "@/lib/product-buttons";
import { ProductButtons } from "@/components/ProductButtons";

export const Route = createFileRoute("/servicios")({
  loader: async ({ context }) => {
    const [siteContent] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery()),
      context.queryClient.ensureQueryData(siteServicesQuery()),
    ]);
    return { siteContent };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const title = siteContent?.seo_services_title || siteContent?.site_title || "Servicios — Will Design 3D";
    const desc = siteContent?.seo_services_description || siteContent?.site_description || "";
    const image = siteContent?.seo_services_image || siteContent?.site_meta_thumbnail_url || siteContent?.site_logo_url || "";

    const metaTags: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: "https://will-design-3d.lovable.app/servicios" },
    ];

    if (image) {
      metaTags.push(
        { property: "og:image", content: image },
        { name: "twitter:image", content: image }
      );
    }

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: "https://will-design-3d.lovable.app/servicios" }],
    };
  },
  component: ServiciosPage,
});

export const siteServicesQuery = () =>
  queryOptions({
    queryKey: ["site-services-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error || !data) return [];
      return data;
    },
    staleTime: 60_000,
  });

const colorFor = (a: string) =>
  a === "orange"
    ? "var(--brand-orange)"
    : a === "teal"
      ? "var(--brand-teal)"
      : "var(--brand-wine)";

const iconMap: Record<string, any> = {
  printer: Printer,
  boxes: Boxes,
  "pencil-ruler": PenTool,
  wrench: Wrench,
  "scan-line": ScanLine,
  sparkles: Sparkles,
  ruler: Ruler,
  "shopping-bag": ShoppingBag,
  "graduation-cap": GraduationCap,
};

function ServiciosPage() {
  const { data: siteContent } = useQuery(siteContentQuery());
  const { data: dbServices } = useQuery(siteServicesQuery());
  const { data: quoterServices } = useQuery(quoterServicesQuery());
  const contact = getContactInfo(siteContent);

  const servicesHeaderTitle = siteContent?.services_page_title || "Un servicio integral de impresión 3D";
  const servicesHeaderDesc = siteContent?.services_page_description || "";

  const quoterFor = (idOrSlug: string, quoterId?: string | null) => {
    if (quoterId) {
      const found = (quoterServices ?? []).find((q) => q.id === quoterId);
      if (found) return found;
    }
    return (quoterServices ?? []).find((s) => s.slug === idOrSlug || s.site_anchor === idOrSlug) ?? null;
  };

  const servicesList = (dbServices && dbServices.length > 0)
    ? dbServices.map((s: any) => ({
        id: s.slug || s.id,
        slug: s.slug,
        title: s.title,
        lead: s.lead,
        icon: iconMap[s.icon] || Printer,
        color: s.color || "orange",
        image_url: s.image_url,
        media_type: s.media_type || "image",
        quoter_service_id: s.quoter_service_id,
        whatsapp_template: s.whatsapp_template,
        requires_file: Boolean(s.requires_file),
        bullets: Array.isArray(s.bullets) ? (s.bullets as string[]) : [],
        kiaraTip: s.kiara_tip,
        custom_buttons: parseProductButtons(s.custom_buttons),
      }))
    : [];

  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <span className="chip-teal">Servicios</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
            {servicesHeaderTitle}
          </h1>
          {servicesHeaderDesc && (
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {servicesHeaderDesc}
            </p>
          )}
          <ShareButton
            title={`Servicios — ${siteContent?.site_business_name || "Will Design 3D"}`}
            text="Mira nuestros servicios"
            url="https://will-design-3d.lovable.app/servicios"
            label="Compartir"
            className="mt-4 gap-2 text-muted-foreground"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 md:py-20">
        {servicesList.map((s: any, i: number) => {
          const c = colorFor(s.color);
          const flip = i % 2 === 1;
          const IconComp = s.icon || Printer;

          return (
            <article
              key={s.id}
              id={s.id}
              className={`scroll-mt-24 grid items-start gap-8 md:grid-cols-2 ${flip ? "md:[&>div:first-child]:order-2" : ""}`}
            >
              <div>
                <div
                  className="grid h-14 w-14 place-items-center rounded-2xl"
                  style={{
                    background: `color-mix(in oklab, ${c} 15%, white)`,
                    color: c,
                  }}
                >
                  <IconComp className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                  {s.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{s.lead}</p>

                {s.bullets.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {s.bullets.map((b: string) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: c }}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.requires_file && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <FileUp className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Puedes enviar o adjuntar tus archivos (STL, imágenes o bocetos) al contactarnos.</span>
                  </div>
                )}

                {s.custom_buttons && s.custom_buttons.length > 0 ? (
                  <div className="mt-6">
                    <ProductButtons buttons={s.custom_buttons} />
                  </div>
                ) : (
                  (() => {
                    const q = quoterFor(s.slug || s.id, s.quoter_service_id);
                    const hasCalc = q ? q.has_calculator !== false : false;
                    if (q && hasCalc) {
                      return (
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <Link
                            to="/cotizador"
                            search={{ servicio: q.slug }}
                            className="btn-primary text-sm"
                          >
                            Cotizar en línea
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          {q.min_price_cop > 0 && (
                            <span className="text-xs font-semibold text-muted-foreground">
                              Desde {formatCOP(q.min_price_cop)}
                            </span>
                          )}
                        </div>
                      );
                    }
                    const customMsg = s.whatsapp_template || q?.whatsapp_custom_message ||
                      `Hola ${siteContent?.site_business_name || "Will Design 3D"}! Me interesa solicitar información y cotización sobre el servicio: *${s.title}*`;
                    return (
                      <a
                        href={waLink(contact.whatsapp, customMsg)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary mt-6 text-sm inline-flex items-center gap-2"
                      >
                        Cotizar por WhatsApp
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    );
                  })()
                )}
              </div>

              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                {s.image_url ? (
                  <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted border border-border">
                    {s.media_type === "video" ? (
                      <video
                        src={s.image_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={s.image_url}
                        alt={s.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className="mb-4 aspect-[4/3] w-full rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in oklab, ${c} 30%, white), color-mix(in oklab, ${c} 70%, white))`,
                    }}
                  />
                )}
                <KiaraTip tip={s.kiaraTip} />
              </div>
            </article>
          );
        })}
      </section>

    </>
  );
}
