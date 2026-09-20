import { createFileRoute } from "@tanstack/react-router";
import { Wrench, Printer, Sparkles, Package2, PencilRuler, Settings } from "lucide-react";

export const Route = createFileRoute("/admin/servicios")({
  ssr: false,
  component: ServiciosAdmin,
});

const servicios = [
  { icon: Printer, name: "Impresión 3D", desc: "FDM, SLA y gran formato hasta 50x50 cm." },
  { icon: Sparkles, name: "Post-procesado", desc: "Lijado, pintado y acabados premium." },
  { icon: Package2, name: "Venta de equipos", desc: "Impresoras, filamentos y resinas." },
  { icon: PencilRuler, name: "Diseño personalizado", desc: "Modelado 3D bajo pedido." },
  { icon: Settings, name: "Mantenimiento técnico", desc: "Servicio técnico y calibración." },
];

function ServiciosAdmin() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Servicios 3D</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Servicios que ofrece Will Design 3D en la web pública.
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm font-bold text-muted-foreground"
          title="Próximamente"
        >
          <Wrench className="h-4 w-4" /> Editar servicios (próximamente)
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {servicios.map((s) => (
          <div key={s.name} className="rounded-3xl border border-border bg-card p-5">
            <s.icon className="h-6 w-6 text-[var(--brand-orange)]" />
            <h3 className="mt-3 text-lg font-bold">{s.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-2xl bg-muted p-4 text-xs text-muted-foreground">
        Solo el <strong>Super Admin</strong> puede editar servicios. Los empleados ven únicamente Inventario y Pedidos.
      </p>
    </>
  );
}
