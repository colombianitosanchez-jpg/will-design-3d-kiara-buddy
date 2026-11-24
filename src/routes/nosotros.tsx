import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Target, Eye, Heart, MapPin, MessageCircle, PawPrint, Factory } from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";
import { siteContentQuery, getContactInfo, waLink, pickWhatsapp } from "@/lib/catalog";
import { openExternalUrl } from "@/lib/whatsapp";
import { getWhatsAppPayloadForButton } from "@/lib/whatsapp-buttons";
import { parseAboutButtons, type AboutButtonItem } from "@/lib/about-buttons";
import { useSiteContent } from "@/hooks/use-site-content";
import { StatCollection } from "@/components/StatCollection";
import { ProductMedia } from "@/components/ProductMedia";
import { UnifiedButton } from "@/components/UnifiedButton";
import { getCanonicalBaseUrl, resolvePageSeo } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/nosotros")({
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.ensureQueryData(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: { loaderData?: { siteContent?: Record<string, string> } }) => {
    const siteContent = loaderData?.siteContent;
    const canonicalUrl = `${getCanonicalBaseUrl(siteContent)}/nosotros`;
    const seo = resolvePageSeo("nosotros", siteContent);

    const metaTags: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: canonicalUrl },
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
      links: [{ rel: "canonical", href: canonicalUrl }],
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
  const iconBox = FallbackIcon ? (
    <div
      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border/60"
      style={{
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        color,
      }}
    >
      <FallbackIcon className="h-6 w-6" aria-hidden="true" />
    </div>
  ) : null;

  if (src && src.trim()) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-border shadow-xs">
        <ProductMedia
          src={src.trim()}
          alt={alt}
          className="h-full w-full object-cover"
          fallback={iconBox}
        />
      </div>
    );
  }
  return iconBox;
}

