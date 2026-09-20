import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Quoter } from "@/components/Quoter";

const searchSchema = z.object({
  servicio: z.string().max(80).optional(),
});

export const Route = createFileRoute("/cotizador")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Cotizador de Impresión 3D en línea — Will Design 3D" },
      {
        name: "description",
        content:
          "Calcula al instante el precio de tu impresión 3D, diseño, escaneo o post-procesado. Ajusta material, tamaño y acabado y recibe tu cotización por WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Cotizador de Impresión 3D en línea — Will Design 3D" },
      {
        property: "og:description",
        content:
          "Precio estimado al instante para impresión 3D, diseño, escaneo y acabados. 100% configurable por nuestro equipo.",
      },
    ],
  }),
  component: CotizadorPage,
});

function CotizadorPage() {
  const { servicio } = Route.useSearch();
  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <span className="chip-teal">Cotizador en línea</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Calcula tu proyecto <span style={{ color: "var(--brand-orange)" }}>en tiempo real</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Desde un rollo de filamento hasta una pieza de gran formato: elige el servicio, mueve
            los deslizadores y verás el precio estimado al instante.
          </p>
        </div>
      </section>
      <Quoter initialServiceSlug={servicio} />
    </>
  );
}
