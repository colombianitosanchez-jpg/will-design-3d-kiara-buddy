import { createFileRoute } from "@tanstack/react-router";
import { InstagramFeed } from "@/components/InstagramFeed";

export const Route = createFileRoute("/galeria")({
  head: () => ({
    meta: [
      { title: "Galería — Proyectos de impresión 3D | Will Design 3D" },
      {
        name: "description",
        content:
          "Portafolio en vivo desde nuestro Instagram @will_design2020: piezas de gran formato, prototipos y arte 3D en Bogotá.",
      },
      { property: "og:title", content: "Galería — Will Design 3D" },
      { property: "og:description", content: "Portafolio en vivo desde Instagram @will_design2020." },
    ],
  }),
  component: GaleriaPage,
});

function GaleriaPage() {
  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <span className="chip-teal">Portafolio</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
            Nuestro{" "}
            <span style={{ color: "var(--brand-orange)" }}>portafolio</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Proyectos reales del taller y las últimas publicaciones de Instagram, en un solo lugar.
          </p>
        </div>
      </section>
      <InstagramFeed />
    </>
  );
}
