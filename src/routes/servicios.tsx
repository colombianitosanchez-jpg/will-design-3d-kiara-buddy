import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { KiaraTip } from "@/components/KiaraTip";
import { quoterServicesQuery, formatCOP } from "@/lib/quoter";

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

const services = [
  {
    id: "impresion-3d",
    icon: Boxes,
    title: "Impresión 3D a Pedido",
    color: "orange",
    lead:
      "Producimos tus piezas en FDM y resina, con especialidad en gran formato (50×50 cm o más).",
    bullets: [
      "FDM: PLA, PETG, ABS, TPU, PA, PC",
      "Resina MSLA hasta 12K para alto detalle",
      "Volumen de producción y prototipos únicos",
      "Cotización por WhatsApp con archivo o boceto",
    ],
    kiaraTip:
      "Si tu archivo aún no está optimizado, avísanos: revisamos huecos y grosores gratis.",
  },
  {
    id: "modelado-3d",
    icon: PenTool,
    title: "Diseño 3D Personalizado",
    color: "teal",
    lead:
      "Modelamos desde cero usando tus referencias, planos o fotografías. Ideal si no tienes archivo.",
    bullets: [
      "Modelado paramétrico e ingeniería inversa",
      "Escultura orgánica para figuras y arte",
      "Optimización de piezas para impresión",
      "Entregamos STL/OBJ/STEP",
    ],
    kiaraTip:
      "Cuéntanos función y tamaño primero — un buen diseño ahorra horas de impresión.",
  },
  {
    id: "servicio-tecnico",
    icon: Wrench,
    title: "Mantenimiento y Reparación",
    color: "wine",
    lead:
      "Servicio técnico especializado para impresoras FDM y de resina de cualquier marca.",
    bullets: [
      "Diagnóstico y calibración completa",
      "Cambio de hotend, boquillas, correas y termistores",
      "Nivelación automática y firmware",
      "Servicio en taller o a domicilio en Bogotá",
    ],
    kiaraTip:
      "Un mantenimiento cada 500 h de impresión evita el 80 % de las fallas comunes.",
  },
  {
    id: "escaneo-3d",
    icon: ScanLine,
    title: "Escaneo 3D",
    color: "teal",
    lead:
      "Digitalizamos objetos, espacios y piezas reales para obtener modelos 3D listos para editar o imprimir.",
    bullets: [
      "Escaneo de objetos pequeños con alta precisión",
      "Escaneo de espacios y ambientes (tours 3D)",
      "Limpieza y reparación de malla",
      "Entrega en STL/OBJ y ingeniería inversa",
    ],
    kiaraTip:
      "Si la pieza es brillante u oscura, la tratamos con spray mate para que el escáner la lea mejor.",
  },
  {
    id: "upgrades",
    icon: Sparkles,
    title: "Upgrades y Modding",
    color: "orange",
    lead:
      "Lleva tu impresora al siguiente nivel: velocidad, calidad y confiabilidad.",
    bullets: [
      "Klipper y placas silenciosas",
      "Cambio a extrusor directo",
      "Boquillas de acero endurecido y bimetálicas",
      "Cámara y sensores de filamento",
    ],
    kiaraTip:
      "Antes de comprar una impresora nueva, pregúntanos por un upgrade — a veces basta.",
  },
  {
    id: "postprocesado",
    icon: Ruler,
    title: "Post-procesado y Acabados",
    color: "teal",
    lead:
      "Convertimos una pieza recién impresa en un producto terminado profesional.",
    bullets: [
      "Lijado y masillado",
      "Aplicación de primer y pintura",
      "Acabados metalizados, mate o brillo",
      "Ensamble y montaje final",
    ],
    kiaraTip:
      "El acabado Premium multiplica el impacto visual — pídelo si vas a exhibir la pieza.",
  },
  {
    id: "prototipado",
    icon: ShoppingBag,
    title: "Prototipado Industrial",
    color: "wine",
    lead:
      "De la idea al prototipo funcional para validar diseño, ergonomía y mercado.",
    bullets: [
      "Iteraciones rápidas de diseño",
      "Prototipos funcionales y estéticos",
      "Materiales técnicos según requerimiento",
      "Asesoría para producción a escala",
    ],
    kiaraTip:
      "Comienza con un prototipo pequeño en PLA — validas la forma antes de invertir más.",
  },
];


const cursos = [
  {
    id: "cursos-3d-modelado",
    title: "Curso de Modelado 3D",
    lead:
      "Aprende a modelar tus propias piezas desde cero: de la idea al archivo listo para imprimir.",
    color: "orange",
  },
  {
    id: "cursos-3d-impresion",
    title: "Curso de Impresión 3D",
    lead:
      "Domina el laminado, materiales y parámetros para lograr impresiones limpias y consistentes.",
    color: "teal",
  },
  {
    id: "cursos-3d-mantenimiento",
    title: "Curso de Mantenimiento de Impresoras",
    lead:
      "Calibración, limpieza y reparación: mantén tu impresora funcionando como el primer día.",
    color: "wine",
  },
];

const colorFor = (a: string) =>
  a === "orange"
    ? "var(--brand-orange)"
    : a === "teal"
      ? "var(--brand-teal)"
      : "var(--brand-wine)";

function ServiciosPage() {
  const { data: quoterServices } = useQuery(quoterServicesQuery());
  /** Servicio del cotizador vinculado a esta sección (Panel → Cotizador → Ancla). */
  const quoterFor = (anchor: string) =>
    (quoterServices ?? []).find((s) => s.site_anchor === anchor) ?? null;

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
            Diseño, producción, acabados y soporte técnico bajo un mismo techo
            en Bogotá.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 md:py-20">
        {services.map((s, i) => {
          const c = colorFor(s.color);
          const flip = i % 2 === 1;
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
                  <s.icon className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                  {s.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{s.lead}</p>
                <ul className="mt-5 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: c }}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/contacto" className="btn-primary mt-6 text-sm">
                  Cotizar este servicio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div
                  className="mb-4 aspect-[4/3] w-full rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in oklab, ${c} 30%, white), color-mix(in oklab, ${c} 70%, white))`,
                  }}
                />
                <KiaraTip tip={s.kiaraTip} />
              </div>
            </article>
          );
        })}
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
                  <Link to="/contacto" className="btn-primary mt-5 text-sm">
                    Quiero inscribirme
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
