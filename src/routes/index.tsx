import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  X,
  Boxes,
  Sparkles,
  ShoppingBag,
  PenTool,
  Wrench,
  ArrowRight,
  Instagram,
  MessageCircle,
  MapPin,
  Ruler,
} from "lucide-react";
import logoAsset from "@/assets/will_logo.asset.json";
import heroImg from "@/assets/hero.jpg";
import { KiaraWidget } from "@/components/KiaraWidget";
import { Quoter } from "@/components/Quoter";
import { LiveBanner } from "@/components/LiveBanner";
import { InstagramFeed } from "@/components/InstagramFeed";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Will Design 3D — Impresión 3D de gran formato en Bogotá" },
      {
        name: "description",
        content:
          "Especialistas en impresión 3D de gran formato en Bogotá. Diseño, post-procesado, venta de equipos e insumos, mantenimiento técnico. Supervisado por Kiara 🐾.",
      },
      { property: "og:title", content: "Will Design 3D — Impresión 3D en Bogotá" },
      {
        property: "og:description",
        content:
          "Llevamos tus ideas a la realidad. Sin límites de tamaño. Impresión 3D de gran formato.",
      },
    ],
  }),
  component: Home,
});

const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#servicios", label: "Servicios" },
  { href: "#cotizador", label: "Cotizador" },
  { href: "#tienda", label: "Tienda" },
  { href: "#portafolio", label: "Portafolio" },
  { href: "#contacto", label: "Contacto" },
];

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

