import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  Sparkles,
  ShoppingBag,
  PenTool,
  Wrench,
  ArrowRight,
  Ruler,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { Quoter } from "@/components/Quoter";
import { InstagramFeed } from "@/components/InstagramFeed";
import { ProductCard } from "@/components/ProductCard";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { productsQuery, siteContentQuery } from "@/lib/catalog";
import { useSiteContent } from "@/hooks/use-site-content";
import { heroCarouselQuery } from "@/lib/hero-carousel";
import { HeroMedia } from "@/components/HeroMedia";
import { parseHomeOrder, type HomeSectionKey } from "@/lib/home-sections";
import { SITE_URL } from "@/lib/site-url";


export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [content] = await Promise.all([
      context.queryClient.fetchQuery({ ...siteContentQuery(), staleTime: 0 }).catch(() => ({} as Record<string, string>)),
      context.queryClient.fetchQuery({ ...productsQuery(), staleTime: 0 }).catch(() => []),
      context.queryClient.fetchQuery({ ...heroCarouselQuery(), staleTime: 0 }).catch(() => []),
    ]);
    return { content };
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content ?? {};
    const title = content.seo_home_title?.trim() || content.seo_title?.trim() ||
      "Impresión 3D de gran formato en Bogotá | Will Design 3D";
    const description = (
      content.seo_home_description?.trim() || content.seo_description?.trim() ||
      content.hero_subtitle?.trim() ||
      "Taller de impresión 3D de gran formato en Bogotá: piezas a pedido, diseño, post-procesado, venta de equipos e insumos y mantenimiento técnico."
    ).slice(0, 300);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE_URL}/` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    };
  },
  component: Home,
});

const services = [
  {
    icon: Boxes,
    title: "Impresión 3D de Gran Formato",
    desc: "Especialidad en 50x50 y sin límite de tamaño. Piezas monumentales con precisión milimétrica.",
    accent: "orange",
  },
  {
    icon: Sparkles,
    title: "Post-procesado",
    desc: "Lijado, masillado, pintura y acabados profesionales a medida para un resultado impecable.",
    accent: "teal",
  },
  {
    icon: ShoppingBag,
    title: "Venta de Equipos e Insumos",
    desc: "Impresoras 3D, filamentos y resinas de las mejores marcas al mejor precio.",
    accent: "wine",
  },
  {
    icon: PenTool,
    title: "Diseño 3D Personalizado",
    desc: "Modelado desde cero. Convertimos tu idea, boceto o fotografía en un archivo listo para imprimir.",
    accent: "orange",
  },
  {
    icon: Wrench,
    title: "Mantenimiento Técnico",
    desc: "Servicio técnico especializado y upgrades para tu impresora 3D. Diagnóstico y calibración.",
    accent: "teal",
  },
  {
    icon: Ruler,
    title: "Prototipado Industrial",
    desc: "Convierte tu proyecto en un prototipo funcional para validar diseño, ergonomía y mercado.",
    accent: "wine",
  },
];

const SECTION_COMPONENTS: Record<HomeSectionKey, () => React.ReactNode> = {
  hero: Hero,
  services: Services,
  products: FeaturedProducts,
  portfolio: InstagramFeed,
  quoter: Quoter,
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
  const { getText } = useSiteContent();
  const title = getText("hero_title", "Llevamos tus ideas a la realidad. Sin límites de tamaño.");
  const subtitle = getText(
    "hero_subtitle",
    "Especialistas en Impresión 3D de gran formato en Bogotá. Diseño, producción y acabados profesionales bajo un mismo techo.",
  );
  const image = getText("hero_image_url", heroImg);
  const badge = getText("hero_badge_title", "Escultura 1.8 m — PLA reforzado");
  const stats = [
    { k: getText("hero_stat_1_k", "50×50"), v: getText("hero_stat_1_v", "cm mínimo") },
    { k: getText("hero_stat_2_k", "∞"), v: getText("hero_stat_2_v", "sin límite") },
    { k: getText("hero_stat_3_k", "+200"), v: getText("hero_stat_3_v", "proyectos") },
  ];


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
            Bogotá · Colombia
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

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-3 text-center">
                <dt className="text-xl font-black" style={{ color: "var(--brand-wine)" }}>
                  {s.k}
                </dt>
                <dd className="text-[11px] text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
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
  const colorFor = (a: string) =>
    a === "orange"
      ? "var(--brand-orange)"
      : a === "teal"
        ? "var(--brand-teal)"
        : "var(--brand-wine)";
  return (
    <section ref={ref} id="servicios" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip-teal">Nuestros servicios</span>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
          Todo lo que necesitas para{" "}
          <span style={{ color: "var(--brand-orange)" }}>materializar</span> tu
          idea
        </h2>
        <p className="mt-3 text-muted-foreground">
          Desde el modelado inicial hasta el acabado final — un servicio integral
          para creadores, empresas y makers.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const c = colorFor(s.accent);
          return (
            <article
              key={s.title}
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
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <Link
                to="/servicios"
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

function FeaturedProducts() {
  // Reutiliza exactamente la misma consulta que /tienda (única fuente de verdad).
  const { data: products, isPending, isError } = useQuery(productsQuery());

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
              Productos destacados
            </h2>
            <p className="mt-3 text-muted-foreground">
              Impresoras, filamentos y accesorios con asesoría técnica incluida.
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
