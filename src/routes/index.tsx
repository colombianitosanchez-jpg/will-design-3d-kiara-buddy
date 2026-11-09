import { UnifiedButton, getIconShapeStyle } from "@/components/UnifiedButton";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Boxes,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { Quoter } from "@/components/Quoter";
import { InstagramFeed } from "@/components/InstagramFeed";
import { ProductCard } from "@/components/ProductCard";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { categoriesQuery, productsQuery, siteContentQuery, getContactInfo, waLink, pickWhatsapp } from "@/lib/catalog";
import { openExternalUrl } from "@/lib/whatsapp";
import { useSiteContent } from "@/hooks/use-site-content";
import { heroCarouselQuery } from "@/lib/hero-carousel";
import { HeroMedia } from "@/components/HeroMedia";
import { ProductMedia } from "@/components/ProductMedia";
import { parseHomeOrder, type HomeSectionKey } from "@/lib/home-sections";
import { siteServicesQuery } from "./servicios";
import { menuItemsQuery } from "@/lib/menu";
import { parseHeroStats, contrastText, type HeroStatItem } from "@/lib/hero-stats";
import { parseHeroButtons, type HeroButtonItem } from "@/lib/hero-buttons";
import { getActiveTheme } from "@/lib/theme";
import { getWhatsAppPayloadForButton } from "@/lib/whatsapp-buttons";
import { getSeo } from "@/lib/seo";
import type { ButtonIconShape } from "@/lib/product-buttons";
import { motion } from "framer-motion";