function NosotrosPage() {
  const router = useRouter();
  const { content, getText } = useSiteContent();

  const chip = getText("about_chip") || "Nuestra historia";
  const title = getText("about_title") || "Un taller 3D con alma";
  const subtitle = getText("about_subtitle", "");
  const about =
    getText("about_long") ||
    getText("about_short") ||
    "Diseño, ingeniería y fabricación aditiva desde Bogotá, Colombia, con asesoría técnica cercana en cada proyecto.";
  const imageUrl = getText("about_image_url") || content?.site_logo_url?.trim() || "";
  const businessName = content?.site_business_name?.trim() || "Will Design 3D";
  const fallbackWhatsapp = getContactInfo(content).whatsapp;
  const globalDefaultMessage = getText("whatsapp_default_message", "");
  const aboutButtons = parseAboutButtons(content);

  const parseNum = (val: string) => {
    const n = Number(val);
    return val.trim() !== "" && Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : undefined;
  };

  // Misión
  const missionTitle = getText("about_mission_title") || "Misión";
  const missionText =
    getText("about_mission_text") ||
    "Democratizar la impresión 3D en Colombia con calidad profesional, precios justos y asesoría real.";
  const missionMedia = getText("about_mission_image_url", "");
  const missionCtaText = getText("about_mission_cta_text", "");
  const missionCtaUrl = getText("about_mission_cta_url", "");
  const missionCtaMedia = getText("about_mission_cta_media_url", "");
  const missionCtaMediaMode = getText("about_mission_cta_media_mode") || "fill";
  const missionCtaMediaFit = getText("about_mission_cta_media_fit") || "cover";
  const missionCtaIconUrl = getText("about_mission_cta_icon_url", "");
  const missionCtaIconPos = getText("about_mission_cta_icon_position") || "none";
  const missionCtaIconShape = getText("about_mission_cta_icon_shape") || "circle";
  const missionCtaTextColor = getText("about_mission_cta_text_color", "");
  const missionCtaCustomHex = getText("about_mission_cta_custom_hex", "");
  const missionCtaShade = parseNum(getText("about_mission_cta_shade", ""));
  const missionCtaWidth = (getText("about_mission_cta_width") || "auto") as "auto" | "full";
  const missionActionType = getText("about_mission_cta_action_type") || "whatsapp";
  const missionWaMsg = getText("about_mission_cta_whatsapp_message", "");
  const missionWaImg = getText("about_mission_cta_whatsapp_image_url", "");

  // Visión
  const visionTitle = getText("about_vision_title") || "Visión";
  const visionText =
    getText("about_vision_text") ||
    "Ser el referente colombiano en impresión 3D de gran formato para arte, industria y educación.";
  const visionMedia = getText("about_vision_image_url", "");
  const visionCtaText = getText("about_vision_cta_text", "");
  const visionCtaUrl = getText("about_vision_cta_url", "");
  const visionCtaMedia = getText("about_vision_cta_media_url", "");
  const visionCtaMediaMode = getText("about_vision_cta_media_mode") || "fill";
  const visionCtaMediaFit = getText("about_vision_cta_media_fit") || "cover";
  const visionCtaIconUrl = getText("about_vision_cta_icon_url", "");
  const visionCtaIconPos = getText("about_vision_cta_icon_position") || "none";
  const visionCtaIconShape = getText("about_vision_cta_icon_shape") || "circle";
  const visionCtaTextColor = getText("about_vision_cta_text_color", "");
  const visionCtaCustomHex = getText("about_vision_cta_custom_hex", "");
  const visionCtaShade = parseNum(getText("about_vision_cta_shade", ""));
  const visionCtaWidth = (getText("about_vision_cta_width") || "auto") as "auto" | "full";
  const visionActionType = getText("about_vision_cta_action_type") || "whatsapp";
  const visionWaMsg = getText("about_vision_cta_whatsapp_message", "");
  const visionWaImg = getText("about_vision_cta_whatsapp_image_url", "");

  // Valores
  const valuesTitle = getText("about_values_title") || "Valores";
  const valuesText =
    getText("about_values_text") ||
    "Cercanía, honestidad técnica, y ese cariño que solo un taller familiar (con perro incluido) puede ofrecer.";
  const valuesMedia = getText("about_values_image_url", "");
  const valuesCtaText = getText("about_values_cta_text", "");
  const valuesCtaUrl = getText("about_values_cta_url", "");
  const valuesCtaMedia = getText("about_values_cta_media_url", "");
  const valuesCtaMediaMode = getText("about_values_cta_media_mode") || "fill";
  const valuesCtaMediaFit = getText("about_values_cta_media_fit") || "cover";
  const valuesCtaIconUrl = getText("about_values_cta_icon_url", "");
  const valuesCtaIconPos = getText("about_values_cta_icon_position") || "none";
  const valuesCtaIconShape = getText("about_values_cta_icon_shape") || "circle";
  const valuesCtaTextColor = getText("about_values_cta_text_color", "");
  const valuesCtaCustomHex = getText("about_values_cta_custom_hex", "");
  const valuesCtaShade = parseNum(getText("about_values_cta_shade", ""));
  const valuesCtaWidth = (getText("about_values_cta_width") || "auto") as "auto" | "full";
  const valuesActionType = getText("about_values_cta_action_type") || "whatsapp";
  const valuesWaMsg = getText("about_values_cta_whatsapp_message", "");
  const valuesWaImg = getText("about_values_cta_whatsapp_image_url", "");

  // Kiara
  const kiaraTitle = getText("about_kiara_title") || "Kiara, nuestra directora de operaciones 🐾";
  const kiaraSubtitle = getText("about_kiara_subtitle") || "La verdadera jefa";
  const kiaraText =
    getText("about_kiara_text") ||
    "Pastora alemana de pura raza, aficionada a robar filamento y certificada en levantar el ánimo del equipo. Supervisa cada impresión, aunque su método favorito de control de calidad sea olfatear las piezas al terminar.";
  const kiaraMedia = getText("about_kiara_image_url") || kiaraAsset.url;
  const kiaraCtaText = getText("about_kiara_cta_text", "");
  const kiaraCtaUrl = getText("about_kiara_cta_url", "");
  const kiaraCtaMedia = getText("about_kiara_cta_media_url", "");
  const kiaraCtaMediaMode = getText("about_kiara_cta_media_mode") || "fill";
  const kiaraCtaMediaFit = getText("about_kiara_cta_media_fit") || "cover";
  const kiaraCtaIconUrl = getText("about_kiara_cta_icon_url", "");
  const kiaraCtaIconPos = getText("about_kiara_cta_icon_position") || "none";
  const kiaraCtaIconShape = getText("about_kiara_cta_icon_shape") || "circle";
  const kiaraCtaTextColor = getText("about_kiara_cta_text_color", "");
  const kiaraCtaCustomHex = getText("about_kiara_cta_custom_hex", "");
  const kiaraCtaShade = parseNum(getText("about_kiara_cta_shade", ""));
  const kiaraCtaWidth = (getText("about_kiara_cta_width") || "auto") as "auto" | "full";
  const kiaraActionType = getText("about_kiara_cta_action_type") || "whatsapp";
  const kiaraWaMsg = getText("about_kiara_cta_whatsapp_message", "");
  const kiaraWaImg = getText("about_kiara_cta_whatsapp_image_url", "");

  // Taller
  const workshopTitle = getText("about_workshop_title") || "Equipo profesional en Bogotá";
  const workshopSubtitle = getText("about_workshop_subtitle") || "Nuestro taller";
  const workshopText = getText("about_workshop_text", "");
  const workshopMedia = getText("about_workshop_image_url", "");
  const workshopAddress =
    getText("about_workshop_address") || "Bogotá, Colombia · Atención por cita previa.";
  const workshopCtaText = getText("about_workshop_cta_text", "");
  const workshopCtaUrl = getText("about_workshop_cta_url", "");
  const workshopCtaMedia = getText("about_workshop_cta_media_url", "");
  const workshopCtaMediaMode = getText("about_workshop_cta_media_mode") || "fill";
  const workshopCtaMediaFit = getText("about_workshop_cta_media_fit") || "cover";
  const workshopCtaIconUrl = getText("about_workshop_cta_icon_url", "");
  const workshopCtaIconPos = getText("about_workshop_cta_icon_position") || "none";
  const workshopCtaIconShape = getText("about_workshop_cta_icon_shape") || "circle";
  const workshopCtaTextColor = getText("about_workshop_cta_text_color", "");
  const workshopCtaCustomHex = getText("about_workshop_cta_custom_hex", "");
  const workshopCtaShade = parseNum(getText("about_workshop_cta_shade", ""));
  const workshopCtaWidth = (getText("about_workshop_cta_width") || "auto") as "auto" | "full";
  const workshopActionType = getText("about_workshop_cta_action_type") || "link";
  const workshopWaMsg = getText("about_workshop_cta_whatsapp_message", "");
  const workshopWaImg = getText("about_workshop_cta_whatsapp_image_url", "");

  function handleAboutButtonClick(btn: AboutButtonItem, index: number) {
    const actionType = btn.action_type || "link";
    const actionVal = btn.action_value || "";

    if (actionType === "whatsapp") {
      const effectiveFallback = btn.whatsapp_message?.trim()
        ? undefined
        : "Hola Will Design 3D, me interesa conocer más sobre ustedes.";
      const shortKey = index === 0 ? "nosotros" : `n${index + 1}`;
      const payload = getWhatsAppPayloadForButton(
        {
          whatsapp_message: btn.whatsapp_message,
          whatsapp_image_logic: btn.whatsapp_image_logic || "auto",
          whatsapp_image_url: btn.whatsapp_image_url,
          whatsapp_image_key: shortKey,
        },
        btn.media_url || imageUrl,
        content?.site_logo_url,
        effectiveFallback,
        globalDefaultMessage,
        content
      );
      const targetPhone = pickWhatsapp(btn.whatsapp_number || actionVal, fallbackWhatsapp);
      const waUrl = waLink(targetPhone, payload.formattedText);
      if (!waUrl) {
        toast.error("Configura WhatsApp en /panel/marca");
        return;
      }
      openExternalUrl(waUrl);
    } else if (actionType === "cotizador" || actionVal === "/cotizador") {
      router.navigate({ to: "/cotizador" });
    } else {
      const val = actionVal.trim();
      if (!val) return;
      if (/^https?:\/\//i.test(val)) {
        window.open(val, "_blank", "noopener,noreferrer");
      } else {
        router.navigate({ to: val.startsWith("/") ? (val as any) : (`/${val}` as any) });
      }
    }
  }

  function handleSectionWaClick(itemTitle: string, itemBody: string, customMsg?: string, customMedia?: string, logic?: string, phone?: string, imageKey?: string) {
    const payload = getWhatsAppPayloadForButton(
      {
        whatsapp_message: customMsg || globalDefaultMessage,
        whatsapp_image_logic: logic || content?.about_cta_whatsapp_image_logic,
        whatsapp_image_url: customMedia,
        whatsapp_image_key: imageKey,
      },
      customMedia || imageUrl,
      content?.site_logo_url,
      `Hola Will Design 3D, me interesa saber más sobre ${itemTitle}: ${itemBody}`,
      globalDefaultMessage,
      content
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
            {aboutButtons.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {aboutButtons.map((btn, idx) =>
                  btn.text?.trim() ? (
                    <UnifiedButton
                      key={btn.id || `nosotros-header-btn-${idx}`}
                      button={{
                        id: btn.id || `nosotros-header-btn-${idx}`,
                        text: btn.text,
                        action_type: btn.action_type === "cotizador" ? "link" : (btn.action_type as any),
                        action_value: btn.action_value || (btn.action_type === "cotizador" ? "/cotizador" : ""),
                        whatsapp_message: btn.whatsapp_message || "",
                        text_color: btn.text_color || undefined,
                        custom_hex: btn.custom_hex || (idx === 0 ? "var(--brand-orange)" : "var(--brand-teal)"),
                        media_url: (btn.media_mode || "fill") === "fill" ? btn.media_url : undefined,
                        media_mode: (btn.media_mode || "fill") as any,
                        icon_url: btn.icon_url || (btn.media_mode === "icon" ? btn.media_url : undefined),
                        icon_position:
                          btn.icon_position !== "none"
                            ? (btn.icon_position as any)
                            : btn.media_mode === "icon"
                              ? "left"
                              : "none",
                        variant: idx === 0 ? "default" : "secondary",
                        width: btn.width || "auto",
                        position: "left",
                        opacity: 100,
                        shade: btn.shade,
                        media_fit: btn.media_fit || "cover",
                        icon_shape: btn.icon_shape || "circle",
                      }}
                      onClick={() => handleAboutButtonClick(btn, idx)}
                    />
                  ) : null
                )}
              </div>
            )}
          </div>
          {imageUrl && (
            <div className="hidden h-48 w-48 overflow-hidden rounded-3xl border border-border bg-card shadow-lg md:block">
              <ProductMedia
                src={imageUrl}
                alt={businessName}
                className="h-full w-full object-cover"
                fallback={
                  <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                    <Factory className="h-10 w-10 text-[var(--brand-teal)]" aria-hidden="true" />
                    <span className="mt-2 text-xs font-bold text-muted-foreground">{businessName}</span>
                  </div>
                }
              />
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
                  media_fit: missionCtaMediaFit as any,
                  icon_url: missionCtaIconUrl || (missionCtaMediaMode === "icon" ? missionCtaMedia : undefined),
                  icon_position:
                    missionCtaIconPos !== "none"
                      ? (missionCtaIconPos as any)
                      : missionCtaMediaMode === "icon"
                        ? "left"
                        : "none",
                  icon_shape: missionCtaIconShape as any,
                  shade: missionCtaShade,
                  variant: "default",
                  width: missionCtaWidth,
                  position: "left",
                }}
                onClick={
                  missionActionType === "whatsapp"
                    ? () =>
                        handleSectionWaClick(
                          missionTitle,
                          missionText,
                          missionWaMsg,
                          missionWaImg,
                          content?.about_mission_cta_whatsapp_image_logic,
                          missionCtaUrl,
                          "about_mission_cta_whatsapp_image_url",
                        )
                    : undefined
                }
              />
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleSectionWaClick(
                    missionTitle,
                    missionText,
                    missionWaMsg,
                    missionWaImg || missionCtaMedia,
                    content?.about_mission_cta_whatsapp_image_logic,
                    missionCtaUrl,
                    "about_mission_cta_whatsapp_image_url",
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ color: "var(--brand-orange)" }}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
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
                  media_fit: visionCtaMediaFit as any,
                  icon_url: visionCtaIconUrl || (visionCtaMediaMode === "icon" ? visionCtaMedia : undefined),
                  icon_position:
                    visionCtaIconPos !== "none"
                      ? (visionCtaIconPos as any)
                      : visionCtaMediaMode === "icon"
                        ? "left"
                        : "none",
                  icon_shape: visionCtaIconShape as any,
                  shade: visionCtaShade,
                  variant: "default",
                  width: visionCtaWidth,
                  position: "left",
                }}
                onClick={
                  visionActionType === "whatsapp"
                    ? () =>
                        handleSectionWaClick(
                          visionTitle,
                          visionText,
                          visionWaMsg,
                          visionWaImg,
                          content?.about_vision_cta_whatsapp_image_logic,
                          visionCtaUrl,
                          "about_vision_cta_whatsapp_image_url",
                        )
                    : undefined
                }
              />
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleSectionWaClick(
                    visionTitle,
                    visionText,
                    visionWaMsg,
                    visionWaImg || visionCtaMedia,
                    content?.about_vision_cta_whatsapp_image_logic,
                    visionCtaUrl,
                    "about_vision_cta_whatsapp_image_url",
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ color: "var(--brand-teal)" }}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
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
            {valuesCtaText ? (
              <UnifiedButton
                button={{
                  id: "values_btn",
                  text: valuesCtaText,
                  action_type: valuesActionType === "cotizador" ? "link" : (valuesActionType as any),
                  action_value:
                    valuesActionType === "whatsapp"
                      ? valuesCtaUrl || ""
                      : valuesActionType === "cotizador"
                        ? "/cotizador"
                        : valuesCtaUrl || "/cotizador",
                  whatsapp_message: valuesWaMsg,
                  whatsapp_image_url: valuesWaImg,
                  text_color: valuesCtaTextColor || undefined,
                  custom_hex: valuesCtaCustomHex || "var(--brand-wine)",
                  media_url: valuesCtaMediaMode === "fill" ? valuesCtaMedia : undefined,
                  media_mode: valuesCtaMediaMode as any,
                  media_fit: valuesCtaMediaFit as any,
                  icon_url: valuesCtaIconUrl || (valuesCtaMediaMode === "icon" ? valuesCtaMedia : undefined),
                  icon_position:
                    valuesCtaIconPos !== "none"
                      ? (valuesCtaIconPos as any)
                      : valuesCtaMediaMode === "icon"
                        ? "left"
                        : "none",
                  icon_shape: valuesCtaIconShape as any,
                  shade: valuesCtaShade,
                  variant: "default",
                  width: valuesCtaWidth,
                  position: "left",
                }}
                onClick={
                  valuesActionType === "whatsapp"
                    ? () =>
                        handleSectionWaClick(
                          valuesTitle,
                          valuesText,
                          valuesWaMsg,
                          valuesWaImg,
                          content?.about_values_cta_whatsapp_image_logic,
                          valuesCtaUrl,
                          "about_values_cta_whatsapp_image_url",
                        )
                    : undefined
                }
              />
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleSectionWaClick(
                    valuesTitle,
                    valuesText,
                    valuesWaMsg,
                    valuesWaImg || valuesCtaMedia || valuesMedia,
                    content?.about_values_cta_whatsapp_image_logic,
                    valuesCtaUrl,
                    "about_values_cta_whatsapp_image_url",
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ color: "var(--brand-wine)" }}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Consultar por WhatsApp
              </button>
            )}
          </div>
        </article>
      </section>

      {/* Kiara story */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)] md:py-20">
          <div className="relative h-48 w-48 overflow-hidden rounded-full bg-card shadow-xl ring-4 ring-[var(--brand-orange)] md:h-60 md:w-60 shrink-0">
            <ProductMedia
              src={kiaraMedia}
              alt={kiaraTitle}
              className="h-full w-full object-cover"
              fallback={
                <div className="flex h-full w-full flex-col items-center justify-center bg-muted/60 p-4 text-center">
                  <PawPrint className="h-12 w-12 text-[var(--brand-orange)]" aria-hidden="true" />
                  <span className="mt-2 text-xs font-bold text-foreground">Kiara</span>
                </div>
              }
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
            {kiaraCtaText && (
              <div className="mt-6">
                <UnifiedButton
                  button={{
                    id: "kiara_btn",
                    text: kiaraCtaText,
                    action_type: kiaraActionType === "cotizador" ? "link" : (kiaraActionType as any),
                    action_value:
                      kiaraActionType === "whatsapp"
                        ? kiaraCtaUrl || ""
                        : kiaraActionType === "cotizador"
                          ? "/cotizador"
                          : kiaraCtaUrl || "/contacto",
                    whatsapp_message: kiaraWaMsg,
                    whatsapp_image_url: kiaraWaImg,
                    text_color: kiaraCtaTextColor || undefined,
                    custom_hex: kiaraCtaCustomHex || "var(--brand-orange)",
                    media_url: kiaraCtaMediaMode === "fill" ? kiaraCtaMedia : undefined,
                    media_mode: kiaraCtaMediaMode as any,
                    media_fit: kiaraCtaMediaFit as any,
                    icon_url: kiaraCtaIconUrl || (kiaraCtaMediaMode === "icon" ? kiaraCtaMedia : undefined),
                    icon_position:
                      kiaraCtaIconPos !== "none"
                        ? (kiaraCtaIconPos as any)
                        : kiaraCtaMediaMode === "icon"
                          ? "left"
                          : "none",
                    icon_shape: kiaraCtaIconShape as any,
                    shade: kiaraCtaShade,
                    variant: "default",
                    width: kiaraCtaWidth,
                    position: "left",
                  }}
                  onClick={
                    kiaraActionType === "whatsapp"
                      ? () =>
                          handleSectionWaClick(
                            kiaraTitle,
                            kiaraText,
                            kiaraWaMsg,
                            kiaraWaImg,
                            content?.about_kiara_cta_whatsapp_image_logic,
                            kiaraCtaUrl,
                            "about_kiara_cta_whatsapp_image_url",
                          )
                      : undefined
                  }
                />
              </div>
            )}
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

            <div className="mt-6">
              <UnifiedButton
                button={{
                  id: "workshop_btn",
                  text: workshopCtaText || "Agenda una visita",
                  action_type: workshopActionType === "cotizador" ? "link" : (workshopActionType as any),
                  action_value:
                    workshopActionType === "whatsapp"
                      ? workshopCtaUrl || ""
                      : workshopActionType === "cotizador"
                        ? "/cotizador"
                        : workshopCtaUrl || "/contacto",
                  whatsapp_message: workshopWaMsg,
                  whatsapp_image_url: workshopWaImg,
                  text_color: workshopCtaTextColor || undefined,
                  custom_hex: workshopCtaCustomHex || "var(--brand-orange)",
                  media_url: workshopCtaMediaMode === "fill" ? workshopCtaMedia : undefined,
                  media_mode: workshopCtaMediaMode as any,
                  media_fit: workshopCtaMediaFit as any,
                  icon_url: workshopCtaIconUrl || (workshopCtaMediaMode === "icon" ? workshopCtaMedia : undefined),
                  icon_position:
                    workshopCtaIconPos !== "none"
                      ? (workshopCtaIconPos as any)
                      : workshopCtaMediaMode === "icon"
                        ? "left"
                        : "none",
                  icon_shape: workshopCtaIconShape as any,
                  shade: workshopCtaShade,
                  variant: "default",
                  width: workshopCtaWidth,
                  position: "left",
                }}
                onClick={
                  workshopActionType === "whatsapp"
                    ? () =>
                        handleSectionWaClick(
                          workshopTitle,
                          workshopText || workshopAddress,
                          workshopWaMsg,
                          workshopWaImg,
                          content?.about_workshop_cta_whatsapp_image_logic,
                          workshopCtaUrl,
                          "about_workshop_cta_whatsapp_image_url",
                        )
                    : undefined
                }
              />
            </div>
          </div>

          <div className="relative min-h-64 h-full w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl flex items-center justify-center p-4">
            {(() => {
              const siteLogoUrl = content?.site_logo_url?.trim();
              const iconFallback = (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div
                    className="grid h-16 w-16 place-items-center rounded-2xl border border-border/60"
                    style={{
                      background: "color-mix(in oklab, var(--brand-teal) 14%, transparent)",
                      color: "var(--brand-teal)",
                    }}
                  >
                    <Factory className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">{businessName}</p>
                    <p className="text-xs font-medium text-muted-foreground">{workshopTitle}</p>
                  </div>
                </div>
              );
              const workshopFallback = siteLogoUrl ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <ProductMedia
                    src={siteLogoUrl}
                    alt={businessName}
                    className="h-28 w-auto max-w-[200px] object-contain"
                    fallback={
                      <div
                        className="grid h-16 w-16 place-items-center rounded-2xl border border-border/60"
                        style={{
                          background: "color-mix(in oklab, var(--brand-teal) 14%, transparent)",
                          color: "var(--brand-teal)",
                        }}
                      >
                        <Factory className="h-8 w-8" aria-hidden="true" />
                      </div>
                    }
                  />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {businessName} — {workshopTitle}
                  </span>
                </div>
              ) : (
                iconFallback
              );

              if (workshopMedia && workshopMedia.trim()) {
                return (
                  <ProductMedia
                    src={workshopMedia.trim()}
                    alt={workshopTitle}
                    className="h-full w-full min-h-64 max-h-[400px] object-cover rounded-2xl"
                    fallback={workshopFallback}
                  />
                );
              }
              return workshopFallback;
            })()}
          </div>
        </div>
      </section>
    </>
  );
}
