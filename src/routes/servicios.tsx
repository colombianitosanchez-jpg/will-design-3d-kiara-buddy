import { createFileRoute, Link } from "@tanstack/react-router";
import { ShareButton } from "@/components/ShareButton";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { KiaraTip } from "@/components/KiaraTip";
import { quoterServicesQuery, formatCOP } from "@/lib/quoter";
import { siteServicesQuery, SITE_SERVICE_ICONS, type SiteService } from "@/lib/site-services";

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
      {
        property: "og:description",
        content:
          "Impresión 3D a pedido, diseño personalizado, mantenimiento, upgrades y post-procesado profesional en Bogotá.",
      },
    ],
  }),
  component: ServiciosPage,
});

const cursos = [
  {
    id: "cursos-3d-modelado",
    title: "Curso de Modelado 3D",
    lead: "Aprende a modelar tus propias piezas desde cero: de la idea al archivo listo para imprimir.",
    color: "orange",
  },
  {
    id: "cursos-3d-impresion",
    title: "Curso de Impresión 3D",
    lead: "Domina el laminado, materiales y parámetros para lograr impresiones limpias y consistentes.",
    color: "teal",
  },
  {
    id: "cursos-3d-mantenimiento",
    title: "Curso de Mantenimiento de Impresoras",
    lead: "Calibración, limpieza y reparación: mantén tu impresora funcionando como el primer día.",
    color: "wine",
  },
];

const colorFor = (a: string) =>
  a === "orange" ? "var(--brand-orange)" : a === "teal" ? "var(--brand-teal)" : "var(--brand-wine)";

function ServiceArticle({ s, i }: { s: SiteService; i: number }) {
  const { data: quoterServices } = useQuery(quoterServicesQuery());
  const c = colorFor(s.color);
  const Icon = SITE_SERVICE_ICONS[s.icon] ?? SITE_SERVICE_ICONS["boxes"];
  const flip = i % 2 === 1;
  const q = (quoterServices ?? []).find((qs) => qs.site_anchor === s.slug) ?? null;

  return (
    <article
      id={s.slug}
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
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-black sm:text-3xl">{s.title}</h2>
        <p className="mt-3 text-muted-foreground">{s.lead}</p>
        <ul className="mt-5 space-y-2">
          {s.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: c }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {q ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/cotizador" search={{ servicio: q.slug }} className="btn-primary text-sm">
              Cotizar en línea
              <ArrowRight className="h-4 w-4" />
            </Link>
            {q.min_price_cop > 0 && (
              <span className="text-xs font-semibold text-muted-foreground">
                Desde {formatCOP(q.min_price_cop)}
              </span>
            )}
          </div>
        ) : (
          <Link to="/contacto" className="btn-primary mt-6 text-sm">
            Cotizar este servicio
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        {s.image_url ? (
          <img
            src={s.image_url}
            alt={s.title}
            loading="lazy"
            className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover"
          />
        ) : (
          <div
            className="mb-4 aspect-[4/3] w-full rounded-2xl"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${c} 30%, white), color-mix(in oklab, ${c} 70%, white))`,
            }}
          />
        )}
        {s.kiara_tip && <KiaraTip tip={s.kiara_tip} />}
      </div>
    </article>
  );
}

function ServiciosPage() {
  const { data: services, isLoading } = useQuery(siteServicesQuery());

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
        {isLoading && (
          <div className="grid gap-8 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-3xl border border-border bg-muted/40"
              />
            ))}
          </div>
        )}
        {!isLoading && (services ?? []).length === 0 && (
          <p className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground">
            Muy pronto publicaremos el detalle de nuestros servicios.
          </p>
        )}
        {(services ?? []).map((s, i) => (
          <ServiceArticle key={s.id} s={s} i={i} />
        ))}
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <span className="chip-teal">Cursos 3D</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Formación en <span style={{ color: "var(--brand-orange)" }}>impresión 3D</span>
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Clases presenciales y virtuales, con práctica real en nuestro taller de Bogotá.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {cursos.map((c) => {
              const col = colorFor(c.color);
              return (
                <article
                  key={c.id}
                  id={c.id}
                  className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-sm"
                >
                  <div
                    className="grid h-12 w-12 place-items-center rounded-2xl"
                    style={{
                      background: `color-mix(in oklab, ${col} 15%, white)`,
                      color: col,
                    }}
                  >
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-black">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.lead}</p>
                  <CursoCta cursoId={c.id} />
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

/** Botón del curso: usa el cotizador si hay un servicio con ancla "cursos-3d". */
function CursoCta({ cursoId }: { cursoId: string }) {
  const { data: quoterServices } = useQuery(quoterServicesQuery());
  const q = (quoterServices ?? []).find((s) => s.site_anchor === "cursos-3d") ?? null;
  return q ? (
    <Link to="/cotizador" search={{ servicio: q.slug }} className="btn-primary mt-5 text-sm">
      Cotizar el curso
      <ArrowRight className="h-4 w-4" />
    </Link>
  ) : (
    <Link to="/contacto" className="btn-primary mt-5 text-sm">
      Quiero inscribirme
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