function LottiePlayer({ url, className }: { url: string; className?: string }) {
  const [data, setData] = useState<any>(null);
  const [LottieComp, setLottieComp] = useState<any>(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    Promise.all([
      fetch(url).then((res) => res.json()),
      import("lottie-react").then((m: any) => m.Lottie || m.default),
    ])
      .then(([json, Comp]) => {
        if (isMounted) {
          setData(json);
          setLottieComp(() => Comp);
        }
      })
      .catch(() => {
        if (isMounted) {
          setData(null);
          setLottieComp(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!data || !LottieComp) return null;
  const Component = LottieComp;
  return <Component animationData={data} loop={true} className={className} />;
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [siteContent, products, heroCarousel, siteServices, categories, menuItems] =
      await Promise.all([
        context.queryClient.ensureQueryData(siteContentQuery()),
        context.queryClient.ensureQueryData(productsQuery()),
        context.queryClient.ensureQueryData(heroCarouselQuery()),
        context.queryClient.ensureQueryData(siteServicesQuery()),
        context.queryClient.ensureQueryData(categoriesQuery()),
        context.queryClient.ensureQueryData(menuItemsQuery()),
      ]);
    return { siteContent, products, heroCarousel, siteServices, categories, menuItems };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const seo = getSeo(
      {
        hero_title: siteContent?.hero_title,
        hero_subtitle: siteContent?.hero_subtitle,
        hero_image_url: siteContent?.hero_image_url,
      },
      siteContent
    );

    const canonicalUrl = typeof window !== 'undefined' ? window.location.origin : siteContent?.site_url || "https://willdesign3d.com";

    const metaTags: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: canonicalUrl },
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
  component: Home,
});

const SECTION_COMPONENTS: Record<HomeSectionKey, () => React.ReactNode> = {
  hero: Hero,
  services: Services,
  products: FeaturedProducts,
  portfolio: InstagramFeed,
  quoter: Quoter,
  about: AboutPreview,
};

function Home() {
  const { getText } = useSiteContent();
  const order = parseHomeOrder(getText("home_sections_order", ""));
  return (
    <>
      {order.map((key) => {
        const Section = SECTION_COMPONENTS[key];
        return <Section key={key} />;
      })}
    </>
  );
}

function Hero() {
  const router = useRouter();
  const { content, getText } = useSiteContent();
  const activeTheme = getActiveTheme(content);
  const palette = activeTheme.colors.palette || [];
  const fallbackWhatsapp = getContactInfo(content).whatsapp;
  const globalDefaultMessage = getText("whatsapp_default_message", "");

  const title = getText("hero_title", "");
  const subtitle = getText("hero_subtitle", "");
  const image = getText("hero_image_url", "");
  const badge = getText("hero_badge_title", "");
  const stats = parseHeroStats(content).filter((s) => s.k || s.v);

  // Hero CTAs Config (Soporte ilimitado con parseHeroButtons)
  const heroButtons = parseHeroButtons(content).filter((b) => b.text?.trim());

  function handleHeroButtonClick(btn: HeroButtonItem, index: number) {
    const actionType = btn.action_type || "link";
    const actionVal = btn.action_value || "";

    if (actionType === "whatsapp") {
      const effectiveFallback = btn.whatsapp_message?.trim() ? undefined : "Hola Will, me interesa cotizar del Hero";
      const shortKey = index === 0 ? "hero" : `h${index + 1}`;
      const payload = getWhatsAppPayloadForButton(
        {
          whatsapp_message: btn.whatsapp_message,
          whatsapp_image_logic: btn.whatsapp_image_logic || "auto",
          whatsapp_image_url: btn.whatsapp_image_url,
          whatsapp_image_key: shortKey,
        },
        btn.media_url || image,
        content?.site_logo_url,
        effectiveFallback,
        globalDefaultMessage
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

  function handleStatClick(stat: HeroStatItem, index?: number) {
    if (!stat.action_type || stat.action_type === "none") return;

    if (stat.action_type === "cotizador") {
      router.navigate({ to: "/cotizador" });
    } else if (stat.action_type === "link") {
      const val = stat.action_value?.trim();
      if (!val) return;
      if (/^https?:\/\//i.test(val)) {
        window.open(val, "_blank", "noopener,noreferrer");
      } else {
        router.navigate({ to: val.startsWith("/") ? (val as any) : (`/${val}` as any) });
      }
    } else if (stat.action_type === "whatsapp") {
      const num = pickWhatsapp(stat.action_value, fallbackWhatsapp);
      const defaultMsg = `Hola Will Design 3D, me interesa la consulta sobre: ${stat.k} (${stat.v}).`;
      const shortKey = typeof index === "number" ? `s${index + 1}` : (stat.id || "s1");
      const payload = getWhatsAppPayloadForButton(
        {
          whatsapp_message: stat.whatsapp_message,
          whatsapp_image_url: stat.whatsapp_image_url,
          whatsapp_image_key: shortKey,
        },
        stat.whatsapp_image_url || stat.media_url || stat.bgImageUrl || image,
        content?.site_logo_url,
        defaultMsg,
        globalDefaultMessage
      );
      const url = waLink(num, payload.formattedText);
      if (!url) {
        toast.error("Configura WhatsApp en /panel/marca");
        return;
      }
      openExternalUrl(url);
    }
  }

  function resolveStatColor(stat: HeroStatItem): string | undefined {
    if (stat.custom_hex) {
      return stat.custom_hex;
    }
    if (stat.color_id === "custom") {
      return stat.custom_hex || undefined;
    }
    if (stat.color_id && stat.color_id !== "default") {
      const found = palette.find((p) => p.id === stat.color_id);
      if (found) return found.hex;
      return `var(--theme-color-${stat.color_id})`;
    }
    return undefined;
  }

  return (
    <section id="inicio" className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 85% -10%, color-mix(in oklab, var(--brand-orange) 22%, transparent), transparent 60%), radial-gradient(900px 500px at -10% 30%, color-mix(in oklab, var(--brand-teal) 18%, transparent), transparent 55%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-24">
        <div>
          <span className="chip-teal">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {getText("site_area_served", getText("contact_location_short", "Bogotá · Colombia"))}
          </span>
          <h1 className="mt-4 text-4xl font-black leading-[1.05] sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
          {heroButtons.length > 0 && (
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {heroButtons.map((btn, idx) => (
              <UnifiedButton
                key={btn.id || `hero-btn-${idx}`}
                button={{
                  id: btn.id || `hero-btn-${idx}`,
                  text: btn.text,
                  action_type: btn.action_type === "cotizador" ? "link" : (btn.action_type as any),
                  action_value: btn.action_value || (btn.action_type === "cotizador" ? "/cotizador" : ""),
                  whatsapp_message: btn.whatsapp_message || "",
                  text_color: btn.text_color || undefined,
                  custom_hex: btn.custom_hex || (idx === 0 ? "var(--brand-orange)" : "var(--brand-wine)"),
                  media_url: (btn.media_mode || "fill") === "fill" ? btn.media_url : undefined,
                  media_mode: (btn.media_mode || "fill") as any,
                  icon_url: btn.icon_url || (btn.media_mode === "icon" ? btn.media_url : undefined),
                  icon_position: btn.icon_position !== "none" ? (btn.icon_position as any) : (btn.media_mode === "icon" ? "left" : "none"),
                  variant: idx === 0 ? "default" : "secondary",
                  width: btn.width || "auto",
                  position: "left",
                  opacity: 100,
                  shade: btn.shade,
                  media_fit: btn.media_fit || "cover",
                  icon_shape: btn.icon_shape || "circle",
                  include_image_link: true,
                }}
                onClick={() => handleHeroButtonClick(btn, idx)}
              />
            ))}
          </div>
          )}

          {stats.length > 0 && (
            <dl className="mt-10 grid max-w-lg grid-cols-2 sm:grid-cols-3 gap-4">
              {stats.map((s, idx) => {
                const statColor = resolveStatColor(s);
                const isClickable = s.action_type && s.action_type !== "none";
                const animClass =
                  s.animation_style && s.animation_style !== "none"
                    ? `theme-anim-${s.animation_style}`
                    : "";

                const bgUrl = s.media_url || s.bgImageUrl || "";
                const isVid = /\.(mp4|webm|quicktime)($|\?)/i.test(bgUrl);
                const isGif = /\.gif($|\?)/i.test(bgUrl);
                const isLottie = /\.json($|\?)/i.test(bgUrl);
                const mediaMode = s.media_mode || (bgUrl && s.type !== "solid" ? "fill" : (bgUrl ? "fill" : "none"));
                const hasFillMedia = mediaMode === "fill" && Boolean(bgUrl);
                const mediaFitClass = s.media_fit === "contain" ? "object-contain" : s.media_fit === "fill" ? "object-fill" : "object-cover";
                const roundedClass = s.rounded || "rounded-2xl";
                const effectiveShade = s.shade !== undefined ? s.shade : (hasFillMedia ? 45 : 0);
                const overlayOp = effectiveShade / 100;

                const iconPos = s.icon_position || s.iconPosition || "none";
                const iconUrl = s.icon_url || (iconPos !== "none" && s.bgImageUrl && !s.media_url ? s.bgImageUrl : "");
                const isIconVid = /\.(mp4|webm|quicktime)($|\?)/i.test(iconUrl);
                const isIconLottie = /\.json($|\?)/i.test(iconUrl);
                const iconShapeConfig = getIconShapeStyle(s.icon_shape || "circle");

                // Fondo: color sólido elegido (también respaldo bajo el fondo vivo). Sin degradados heredados.
                const containerStyle: React.CSSProperties = {};
                if (statColor) {
                  containerStyle.backgroundColor = statColor;
                  containerStyle.borderColor = statColor;
                }
                // Texto: color propio; si está vacío, contraste automático según el fondo.
                const autoText = hasFillMedia ? "#ffffff" : statColor ? contrastText(statColor) : undefined;
                const textCol = s.text_color || autoText;

                const iconMedia = iconUrl && iconPos !== "none" && (
                  <span
                    className={`relative inline-flex items-center justify-center shrink-0 h-5 w-5 overflow-hidden ${iconShapeConfig.className}`}
                    style={iconShapeConfig.style}
                  >
                    {isIconLottie || s.animation_type === "lottie" ? (
                      <LottiePlayer url={iconUrl} className="h-5 w-5" />
                    ) : isIconVid || s.animation_type === "video" ? (
                      <video
                        src={iconUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={iconUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                );

                const widthClass = s.width === "full" ? "col-span-full" : "";

                return (
                  <motion.div
                    key={s.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStatClick(s, idx)}
                    style={containerStyle}
                    className={`relative overflow-hidden isolate border border-border p-3.5 text-center transition-all shadow-2xs min-h-[80px] flex flex-col items-center justify-center ${roundedClass} ${widthClass} ${
                      isClickable ? "cursor-pointer hover:border-primary hover:shadow-md" : ""
                    } ${animClass}`}
                  >
                    {/* Fondo Vivo - Video Loop */}
                    {hasFillMedia && isVid && (
                      <video
                        src={bgUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className={`absolute inset-0 h-full w-full object-center -z-20 ${mediaFitClass}`}
                      />
                    )}

                    {/* Fondo Vivo - Lottie */}
                    {hasFillMedia && isLottie && (
                      <div className="absolute inset-0 -z-20 flex items-center justify-center overflow-hidden">
                        <LottiePlayer url={bgUrl} className="h-full w-full object-cover" />
                      </div>
                    )}

                    {/* Fondo Vivo - Imagen/GIF Completo */}
                    {hasFillMedia && !isVid && !isLottie && (
                      <img
                        src={bgUrl}
                        alt=""
                        className={`absolute inset-0 h-full w-full object-center -z-20 ${mediaFitClass}`}
                      />
                    )}

                    {/* Overlay Oscuro para Legibilidad WCAG AA */}
                    {overlayOp > 0 && (
                      <div
                        className="absolute inset-0 bg-black -z-10"
                        style={{ opacity: overlayOp }}
                      />
                    )}

                    <dt
                      className={`relative z-10 text-xl font-black flex items-center justify-center gap-1.5 ${
                        hasFillMedia ? "drop-shadow-md" : ""
                      }`}
                      style={{ color: s.text_color ? s.text_color : (textCol || "var(--brand-wine)") }}
                    >
                      {iconPos === "left" && iconMedia}
                      {s.k}
                      {iconPos === "right" && iconMedia}
                    </dt>
                    <dd
                      className={`relative z-10 text-[11px] mt-0.5 ${
                        hasFillMedia ? "drop-shadow-xs font-medium" : ""
                      } ${!textCol && !s.text_color ? "text-muted-foreground" : ""}`}
                      style={
                        s.text_color
                          ? { color: s.text_color, opacity: 0.85 }
                          : textCol
                          ? { color: textCol, opacity: 0.85 }
                          : undefined
                      }
                    >
                      {s.v}
                    </dd>
                  </motion.div>
                );
              })}
            </dl>
          )}
        </div>

        <div className="relative">
          <div
            className="absolute -inset-4 -z-10 rounded-[2rem] opacity-70 blur-2xl"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--brand-orange) 40%, transparent), color-mix(in oklab, var(--brand-teal) 40%, transparent))",
            }}
          />
          <HeroMedia fallbackImage={image} />
          {badge && (
            <div className="absolute -bottom-5 -left-5 hidden max-w-[15rem] rounded-2xl border border-border bg-card p-3 shadow-xl sm:block">
              <p className="text-xs font-semibold text-muted-foreground">Pieza destacada</p>
              <p className="text-sm font-bold">{badge}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


function Services() {
  const ref = useScrollReveal<HTMLElement>();
  const loaderData = Route.useLoaderData();
  const { data: dbServices } = useQuery({
    ...siteServicesQuery(),
    initialData: loaderData?.siteServices,
  });
  const { getText } = useSiteContent();

  const servicesTitle = getText("services_section_title", "Nuestros servicios");
  const servicesSubtitle = getText("services_section_subtitle", "");

  const colorFor = (a: string) =>
    a === "orange"
      ? "var(--brand-orange)"
      : a === "teal"
        ? "var(--brand-teal)"
        : "var(--brand-wine)";

  const list = (dbServices && dbServices.length > 0)
    ? dbServices.map((s: any) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        desc: s.lead,
        accent: s.color || "orange",
      }))
    : [];

  if (list.length === 0) return null;

  return (
    <section ref={ref} id="servicios" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip-teal">Nuestros servicios</span>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
          {servicesTitle}
        </h2>
        {servicesSubtitle && (
          <p className="mt-3 text-muted-foreground">
            {servicesSubtitle}
          </p>
        )}
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s: any) => {
          const c = colorFor(s.accent);
          return (
            <article
              key={s.id || s.title}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: c }}
              />
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl"
                style={{
                  background: `color-mix(in oklab, ${c} 15%, white)`,
                  color: c,
                }}
              >
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <Link
                to="/servicios"
                hash={s.slug || undefined}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold transition group-hover:gap-2"
                style={{ color: c }}
              >
                Más información <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AboutPreview() {
  const ref = useScrollReveal<HTMLElement>();
  const router = useRouter();
  const { content, getText } = useSiteContent();

  const chip = getText("about_chip", "Nosotros");
  const title = getText("about_title", "Pasión por la Impresión 3D de Gran Formato");
  const subtitle = getText("about_subtitle", "Diseño, ingeniería y fabricación aditiva desde Bogotá, Colombia.");
  const shortDesc = getText("about_short", "");
  const image = getText("about_image_url", "");
  const stats = parseHeroStats({ hero_stats: content?.about_stats || "" }).filter((s) => s.k || s.v);

  const ctaText = getText("about_cta_text", "Conoce más sobre nosotros");
  const ctaUrl = getText("about_cta_url", "/nosotros");
  const ctaActionType = getText("about_cta_action_type", "link");
  const ctaWhatsappMsg = getText("about_cta_whatsapp_message", "");
  const ctaWhatsappLogic = getText("about_cta_whatsapp_image_logic", "auto");
  const ctaWhatsappImg = getText("about_cta_whatsapp_image_url", "");
  const ctaMediaUrl = getText("about_cta_media_url", "");
  const ctaMediaMode = getText("about_cta_media_mode", "fill");
  const ctaIconUrl = getText("about_cta_icon_url", "");
  const ctaIconPos = getText("about_cta_icon_position", "none");
  const ctaTextColor = getText("about_cta_text_color", "");
  const ctaCustomHex = getText("about_cta_custom_hex", "");
  const fallbackWhatsapp = getContactInfo(content).whatsapp;
  const globalDefaultMessage = getText("whatsapp_default_message", "");

  function handleAboutCtaClick() {
    if (ctaActionType === "whatsapp") {
      const payload = getWhatsAppPayloadForButton(
        {
          whatsapp_message: ctaWhatsappMsg || globalDefaultMessage,
          whatsapp_image_logic: ctaWhatsappLogic,
          whatsapp_image_url: ctaWhatsappImg,
          whatsapp_image_key: "about_cta_whatsapp_image_url",
        },
        ctaMediaUrl,
        content?.site_logo_url,
        "Hola Will Design 3D, me interesa conocer más sobre ustedes.",
        globalDefaultMessage
      );
      const url = waLink(fallbackWhatsapp, payload.formattedText);
      if (!url) {
        toast.error("Configura WhatsApp en /panel/marca");
        return;
      }
      openExternalUrl(url);
    } else if (ctaActionType === "cotizador") {
      router.navigate({ to: "/cotizador" });
    } else {
      const val = ctaUrl.trim();
      if (!val) return;
      if (/^https?:\/\//i.test(val)) {
        window.open(val, "_blank", "noopener,noreferrer");
      } else {
        router.navigate({ to: val.startsWith("/") ? (val as any) : (`/${val}` as any) });
      }
    }
  }

  return (
    <section ref={ref} id="nosotros" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Imagen en contenedor aspect-[4/3] con rounded-[32px] y stats flotantes */}
        <div className="relative overflow-hidden rounded-[32px] border border-border bg-muted shadow-2xl aspect-[4/3] flex items-center justify-center">
          {image ? (
            <ProductMedia src={image} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <img src="/logo.png" alt="Will Design 3D" className="h-32 sm:h-40 w-auto opacity-70 object-contain" />
              <span className="text-xs font-semibold text-muted-foreground">{title}</span>
            </div>
          )}

          {/* Stats flotantes sobre la imagen con backdrop-blur */}
          {stats.length > 0 && (
            <div className="absolute inset-x-4 bottom-4 z-10 grid grid-cols-2 gap-3 sm:inset-x-6 sm:bottom-6 sm:grid-cols-3">
              {stats.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/20 bg-background/80 p-3.5 text-center shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-card/80 flex flex-col items-center justify-center"
                >
                  {s.media_url && (
                    <div className="mb-1 h-7 w-7 overflow-hidden rounded-full shrink-0">
                      <ProductMedia src={s.media_url} alt={s.k} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <dt className="text-lg font-black text-primary sm:text-xl">{s.k}</dt>
                  <dd className="mt-0.5 text-xs font-medium text-foreground/80 sm:text-sm">{s.v}</dd>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Texto debajo */}
        <div className="text-center md:text-left">
          <span className="chip-teal">{chip}</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-lg font-medium text-foreground">
              {subtitle}
            </p>
          )}
          {shortDesc && (
            <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
              {shortDesc}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <UnifiedButton
              button={{
                id: "about-cta-btn",
                text: ctaText,
                action_type: ctaActionType === "cotizador" ? "link" : (ctaActionType as any),
                action_value: ctaUrl,
                whatsapp_message: ctaWhatsappMsg,
                text_color: ctaTextColor || undefined,
                custom_hex: ctaCustomHex || undefined,
                media_url: (ctaMediaMode || "fill") === "fill" ? ctaMediaUrl : undefined,
                media_mode: (ctaMediaMode || "fill") as any,
                icon_url: ctaIconUrl || (ctaMediaMode === "icon" ? ctaMediaUrl : undefined),
                icon_position: ctaIconPos !== "none" ? (ctaIconPos as any) : (ctaMediaMode === "icon" ? "left" : "none"),
                variant: "default",
                width: "auto",
                position: "left",
                include_image_link: true,
              }}
              onClick={handleAboutCtaClick}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts() {
  const loaderData = Route.useLoaderData();
  // Reutiliza exactamente la misma consulta que /tienda (única fuente de verdad).
  const { data: products, isPending, isError } = useQuery({
    ...productsQuery(),
    initialData: loaderData?.products,
  });
  const { getText } = useSiteContent();

  const title = getText("featured_products_title", "Productos destacados");
  const subtitle = getText("featured_products_subtitle", "Impresoras, filamentos y accesorios con asesoría técnica incluida.");

  const list = products ?? [];
  const marked = list.filter((p) => p.featured);
  // Si no hay ninguno marcado como destacado, mostramos los más recientes.
  const shown = (marked.length > 0 ? marked : list).slice(0, 4);
  const loading = isPending && !products;

  return (
    <section id="tienda" className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="chip-teal">Tienda</span>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <Link to="/tienda" className="btn-outline">
            Ver toda la tienda
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-3xl border border-border bg-card"
              >
                <div className="aspect-[4/3] w-full bg-muted" />
                <div className="space-y-2 p-5">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="h-5 w-1/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : shown.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <ShoppingBag
              className="mx-auto h-10 w-10"
              style={{ color: "var(--brand-orange)" }}
            />
            <h3 className="mt-4 text-lg font-bold">
              {isError
                ? "No pudimos cargar el catálogo en este momento"
                : "Estamos cargando nuevos productos"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Escríbenos y te asesoramos con impresoras, filamentos y resinas
              disponibles bajo pedido.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link to="/tienda" className="btn-primary text-sm">
                Ver la tienda
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contacto" className="btn-outline text-sm">
                Contactar al equipo
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
