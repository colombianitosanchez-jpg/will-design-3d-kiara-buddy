import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

export const Route = createFileRoute("/admin/clientes")({
  ssr: false,
  component: ClientesAdmin,
});

function ClientesAdmin() {
  return (
    <div>
      <h1 className="text-3xl font-black">Clientes</h1>
      <p className="mt-1 text-sm text-muted-foreground">CRM de clientes de Will Design 3D.</p>

      <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
        <Users className="mx-auto h-10 w-10 text-[var(--brand-teal-deep)]" />
        <h2 className="mt-3 text-lg font-black">Próximamente en Fase 2</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Aquí verás una tabla con todos los clientes que han comprado o solicitado cotización:
          nombre, WhatsApp, email y total de pedidos realizados, con buscador rápido.
        </p>
      </div>
    </div>
  );
}