const portfolio = [
  { img: p1, title: "Escultura orgánica XL", tag: "Gran formato" },
  { img: p2, title: "Casco pulido premium", tag: "Post-procesado" },
  { img: p3, title: "Impresora en acción", tag: "Producción" },
  { img: p4, title: "Maqueta arquitectónica", tag: "Modelado" },
  { img: p5, title: "Figura monumental", tag: "Sin límite" },
  { img: p6, title: "Prototipos mecánicos", tag: "Industrial" },
];

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Services />
        <Portfolio />
        <Quoter />
        <ShopCTA />
        <Contact />
      </main>
      <Footer />
      <KiaraWidget />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
        <a href="#inicio" className="flex min-w-0 items-center gap-3">
          <img
            src={logoAsset.url}
            alt="Will Design 3D"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-black tracking-tight sm:text-lg">
              Will Design <span style={{ color: "var(--brand-orange)" }}>3D</span>
            </p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Impresión 3D · Bogotá
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <a href="#contacto" className="btn-primary ml-2 text-sm">
            Cotizar
          </a>
        </nav>

        <button
          aria-label="Abrir menú"
          className="rounded-full border border-border p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <a href="#contacto" onClick={() => setOpen(false)} className="btn-primary mt-2 text-sm">
              Cotizar Proyecto
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
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
            Llevamos tus ideas a la realidad.{" "}
            <span style={{ color: "var(--brand-orange)" }}>Sin límites</span> de
            tamaño.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Especialistas en <strong className="text-foreground">Impresión 3D
            de gran formato</strong> en Bogotá. Diseño, producción y acabados
            profesionales bajo un mismo techo.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#contacto" className="btn-primary">
              Cotizar Proyecto
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#portafolio" className="btn-outline">
              Ver portafolio
            </a>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              { k: "50×50", v: "cm mínimo" },
              { k: "∞", v: "sin límite" },
              { k: "+200", v: "proyectos" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-border bg-card p-3 text-center">
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
          <img
            src={heroImg}
            alt="Impresión 3D de gran formato Will Design 3D"
            width={1600}
            height={1000}
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-border"
          />
          <div className="absolute -bottom-5 -left-5 hidden max-w-[15rem] rounded-2xl border border-border bg-card p-3 shadow-xl sm:block">
            <p className="text-xs font-semibold text-muted-foreground">Pieza destacada</p>
            <p className="text-sm font-bold">Escultura 1.8 m — PLA reforzado</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const colorFor = (a: string) =>
    a === "orange"
      ? "var(--brand-orange)"
      : a === "teal"
        ? "var(--brand-teal)"
        : "var(--brand-wine)";
  return (
    <section id="servicios" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
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
              <a
                href="#contacto"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold transition group-hover:gap-2"
                style={{ color: c }}
              >
                Más información <ArrowRight className="h-4 w-4" />
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Portfolio() {
  return (
    <section
      id="portafolio"
      className="border-y border-border"
      style={{ background: "color-mix(in oklab, var(--brand-teal) 6%, white)" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="chip-teal">Portafolio</span>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
              Piezas que hablan por sí solas
            </h2>
            <p className="mt-3 text-muted-foreground">
              Una selección de trabajos recientes — destacando piezas de gran
              tamaño. Síguenos en Instagram y Threads para ver más.
            </p>
          </div>
          <a
            href="https://www.instagram.com/will_design2020/"
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
          >
            <Instagram className="h-4 w-4" />
            @will_design2020
          </a>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {portfolio.map((p, i) => (
            <a
              key={p.title}
              href="https://www.instagram.com/will_design2020/"
              target="_blank"
              rel="noreferrer"
              className={`group relative block overflow-hidden rounded-2xl bg-card ring-1 ring-border ${
                i === 0 ? "col-span-2 row-span-2 md:col-span-2 md:row-span-2" : ""
              }`}
            >
              <img
                src={p.img}
                alt={p.title}
                width={800}
                height={800}
                loading="lazy"
                className="aspect-square h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-3 opacity-0 transition group-hover:opacity-100">
                <span className="text-sm font-bold text-white">{p.title}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "var(--brand-orange)", color: "white" }}
                >
                  {p.tag}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShopCTA() {
  return (
    <section id="tienda" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div
        className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-wine), color-mix(in oklab, var(--brand-wine) 70%, black))",
          color: "white",
        }}
      >
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--brand-orange)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--brand-teal)" }}
        />
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Tienda
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              Impresoras, filamentos y resinas al mejor precio
            </h2>
            <p className="mt-3 max-w-xl text-white/80">
              Trabajamos con marcas líderes. Asesoría técnica incluida en cada
              compra — te ayudamos a elegir el equipo perfecto para tu proyecto.
            </p>
          </div>
          <a
            href="#contacto"
            className="btn-primary shrink-0"
            style={{ background: "white", color: "var(--brand-wine)" }}
          >
            Ver catálogo
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contacto" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <span className="chip-teal">Contacto</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
            ¿Listo para imprimir lo imposible?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cuéntanos tu proyecto. Kiara te acompañará durante todo el proceso —
            desde la cotización hasta la entrega.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--brand-orange) 15%, white)",
                  color: "var(--brand-orange)",
                }}
              >
                <MessageCircle className="h-4 w-4" />
              </span>
              <a
                href="https://wa.me/573000000000"
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
              >
                WhatsApp — chatea con nosotros
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--brand-teal) 15%, white)",
                  color: "var(--brand-teal-deep)",
                }}
              >
                <Instagram className="h-4 w-4" />
              </span>
              <a
                href="https://www.instagram.com/will_design2020/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
              >
                @will_design2020
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--brand-wine) 12%, white)",
                  color: "var(--brand-wine)",
                }}
              >
                <MapPin className="h-4 w-4" />
              </span>
              <span className="font-semibold">Bogotá, Colombia</span>
            </li>
          </ul>
        </div>

        <form
          className="rounded-3xl border border-border bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget as HTMLFormElement;
            const data = new FormData(f);
            const msg = encodeURIComponent(
              `Hola Will Design 3D, soy ${data.get("name")}.\n${data.get("msg")}`,
            );
            window.open(`https://wa.me/573000000000?text=${msg}`, "_blank");
          }}
        >
          <h3 className="text-lg font-bold">Cotiza tu proyecto</h3>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Nombre</span>
              <input
                name="name"
                required
                className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tu nombre"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Email o teléfono</span>
              <input
                name="contact"
                required
                className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Cómo contactarte"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Cuéntanos tu proyecto</span>
              <textarea
                name="msg"
                required
                rows={4}
                className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tamaño, material, referencia visual…"
              />
            </label>
            <button type="submit" className="btn-primary mt-2 w-full">
              Enviar por WhatsApp
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="border-t border-border"
      style={{ background: "color-mix(in oklab, var(--brand-wine) 6%, white)" }}
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img
              src={logoAsset.url}
              alt="Will Design 3D"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover"
            />
            <p className="text-base font-black">
              Will Design <span style={{ color: "var(--brand-orange)" }}>3D</span>
            </p>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Impresión 3D de gran formato, diseño, insumos y mantenimiento en
            Bogotá.
          </p>
        </div>

        <div>
          <p className="text-sm font-bold">Navegación</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold">Síguenos</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://www.instagram.com/will_design2020/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Instagram className="h-4 w-4" /> Instagram
            </a>
            <a
              href="https://www.threads.net/@will_design2020"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
            >
              Threads
            </a>
            <a
              href="https://wa.me/573000000000"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <p>© {new Date().getFullYear()} Will Design 3D. Todos los derechos reservados.</p>
          <p className="font-semibold">Supervisado por Kiara 🐾</p>
        </div>
      </div>
    </footer>
  );
}
