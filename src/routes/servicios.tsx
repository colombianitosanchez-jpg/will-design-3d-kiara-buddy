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
import { quoterServicesQuery, formatCOP } from "@/lib/quoter";
import { supabase } from "@/integrations/supabase/client";
import { parseProductButtons } from "@/lib/product-buttons";
import { ProductButtons } from "@/components/ProductButtons";

export const Route = createFileRoute("/servicios")({
  head: () => ({
    meta: [
      { title: "Servicios de Impresión 3D — Will Design 3D" },
      {
        name: "description",
        content:
          "Impresión 3D a pedido, diseño personalizado, mantenimiento de impresoras, upgrades, post-procesado y prototipado industrial en Bogotá.",
      },
      { property: "og:title", content: "Servicios de Impresión 3D — Will Design 3D" },
      { property: "og:description", content: "Impresión 3D a pedido, diseño personalizado, mantenimiento, upgrades y post-procesado profesional en Bogotá." },
    ],
  }),
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
      if (error || !data || data.length === 0) return null;
      return data;
    },
    staleTime: 60_000,
  });

const DEFAULT_SERVICES = [
  {
    id: "impresion-3d",
    slug: "impresion-3d",
    icon: Boxes,
    title: "Impresión 3D a Pedido",
    color: "orange",
    lead: "Producimos tus piezas en FDM y resina, con especialidad en gran formato (50×50 cm o más).",
    bullets: [
      "FDM: PLA, PETG, ABS, TPU, PA, PC",
      "Resina MSLA hasta 12K para alto detalle",
      "Volumen de producción y prototipos únicos",
      "Cotización por WhatsApp con archivo o boceto",
    ],
    kiaraTip: "Si tu archivo aún no está optimizado, avísanos: revisamos huecos y grosores gratis.",
    requires_file: true,
  },
  {
    id: "modelado-3d",
    slug: "modelado-3d",
    icon: PenTool,
    title: "Diseño 3D Personalizado",
    color: "teal",
    lead: "Modelamos desde cero usando tus referencias, planos o fotografías. Ideal si no tienes archivo.",
    bullets: [
      "Modelado paramétrico e ingeniería inversa",
      "Escultura orgánica para figuras y arte",
      "Optimización de piezas para impresión",
      "Entregamos STL/OBJ/STEP",
    ],
    kiaraTip: "Cuéntanos función y tamaño primero — un buen diseño ahorra horas de impresión.",
    requires_file: true,
  },
  {
    id: "servicio-tecnico",
    slug: "servicio-tecnico",
    icon: Wrench,
    title: "Mantenimiento y Reparación",
    color: "wine",
    lead: "Servicio técnico especializado para impresoras FDM y de resina de cualquier marca.",
    bullets: [
      "Diagnóstico y calibración completa",
      "Cambio de hotend, boquillas, correas y termistores",
      "Nivelación automática y firmware",
      "Servicio en taller o a domicilio en Bogotá",
    ],
    kiaraTip: "Un mantenimiento cada 500 h de impresión evita el 80 % de las fallas comunes.",
  },
  {
    id: "escaneo-3d",
    slug: "escaneo-3d",
    icon: ScanLine,
    title: "Escaneo 3D",
    color: "teal",
    lead: "Digitalizamos objetos, espacios y piezas reales para obtener modelos 3D listos para editar o imprimir.",
    bullets: [
      "Escaneo de objetos pequeños con alta precisión",
      "Escaneo de espacios y ambientes (tours 3D)",
      "Limpieza y reparación de malla",
      "Entrega en STL/OBJ y ingeniería inversa",
    ],
    kiaraTip: "Si la pieza es brillante u oscura, la tratamos con spray mate para que el escáner la lea mejor.",
  },
  {
    id: "postprocesado",
    slug: "postprocesado",
    icon: Ruler,
    title: "Post-procesado y Acabados",
    color: "orange",
    lead: "Convertimos una pieza recién impresa en un producto terminado profesional.",
    bullets: [
      "Lijado y masillado",
      "Aplicación de primer y pintura",
      "Acabados metalizados, mate o brillo",
      "Ensamble y montaje final",
    ],
    kiaraTip: "El acabado Premium multiplica el impacto visual — pídelo si vas a exhibir la pieza.",
  },
  {
    id: "cursos-3d-modelado",
    slug: "cursos-3d-modelado",
    icon: GraduationCap,
    title: "Curso de Modelado 3D",
    color: "orange",
    lead: "Aprende a modelar tus propias piezas desde cero: de la idea al archivo listo para imprimir.",
    bullets: ["Modelado CAD paramétrico", "Preparación de STL/OBJ", "Clases personalizadas presenciales o virtuales"],
    kiaraTip: "Aprender a modelar te da autonomía total sobre tus proyectos de impresión.",
  },
  {
    id: "cursos-3d-impresion",
    slug: "cursos-3d-impresion",
    icon: GraduationCap,
    title: "Curso de Impresión 3D",
    color: "teal",
    lead: "Domina el laminado, materiales y parámetros para lograr impresiones limpias y consistentes.",
    bullets: ["Configuración en OrcaSlicer / Cura", "Manejo de FDM y Resina MSLA", "Solución de problemas comunes"],
    kiaraTip: "Entender la adherencia y la temperatura evita el 90 % de impresiones fallidas.",
  },
  {
    id: "cursos-3d-mantenimiento",
    slug: "cursos-3d-mantenimiento",
    icon: GraduationCap,
    title: "Curso de Mantenimiento de Impresoras",
    color: "wine",
    lead: "Calibración, limpieza y reparación: mantén tu impresora funcionando como el primer día.",
    bullets: ["Calibración de cama y PID", "Mantenimiento preventivo", "Cambio de componentes clave"],
    kiaraTip: "Aprender a ajustar tu propia máquina te ahorra costos de taller en el futuro.",
  },
];

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
  const { data: dbServices } = useQuery(siteServicesQuery());
  const { data: quoterServices } = useQuery(quoterServicesQuery());

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
    : DEFAULT_SERVICES;

  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <span className="chip-teal">Servicios</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
            Un servicio integral de{" "}
            <span style={{ color: "var(--brand-orange)" }}>impresión 3D</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Diseño, producción, acabados y soporte técnico bajo un mismo techo en Bogotá.
          </p>
          <ShareButton
            title="Servicios de Impresión 3D — Will Design 3D"
            text="Mira los servicios de impresión 3D de Will Design 3D"
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
                      `Hola Will Design 3D! Me interesa solicitar información y cotización sobre el servicio: *${s.title}*\n\n📌 https://willdesign3d.com/servicios#${s.id}`;
                    return (
                      <a
                        href={`https://wa.me/573156724474?text=${encodeURIComponent(customMsg)}`}
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
