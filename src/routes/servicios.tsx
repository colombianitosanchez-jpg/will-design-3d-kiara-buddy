import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  MessageSquare,
} from "lucide-react";
import { KiaraTip } from "@/components/KiaraTip";
import { siteContentQuery } from "@/lib/catalog";
import { quoterServicesQuery, formatCOP } from "@/lib/quoter";
import { accentTokensFor, resolveServicePrimaryAction } from "@/lib/quoter-ui";
import { supabase } from "@/integrations/supabase/client";
import { parseProductButtons } from "@/lib/product-buttons";
import { ProductButtons } from "@/components/ProductButtons";
import { UnifiedButton } from "@/components/UnifiedButton";
import { buildServicesJsonLd, getCanonicalBaseUrl, resolvePageSeo, type ServiceJsonLdInput } from "@/lib/seo";
import { firstStaticShareImage } from "@/lib/share-image";
import { toAbsoluteUrl } from "@/lib/whatsapp-buttons";

export const Route = createFileRoute("/servicios")({
  loader: async ({ context }) => {
    const [siteContent, siteServices] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery()),
      context.queryClient.ensureQueryData(siteServicesQuery()),
    ]);
    return { siteContent, siteServices };
  },
  head: ({
    loaderData,
  }: {
    loaderData?: {
      siteContent?: Record<string, string>;
      siteServices?: Array<ServiceJsonLdInput & { image_url?: string | null }>;
    };
  }) => {
    const siteContent = loaderData?.siteContent;
    const canonicalUrl = `${getCanonicalBaseUrl(siteContent)}/servicios`;
    const seo = resolvePageSeo("servicios", siteContent);
    const servicesJsonLd = buildServicesJsonLd(loaderData?.siteServices, siteContent);
    const serviceFallbackImg = firstStaticShareImage(
      (loaderData?.siteServices ?? []).map((s) => s.image_url),
    );
    const rawOgImage = seo.image || serviceFallbackImg;
    const ogImage = rawOgImage ? toAbsoluteUrl(rawOgImage, siteContent) : "";

    const metaTags: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: canonicalUrl },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];

    if (ogImage) {
      metaTags.push(
        { property: "og:image", content: ogImage },
        { property: "og:image:secure_url", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:image", content: ogImage },
      );
    }

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: canonicalUrl }],
      ...(servicesJsonLd
        ? {
            scripts: [
              {
                type: "application/ld+json",
                children: JSON.stringify(servicesJsonLd),
              },
            ],
          }
        : {}),
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

