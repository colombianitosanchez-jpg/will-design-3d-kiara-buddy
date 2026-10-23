import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Target, Eye, Heart, MapPin, Wrench, ArrowRight } from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";
import { siteContentQuery } from "@/lib/catalog";
import { getSeo } from "@/lib/seo";
import { AboutMedia } from "@/components/AboutMedia";
import { UnifiedButton } from "@/components/UnifiedButton";
import { parseValuesItems, parseWorkshopItems } from "@/routes/panel.contenido";

export const Route = createFileRoute("/nosotros")({
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.ensureQueryData(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const seo = getSeo(
      {
        title: siteContent?.site_title ? `Nosotros · ${siteContent.site_title}` : "Nosotros — Will Design 3D",
        about_short: siteContent?.about_short,
      },
      siteContent
    );

    const metaTags: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: "https://willdesign3d.com/nosotros" },
    ];

    if (seo.image) {
      metaTags.push(
        { property: "og:image", content: seo.image },
        { name: "twitter:image", content: seo.image }
      );
    }

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: "https://willdesign3d.com/nosotros" }],
    };
  },
  component: NosotrosPage,
});

function NosotrosPage() {
  const { data: content } = useQuery(siteContentQuery());
  const chip = content?.about_chip?.trim() || "Nuestra historia";
  const title = content?.about_title?.trim() || "Un taller 3D con alma";
  const subtitle = content?.about_subtitle?.trim() || "";
  const about = content?.about_long?.trim() || content?.about_short?.trim() || "";
  const imageUrl = content?.about_image_url?.trim() || content?.site_logo_url?.trim();
  const businessName = content?.site_business_name?.trim() || "Will Design 3D";

  // Misión
  const missionTitle = content?.about_mission_title?.trim() || "Misión";
  const missionText =
    content?.about_mission_text?.trim() ||
    "Democratizar la impresión 3D en Colombia con calidad profesional, precios justos y asesoría real.";
  const missionMedia = content?.about_mission_image_url?.trim() || "";
  const missionCtaText = content?.about_mission_cta_text?.trim() || "";
  const missionCtaUrl = content?.about_mission_cta_url?.trim() || "";
  const missionCtaMedia = content?.about_mission_cta_media_url?.trim() || "";

  // Visión
  const visionTitle = content?.about_vision_title?.trim() || "Visión";
  const visionText =
    content?.about_vision_text?.trim() ||
    "Ser el referente colombiano en impresión 3D de gran formato para arte, industria y educación.";
  const visionMedia = content?.about_vision_image_url?.trim() || "";
  const visionCtaText = content?.about_vision_cta_text?.trim() || "";
  const visionCtaUrl = content?.about_vision_cta_url?.trim() || "";
  const visionCtaMedia = content?.about_vision_cta_media_url?.trim() || "";

  // Valores
  const valuesTitle = content?.about_values_title?.trim() || "Valores";
  const valuesItems = parseValuesItems(content?.about_values_items);

  // Kiara
  const kiaraTitle = content?.about_kiara_title?.trim() || "La verdadera jefa";
  const kiaraSubtitle =
    content?.about_kiara_subtitle?.trim() ||
    "Kiara, nuestra directora de operaciones 🐾";
  const kiaraText =
    content?.about_kiara_text?.trim() ||
    "Pastora alemana de pura raza, aficionada a robar filamento y certificada en levantar el ánimo del equipo. Supervisa cada impresión, aunque su método favorito de control de calidad sea olfatear las piezas al terminar.";
  const kiaraMedia = content?.about_kiara_image_url?.trim() || kiaraAsset.url;

  // Taller
  const workshopTitle = content?.about_workshop_title?.trim() || "Nuestro Taller";
  const workshopSubtitle = "Equipo profesional en Bogotá";
  const workshopItems = parseWorkshopItems(content?.about_workshop_items);
  const workshopMedia = content?.about_workshop_image_url?.trim() || "";
  const workshopAddress =
    content?.about_workshop_address?.trim() ||
    "Bogotá, Colombia · Atención por cita previa.";

  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:py-20">
          <div>
            <span className="chip-teal">{chip}</span>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-xl font-medium text-foreground">
                {subtitle}
              </p>
            )}
            {about && (
              <p className="mt-4 max-w-2xl text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                {about}
              </p>
            )}
          </div>
          {imageUrl && (
            <div className="hidden h-48 w-48 overflow-hidden rounded-3xl shadow-lg md:block">
              <AboutMedia
                src={imageUrl}
                alt={businessName}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Misión */}
          <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-4">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl overflow-hidden"
                  style={{
                    background: `color-mix(in oklab, var(--brand-orange) 15%, white)`,
                    color: "var(--brand-orange)",
                  }}
                >
                  <AboutMedia
                    src={missionMedia}
                    alt={missionTitle}
                    fallbackIcon={Target}
                    fallbackIconClassName="h-6 w-6 text-[var(--brand-orange)]"
                    className="h-full w-full object-cover"
                  />
                </div>
                <h2 className="text-2xl font-black">{missionTitle}</h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {missionText}
              </p>
            </div>
            {missionCtaText && missionCtaUrl && (
              <div className="mt-6">
                <UnifiedButton
                  button={{
                    id: "mission_cta",
                    text: missionCtaText,
                    action_type: /^https?:\/\//i.test(missionCtaUrl) || missionCtaUrl.startsWith("/") ? "link" : "link",
                    action_value: missionCtaUrl,
                    media_url: missionCtaMedia,
                  }}
                  styleOverride={{
                    iconPosition: missionCtaMedia ? "left" : "none",
                    iconUrl: missionCtaMedia,
                  }}
                />
              </div>
            )}
          </article>

          {/* Visión */}
          <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-4">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl overflow-hidden"
                  style={{
                    background: `color-mix(in oklab, var(--brand-teal) 15%, white)`,
                    color: "var(--brand-teal)",
                  }}
                >
                  <AboutMedia
                    src={visionMedia}
                    alt={visionTitle}
                    fallbackIcon={Eye}
                    fallbackIconClassName="h-6 w-6 text-[var(--brand-teal)]"
                    className="h-full w-full object-cover"
                  />
                </div>
                <h2 className="text-2xl font-black">{visionTitle}</h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {visionText}
              </p>
            </div>
            {visionCtaText && visionCtaUrl && (
              <div className="mt-6">
                <UnifiedButton
                  button={{
                    id: "vision_cta",
                    text: visionCtaText,
                    action_type: /^https?:\/\//i.test(visionCtaUrl) || visionCtaUrl.startsWith("/") ? "link" : "link",
                    action_value: visionCtaUrl,
                    media_url: visionCtaMedia,
                  }}
                  styleOverride={{
                    iconPosition: visionCtaMedia ? "left" : "none",
                    iconUrl: visionCtaMedia,
                  }}
                />
              </div>
            )}
          </article>
        </div>
      </section>

      {/* Valores */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <div className="text-center">
            <span className="chip-teal">{valuesTitle}</span>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Lo que impulsa nuestro taller
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {valuesItems.map((val, idx) => {
              const colors = [
                "var(--brand-orange)",
                "var(--brand-teal)",
                "var(--brand-wine)",
              ];
              const col = colors[idx % colors.length];
              return (
                <article
                  key={val.id}
                  className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col items-start"
                >
                  <div
                    className="grid h-12 w-12 place-items-center rounded-2xl overflow-hidden shrink-0"
                    style={{
                      background: `color-mix(in oklab, ${col} 15%, white)`,
                      color: col,
                    }}
                  >
                    <AboutMedia
                      src={val.icon_url}
                      alt={val.title}
                      fallbackIcon={Heart}
                      fallbackIconClassName="h-6 w-6"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <h3 className="mt-4 text-xl font-black">{val.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {val.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Kiara story */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)] md:py-20">
          <div className="relative h-48 w-48 overflow-hidden rounded-full shadow-xl ring-4 ring-[var(--brand-orange)] md:h-60 md:w-60 shrink-0">
            <AboutMedia
              src={kiaraMedia}
              alt="Kiara, la jefa"
              fallbackLogoUrl="/logo.png"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="chip-teal">{kiaraTitle}</span>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              {kiaraSubtitle}
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {kiaraText}
            </p>
          </div>
        </div>
      </section>

      {/* Taller */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <span className="chip-teal">{workshopTitle}</span>
            <h2 className="mt-3 text-3xl font-black">{workshopSubtitle}</h2>
            <ul className="mt-6 space-y-4 text-sm">
              {workshopItems.map((item, idx) => {
                const colors = [
                  "var(--brand-orange)",
                  "var(--brand-teal)",
                  "var(--brand-wine)",
                ];
                const col = colors[idx % colors.length];
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <Wrench className="mt-0.5 h-5 w-5 shrink-0" style={{ color: col }} />
                    <div>
                      <span className="font-bold text-foreground block">{item.title}</span>
                      <span className="text-muted-foreground">{item.text}</span>
                    </div>
                  </li>
                );
              })}
              {workshopAddress && (
                <li className="flex items-start gap-3 pt-2">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-wine)]" />
                  <span className="font-medium">{workshopAddress}</span>
                </li>
              )}
            </ul>
            <Link to="/contacto" className="btn-primary mt-6 text-sm inline-flex items-center gap-2">
              Agenda una visita
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative min-h-64 h-80 w-full overflow-hidden rounded-3xl border border-border shadow-md bg-muted">
            {workshopMedia ? (
              <AboutMedia
                src={workshopMedia}
                alt={workshopTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center p-6 bg-gradient-to-br from-[var(--brand-teal)]/20 to-[var(--brand-wine)]/30">
                <img
                  src="/logo.png"
                  alt="Will Design 3D Logo"
                  className="h-32 w-auto object-contain opacity-80 filter drop-shadow-md"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
