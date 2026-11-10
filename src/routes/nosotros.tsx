import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Eye, Heart, MapPin, Wrench, ArrowRight, MessageCircle } from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";
import { siteContentQuery, getContactInfo, waLink, pickWhatsapp } from "@/lib/catalog";
import { openExternalUrl } from "@/lib/whatsapp";
import { getWhatsAppPayloadForButton } from "@/lib/whatsapp-buttons";
import { useSiteContent } from "@/hooks/use-site-content";
import { StatCollection } from "@/components/StatCollection";
import { ProductMedia } from "@/components/ProductMedia";
import { UnifiedButton } from "@/components/UnifiedButton";
import { getSeo } from "@/lib/seo";
import { toast } from "sonner";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

function AboutMedia({
  src,
  alt = "",
  fallbackIcon: FallbackIcon,
  color = "var(--brand-orange)",
}: {
  src?: string;
  alt?: string;
  fallbackIcon?: any;
  color?: string;
}) {
  if (src && src.trim()) {
    return (
      <div className="relative overflow-hidden rounded-2xl h-12 w-12 shrink-0 border border-border shadow-xs">
        <ProductMedia src={src.trim()} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }
  if (FallbackIcon) {
    return (
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
        style={{
          background: `color-mix(in oklab, ${color} 15%, white)`,
          color,
        }}
      >
        <FallbackIcon className="h-6 w-6" />
      </div>
    );
  }
  return null;
}

function NosotrosPage() {
  const { content, getText } = useSiteContent();

  const chip = getText("about_chip", "Nuestra historia");
  const title = getText("about_title", "Un taller 3D con alma");
  const subtitle = getText("about_subtitle", "");
  const about = getText("about_long", "") || getText("about_short", "");
  const imageUrl = getText("about_image_url", "") || content?.site_logo_url?.trim();
  const businessName = content?.site_business_name?.trim() || "Will Design 3D";
  const fallbackWhatsapp = getContactInfo(content).whatsapp;
  const globalDefaultMessage = getText("whatsapp_default_message", "");

  // Misión
  const missionTitle = getText("about_mission_title", "Misión");
  const missionText = getText("about_mission_text", "Democratizar la impresión 3D en Colombia con calidad profesional, precios justos y asesoría real.");
  const missionMedia = getText("about_mission_image_url", "");
  const missionCtaText = getText("about_mission_cta_text", "");
  const missionCtaUrl = getText("about_mission_cta_url", "");
  const missionCtaMedia = getText("about_mission_cta_media_url", "");
  const missionCtaMediaMode = getText("about_mission_cta_media_mode", "fill");
  const missionCtaIconUrl = getText("about_mission_cta_icon_url", "");
  const missionCtaIconPos = getText("about_mission_cta_icon_position", "none");
  const missionCtaTextColor = getText("about_mission_cta_text_color", "");
  const missionCtaCustomHex = getText("about_mission_cta_custom_hex", "");
  const missionActionType = getText("about_mission_cta_action_type", "whatsapp");
  const missionWaMsg = getText("about_mission_cta_whatsapp_message", "");
  const missionWaImg = getText("about_mission_cta_whatsapp_image_url", "");

  // Visión
  const visionTitle = getText("about_vision_title", "Visión");
  const visionText = getText("about_vision_text", "Ser el referente colombiano en impresión 3D de gran formato para arte, industria y educación.");
  const visionMedia = getText("about_vision_image_url", "");
  const visionCtaText = getText("about_vision_cta_text", "");
  const visionCtaUrl = getText("about_vision_cta_url", "");
  const visionCtaMedia = getText("about_vision_cta_media_url", "");
  const visionCtaMediaMode = getText("about_vision_cta_media_mode", "fill");
  const visionCtaIconUrl = getText("about_vision_cta_icon_url", "");
  const visionCtaIconPos = getText("about_vision_cta_icon_position", "none");
  const visionCtaTextColor = getText("about_vision_cta_text_color", "");
  const visionCtaCustomHex = getText("about_vision_cta_custom_hex", "");
  const visionActionType = getText("about_vision_cta_action_type", "whatsapp");
  const visionWaMsg = getText("about_vision_cta_whatsapp_message", "");
  const visionWaImg = getText("about_vision_cta_whatsapp_image_url", "");

  // Valores
  const valuesTitle = getText("about_values_title", "Valores");
  const valuesText = getText("about_values_text", "Cercanía, honestidad técnica, y ese cariño que solo un taller familiar (con perro incluido) puede ofrecer.");
  const valuesMedia = getText("about_values_image_url", "");


  // Kiara
  const kiaraTitle = getText("about_kiara_title", "Kiara, nuestra directora de operaciones 🐾");
  const kiaraSubtitle = getText("about_kiara_subtitle", "La verdadera jefa");
  const kiaraText = getText("about_kiara_text", "Pastora alemana de pura raza, aficionada a robar filamento y certificada en levantar el ánimo del equipo. Supervisa cada impresión, aunque su método favorito de control de calidad sea olfatear las piezas al terminar.");
  const kiaraMedia = getText("about_kiara_image_url", "") || kiaraAsset.url;

  // Taller
  const workshopTitle = getText("about_workshop_title", "Equipo profesional en Bogotá");
  const workshopSubtitle = getText("about_workshop_subtitle", "Nuestro taller");
  const workshopText = getText("about_workshop_text", "");
  const workshopMedia = getText("about_workshop_image_url", "");
  const workshopAddress = getText("about_workshop_address", "Bogotá, Colombia · Atención por cita previa.");


  function handleSectionWaClick(itemTitle: string, itemBody: string, customMsg?: string, customMedia?: string, logic?: string, phone?: string) {
    const payload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: customMsg || globalDefaultMessage,
        whatsapp_image_logic: logic || content?.about_cta_whatsapp_image_logic,
      },
      customMedia || imageUrl,
      content?.site_logo_url,
      `Hola Will Design 3D, me interesa saber más sobre ${itemTitle}: ${itemBody}`,
      globalDefaultMessage
    );
    const url = waLink(pickWhatsapp(phone, fallbackWhatsapp), payload.formattedText);
    if (!url) {
      toast.error("Configura WhatsApp en /panel/marca");
      return;
    }
    openExternalUrl(url);
  }

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
            <div className="hidden h-48 w-48 overflow-hidden rounded-3xl border border-border shadow-lg md:block">
              <ProductMedia src={imageUrl} alt={businessName} className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </section>

      {/* Misión, Visión, Valores */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3 md:py-20">
        {/* Card Misión */}
        <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs">
          <div>
            <AboutMedia src={missionMedia} alt={missionTitle} fallbackIcon={Target} color="var(--brand-orange)" />
            <h2 className="mt-4 text-xl font-black">{missionTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{missionText}</p>
          </div>
          <div className="mt-6 pt-2">
            {missionCtaText ? (
              <UnifiedButton
                button={{
                  id: "mission_btn",
                  text: missionCtaText,
                  action_type: missionActionType === "cotizador" ? "link" : (missionActionType as any),
                  action_value:
                    missionActionType === "whatsapp"
                      ? missionCtaUrl || ""
                      : missionActionType === "cotizador"
                      ? "/cotizador"
                      : missionCtaUrl || "/cotizador",
                  whatsapp_message: missionWaMsg,
                  whatsapp_image_url: missionWaImg,
                  text_color: missionCtaTextColor || undefined,
                  custom_hex: missionCtaCustomHex || "var(--brand-orange)",
                  media_url: missionCtaMediaMode === "fill" ? missionCtaMedia : undefined,
                  media_mode: missionCtaMediaMode as any,
                  icon_url: missionCtaIconUrl || (missionCtaMediaMode === "icon" ? missionCtaMedia : undefined),
                  icon_position: missionCtaIconPos !== "none" ? (missionCtaIconPos as any) : (missionCtaMediaMode === "icon" ? "left" : "none"),
                  variant: "default",
                  width: "auto",
                  position: "left",
                }}
                onClick={
                  missionActionType === "whatsapp"
                    ? () => handleSectionWaClick(missionTitle, missionText, missionWaMsg, missionWaImg || missionCtaMedia, content?.about_mission_cta_whatsapp_image_logic, missionCtaUrl)
                    : undefined
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => handleSectionWaClick(missionTitle, missionText, missionWaMsg, missionCtaMedia)}
                className="inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80"
                style={{ color: "var(--brand-orange)" }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Consultar por WhatsApp
              </button>
            )}
          </div>
        </article>

        {/* Card Visión */}
        <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs">
          <div>
            <AboutMedia src={visionMedia} alt={visionTitle} fallbackIcon={Eye} color="var(--brand-teal)" />
            <h2 className="mt-4 text-xl font-black">{visionTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{visionText}</p>
          </div>
          <div className="mt-6 pt-2">
            {visionCtaText ? (
              <UnifiedButton
                button={{
                  id: "vision_btn",
                  text: visionCtaText,
                  action_type: visionActionType === "cotizador" ? "link" : (visionActionType as any),
                  action_value:
                    visionActionType === "whatsapp"
                      ? visionCtaUrl || ""
                      : visionActionType === "cotizador"
                      ? "/cotizador"
                      : visionCtaUrl || "/cotizador",
                  whatsapp_message: visionWaMsg,
                  whatsapp_image_url: visionWaImg,
                  text_color: visionCtaTextColor || undefined,
                  custom_hex: visionCtaCustomHex || "var(--brand-teal)",
                  media_url: visionCtaMediaMode === "fill" ? visionCtaMedia : undefined,
                  media_mode: visionCtaMediaMode as any,
                  icon_url: visionCtaIconUrl || (visionCtaMediaMode === "icon" ? visionCtaMedia : undefined),
                  icon_position: visionCtaIconPos !== "none" ? (visionCtaIconPos as any) : (visionCtaMediaMode === "icon" ? "left" : "none"),
                  variant: "default",
                  width: "auto",
                  position: "left",
                }}
                onClick={
                  visionActionType === "whatsapp"
                    ? () => handleSectionWaClick(visionTitle, visionText, visionWaMsg, visionWaImg || visionCtaMedia, content?.about_vision_cta_whatsapp_image_logic, visionCtaUrl)
                    : undefined
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => handleSectionWaClick(visionTitle, visionText, visionWaMsg, visionCtaMedia)}
                className="inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80"
                style={{ color: "var(--brand-teal)" }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Consultar por WhatsApp
              </button>
            )}
          </div>
        </article>

        {/* Card Valores */}
        <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs">
          <div>
            <AboutMedia src={valuesMedia} alt={valuesTitle} fallbackIcon={Heart} color="var(--brand-wine)" />
            <h2 className="mt-4 text-xl font-black">{valuesTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{valuesText}</p>

            <div className="mt-4"><StatCollection collection="about_values_items" /></div>
          </div>
          <div className="mt-6 pt-2">
            <button
              type="button"
              onClick={() => handleSectionWaClick(valuesTitle, valuesText, "", valuesMedia)}
              className="inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80"
              style={{ color: "var(--brand-wine)" }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Consultar por WhatsApp
            </button>
          </div>
        </article>
      </section>

      {/* Kiara story */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)] md:py-20">
          <div className="relative h-48 w-48 overflow-hidden rounded-full shadow-xl ring-4 ring-[var(--brand-orange)] md:h-60 md:w-60 shrink-0">
            <ProductMedia
              src={kiaraMedia}
              alt={kiaraTitle}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="chip-teal">{kiaraSubtitle}</span>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              {kiaraTitle}
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed whitespace-pre-line">
              {kiaraText}
            </p>
          </div>
        </div>
      </section>

      {/* Taller Section */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <span className="chip-teal">{workshopSubtitle}</span>
            <h2 className="mt-3 text-3xl font-black">
              {workshopTitle}
            </h2>
            {workshopText && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {workshopText}
              </p>
            )}

            <div className="mt-6"><StatCollection collection="about_workshop_items" /></div>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-[var(--brand-wine)] shrink-0" />
                <span>{workshopAddress}</span>
              </li>
            </ul>

            <Link to="/contacto" className="btn-primary mt-6 text-sm">
              Agenda una visita
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative min-h-64 h-full w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl flex items-center justify-center p-4">
            {workshopMedia && workshopMedia.trim() ? (
              <ProductMedia
                src={workshopMedia.trim()}
                alt={workshopTitle}
                className="h-full w-full min-h-64 max-h-[400px] object-cover rounded-2xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <img
                  src="/logo.png"
                  alt={businessName}
                  width={128}
                  height={128}
                  loading="lazy"
                  decoding="async"
                  className="h-32 w-auto object-contain opacity-80"
                />
                <span className="text-xs font-semibold text-muted-foreground">
                  {businessName} — {workshopTitle}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