function ServiceMediaFrame({
  url,
  mediaType,
  title,
  color,
  IconComp,
}: {
  url: string | null;
  mediaType: string;
  title: string;
  color: string;
  IconComp: any;
}) {
  const [broken, setBroken] = useState(false);
  const tokens = accentTokensFor(color);

  if (url && !broken) {
    return (
      <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted">
        {mediaType === "video" ? (
          <video
            src={url}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={url}
            alt={title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="mb-4 flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-border/60"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${tokens.cssVar} 18%, white), color-mix(in oklab, ${tokens.cssVar} 42%, white))`,
        color: tokens.deepVar,
      }}
    >
      <IconComp className="h-14 w-14 opacity-70" />
    </div>
  );
}

function ServiciosPage() {
  const loaderData = Route.useLoaderData();
  const { data: siteContent } = useQuery({
    ...siteContentQuery(),
    initialData: loaderData?.siteContent,
  });
  const { data: dbServices } = useQuery({
    ...siteServicesQuery(),
    initialData: loaderData?.siteServices,
  });
  const { data: quoterServices } = useQuery(quoterServicesQuery());

  const servicesHeaderTitle =
    siteContent?.services_page_title ||
    siteContent?.services_section_title ||
    "Un servicio integral de impresión 3D";
  const servicesHeaderDesc =
    siteContent?.services_page_description ||
    siteContent?.services_section_subtitle ||
    "";

  const servicesList =
    dbServices && dbServices.length > 0
      ? dbServices.map((s: any) => ({
          dbId: s.id,
          id: s.slug || s.id,
          slug: s.slug,
          title: s.title,
          lead: s.lead,
          icon: iconMap[s.icon] || Printer,
          color: s.color || "orange",
          image_url: s.image_url,
          media_type: s.media_type || "image",
          contact_mode: s.contact_mode,
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to="/cotizador" className="btn-primary text-sm">
              Abrir cotizador en línea
              <ArrowRight className="h-4 w-4" />
            </Link>
            <ShareButton
              title={`Servicios — ${siteContent?.site_business_name || "Will Design 3D"}`}
              text="Mira nuestros servicios"
              url={`${getCanonicalBaseUrl(siteContent)}/servicios`}
              label="Compartir"
              className="gap-2 text-muted-foreground"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 md:py-20">
        {servicesList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <Printer className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">No hay servicios configurados</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Los servicios se administran desde el panel de control o puedes ir directamente al cotizador.
            </p>
            <Link to="/cotizador" className="btn-outline mt-5 inline-flex text-sm">
              Ir al cotizador en línea
            </Link>
          </div>
        ) : (
          servicesList.map((s: any, i: number) => {
            const tokens = accentTokensFor(s.color);
            const flip = i % 2 === 1;
            const IconComp = s.icon || Printer;
            const primaryAction = resolveServicePrimaryAction({
              serviceTitle: s.title,
              serviceSlug: s.slug || s.id,
              contactMode: s.contact_mode,
              quoterServiceId: s.quoter_service_id,
              whatsappTemplate: s.whatsapp_template,
              quoterServices: quoterServices ?? [],
              businessName: siteContent?.site_business_name,
            });

            return (
              <article
                key={s.id}
                id={s.id}
                className={`scroll-mt-24 grid items-start gap-8 md:grid-cols-2 ${
                  flip ? "md:[&>div:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div
                    className="grid h-14 w-14 place-items-center rounded-2xl border"
                    style={{
                      background: tokens.softBg,
                      color: tokens.deepVar,
                      borderColor: tokens.borderSoft,
                    }}
                  >
                    <IconComp className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-2xl font-black sm:text-3xl text-foreground">
                    {s.title}
                  </h2>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{s.lead}</p>

                  {s.bullets.length > 0 && (
                    <ul className="mt-5 space-y-2.5">
                      {s.bullets.map((b: string) => (
                        <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0"
                            style={{ color: tokens.deepVar }}
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.requires_file && (
                    <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
                      <FileUp className="h-4 w-4 shrink-0 text-amber-700" />
                      <span>
                        Puedes enviar o adjuntar tus archivos (STL, imágenes o bocetos) al contactarnos.
                      </span>
                    </div>
                  )}

                  {s.custom_buttons && s.custom_buttons.length > 0 ? (
                    <div className="mt-6">
                      <ProductButtons
                        buttons={s.custom_buttons}
                        service={{
                          id: s.dbId,
                          slug: s.slug || s.id,
                          title: s.title,
                          whatsappTemplate: s.whatsapp_template,
                          note: s.lead,
                        }}
                        extraWhatsappNote={s.whatsapp_template || s.lead || undefined}
                      />
                    </div>
                  ) : primaryAction.kind === "quoter" ? (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        to="/cotizador"
                        search={{ servicio: primaryAction.quoterSlug }}
                        className="btn-primary text-sm"
                      >
                        {primaryAction.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      {primaryAction.minPriceCop > 0 && (
                        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                          Desde {formatCOP(primaryAction.minPriceCop)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <UnifiedButton
                        button={{ id: `service-${s.dbId}`, text: primaryAction.label, variant: "default", width: "auto", position: "left", action_type: "whatsapp", action_value: "", whatsapp_message: primaryAction.message, capture_order: true }}
                        service={{ id: s.dbId, slug: s.slug || s.id, title: s.title, note: s.lead }}
                        extraWhatsappNote={primaryAction.message}
                        className="text-sm"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {primaryAction.label}
                        <ArrowRight className="h-4 w-4" />
                      </UnifiedButton>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
                  <ServiceMediaFrame
                    url={s.image_url}
                    mediaType={s.media_type}
                    title={s.title}
                    color={s.color}
                    IconComp={IconComp}
                  />
                  <KiaraTip tip={s.kiaraTip} />
                </div>
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
