import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Boxes,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { Quoter } from "@/components/Quoter";
import { InstagramFeed } from "@/components/InstagramFeed";
import { ProductCard } from "@/components/ProductCard";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { categoriesQuery, productsQuery, siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { useSiteContent } from "@/hooks/use-site-content";
import { heroCarouselQuery } from "@/lib/hero-carousel";
import { HeroMedia } from "@/components/HeroMedia";
import { parseHomeOrder, type HomeSectionKey } from "@/lib/home-sections";
import { siteServicesQuery } from "./servicios";
import { menuItemsQuery } from "@/lib/menu";
import { parseHeroStats, type HeroStatItem } from "@/routes/panel.contenido";
import { getActiveTheme } from "@/lib/theme";
import { getSeo } from "@/lib/seo";
import { Lottie } from "lottie-react";
import { motion } from "framer-motion";

function LottiePlayer({ url, className }: { url: string; className?: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) setData(json);
      })
      .catch(() => {
        if (isMounted) setData(null);
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!data) return null;
  return <Lottie animationData={data} loop={true} className={className} {...({} as any)} />;
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

  const title = getText("hero_title", "");
  const subtitle = getText("hero_subtitle", "");
  const image = getText("hero_image_url", "");
  const badge = getText("hero_badge_title", "");
  const stats = parseHeroStats(content).filter((s) => s.k || s.v);

  function handleStatClick(stat: HeroStatItem) {
    if (!stat.action_type || stat.action_type === "none") return;

    if (stat.action_type === "link") {
      const val = stat.action_value?.trim();
      if (!val) return;
      if (/^https?:\/\//i.test(val)) {
        window.open(val, "_blank", "noopener,noreferrer");
      } else {
        router.navigate({ to: val.startsWith("/") ? val : `/${val}` });
      }
    } else if (stat.action_type === "whatsapp") {
      const num = stat.action_value?.trim() || fallbackWhatsapp;
      const text = `Hola Will Design 3D, me interesa la consulta sobre: ${stat.k} (${stat.v}).`;
      window.open(waLink(num, text), "_blank", "noopener,noreferrer");
    }
  }

  function resolveStatColor(stat: HeroStatItem): string | undefined {
    if (stat.color_id === "custom") {
      return stat.custom_hex || undefined;
    }
    if (stat.color_id) {
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
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/cotizador" className="btn-primary">
              Cotizar Proyecto
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/tienda" className="btn-outline">
              Ver tienda
            </Link>
          </div>

          {stats.length > 0 && (
            <dl className="mt-10 grid max-w-lg grid-cols-2 sm:grid-cols-3 gap-4">
              {stats.map((s) => {
                const statColor = resolveStatColor(s);
                const isClickable = s.action_type && s.action_type !== "none";
                const animClass =
                  s.animation_style && s.animation_style !== "none"
                    ? `theme-anim-${s.animation_style}`
                    : "";

                const bgUrl = s.bgImageUrl || s.media_url || "";
                const isVid = /\.(mp4|webm|quicktime)($|\?)/i.test(bgUrl);
                const type =
                  s.type ||
                  (bgUrl ? (isVid ? "videoFill" : "imageFill") : "solid");
                const roundedClass = s.rounded || "rounded-2xl";
                const overlayOp = (s.overlayOpacity ?? 45) / 100;
                const iconPos = s.iconPosition || "none";

                let containerStyle: React.CSSProperties = {};
                if (type === "gradient") {
                  containerStyle.background = `linear-gradient(${
                    s.gradientAngle ?? 135
                  }deg, ${s.gradientFrom || "#f97316"}, ${
                    s.gradientTo || "#db2777"
                  })`;
                } else if (type === "solid") {
                  if (statColor) {
                    containerStyle.borderColor = `${statColor}40`;
                    containerStyle.backgroundColor = `${statColor}15`;
                  }
                }

                const iconMedia = bgUrl && iconPos !== "none" && (
                  <span className="shrink-0 inline-flex items-center justify-center">
                    {s.animation_type === "lottie" ? (
                      <LottiePlayer url={bgUrl} className="h-5 w-5" />
                    ) : s.animation_type === "video" || isVid ? (
                      <video
                        src={bgUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <img
                        src={bgUrl}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    )}
                  </span>
                );

                return (
                  <motion.div
                    key={s.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStatClick(s)}
                    style={containerStyle}
                    className={`relative overflow-hidden isolate border border-border p-3.5 text-center transition-all shadow-2xs min-h-[80px] flex flex-col items-center justify-center ${roundedClass} ${
                      isClickable ? "cursor-pointer hover:border-primary hover:shadow-md" : ""
                    } ${animClass}`}
                  >
                    {/* Fondo Vivo - Video Loop */}
                    {type === "videoFill" && bgUrl && (
                      <video
                        src={bgUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover -z-20"
                      />
                    )}

                    {/* Fondo Vivo - Imagen/GIF Completo */}
                    {type === "imageFill" && bgUrl && (
                      <img
                        src={bgUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover -z-20"
                      />
                    )}

                    {/* Overlay Oscuro para Legibilidad WCAG AA */}
                    {(type === "videoFill" || type === "imageFill" || type === "gradient") && (
                      <div
                        className="absolute inset-0 bg-black -z-10"
                        style={{ opacity: overlayOp }}
                      />
                    )}

                    <dt
                      className={`relative z-10 text-xl font-black flex items-center justify-center gap-1.5 ${
                        type !== "solid" ? "text-white drop-shadow-md" : ""
                      }`}
                      style={type === "solid" ? { color: statColor || "var(--brand-wine)" } : undefined}
                    >
                      {iconPos === "left" && iconMedia}
                      {s.k}
                      {iconPos === "right" && iconMedia}
                    </dt>
                    <dd
                      className={`relative z-10 text-[11px] mt-0.5 ${
                        type !== "solid"
                          ? "text-white/90 drop-shadow-xs font-medium"
                          : "text-muted-foreground"
                      }`}
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
  const { content, getText } = useSiteContent();

  const chip = getText("about_chip", "Nosotros");
  const title = getText("about_title", "Pasión por la Impresión 3D de Gran Formato");
  const subtitle = getText("about_subtitle", "Diseño, ingeniería y fabricación aditiva desde Bogotá, Colombia.");
  const shortDesc = getText("about_short", "");
  const image = getText("about_image_url", "");
  const stats = parseHeroStats({ hero_stats: content?.about_stats || "" }).filter((s) => s.k || s.v);

  return (
    <section ref={ref} id="nosotros" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
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
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {shortDesc}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/nosotros" className="btn-primary text-sm">
              Conoce más sobre nosotros
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {stats.length > 0 && (
            <dl className="mt-8 grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-3.5 text-center shadow-xs">
                  <dt className="text-xl font-black text-primary">{s.k}</dt>
                  <dd className="text-xs text-muted-foreground mt-0.5">{s.v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="relative">
          {image ? (
            <div className="overflow-hidden rounded-3xl border border-border shadow-xl aspect-4/3">
              <ProductMedia src={image} alt={title} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex aspect-4/3 items-center justify-center rounded-3xl border border-dashed border-border bg-muted p-8 text-center text-sm text-muted-foreground">
              Will Design 3D — Impresión 3D de gran formato
            </div>
          )}
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
