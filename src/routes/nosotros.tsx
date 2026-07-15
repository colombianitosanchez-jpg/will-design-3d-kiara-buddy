import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Target, Eye, Heart, MapPin, Wrench, ArrowRight } from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";
import logoAsset from "@/assets/will_logo.asset.json";
import { siteContentQuery } from "@/lib/catalog";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Nosotros — Will Design 3D en Bogotá" },
      {
        name: "description",
        content:
          "Somos Will Design 3D, un taller especializado en impresión 3D de gran formato en Bogotá. Diseño, producción y asesoría con Kiara al mando.",
      },
      { property: "og:title", content: "Nosotros — Will Design 3D" },
      { property: "og:description", content: "Taller de impresión 3D en Bogotá. Diseño, producción, asesoría y mucho ❤️." },
    ],
  }),
  component: NosotrosPage,
});

function NosotrosPage() {
  const { data: content } = useQuery(siteContentQuery());
  const about =
    content?.about_short ||
    "Nacimos en 2020 con una impresora prestada, muchas ganas y una pastora alemana que se robaba los rollos de filamento. Hoy seguimos aquí — con más máquinas, más experiencia y la misma perra al mando.";
  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:py-20">
          <div>
            <span className="chip-teal">Nuestra historia</span>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
              Un taller 3D con{" "}
              <span style={{ color: "var(--brand-orange)" }}>alma</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground whitespace-pre-line">
              {about}
            </p>
          </div>
          <img
            src={logoAsset.url}
            alt="Will Design 3D"
            width={160}
            height={160}
            className="hidden h-40 w-40 rounded-3xl object-cover shadow-lg md:block"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3 md:py-20">
        {[
          {
            icon: Target,
            title: "Misión",
            body: "Democratizar la impresión 3D en Colombia con calidad profesional, precios justos y asesoría real.",
            color: "orange",
          },
          {
            icon: Eye,
            title: "Visión",
            body: "Ser el referente colombiano en impresión 3D de gran formato para arte, industria y educación.",
            color: "teal",
          },
          {
            icon: Heart,
            title: "Valores",
            body: "Cercanía, honestidad técnica, y ese cariño que solo un taller familiar (con perro incluido) puede ofrecer.",
            color: "wine",
          },
        ].map((c) => {
          const col =
            c.color === "orange"
              ? "var(--brand-orange)"
              : c.color === "teal"
                ? "var(--brand-teal)"
                : "var(--brand-wine)";
          return (
            <article
              key={c.title}
              className="rounded-3xl border border-border bg-card p-6"
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl"
                style={{
                  background: `color-mix(in oklab, ${col} 15%, white)`,
                  color: col,
                }}
              >
                <c.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-black">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </article>
          );
        })}
      </section>

      {/* Kiara story */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)] md:py-20">
          <img
            src={kiaraAsset.url}
            alt="Kiara, la jefa"
            width={240}
            height={240}
            className="h-48 w-48 rounded-full object-cover shadow-xl ring-4 ring-[var(--brand-orange)] md:h-60 md:w-60"
          />
          <div>
            <span className="chip-teal">La verdadera jefa</span>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Kiara, nuestra directora de operaciones 🐾
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pastora alemana de pura raza, aficionada a robar filamento y
              certificada en levantar el ánimo del equipo. Supervisa cada
              impresión, aunque su método favorito de control de calidad sea
              olfatear las piezas al terminar.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <span className="chip-teal">Nuestro taller</span>
            <h2 className="mt-3 text-3xl font-black">
              Equipo profesional en Bogotá
            </h2>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-5 w-5 text-[var(--brand-orange)]" />
                <span>
                  Impresoras FDM de gran formato hasta 500×500×500 mm.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-5 w-5 text-[var(--brand-teal)]" />
                <span>Impresoras de resina 12K para alto detalle.</span>
              </li>
              <li className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-5 w-5 text-[var(--brand-wine)]" />
                <span>Área de acabados con cabina de pintura profesional.</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-[var(--brand-wine)]" />
                <span>Bogotá, Colombia · Atención por cita previa.</span>
              </li>
            </ul>
            <Link to="/contacto" className="btn-primary mt-6 text-sm">
              Agenda una visita
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div
            className="min-h-64 rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--brand-teal) 30%, white), color-mix(in oklab, var(--brand-wine) 40%, white))",
            }}
          />
        </div>
      </section>
    </>
  );
}
