import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/pedidos")({
  ssr: false,
  component: PedidosPage,
});

function PedidosPage() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-black">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta las compras entrantes y actualiza el estado de envío.
        </p>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <ShoppingCart className="h-10 w-10 text-[var(--brand-teal-deep)]" />
        <h2 className="mt-3 text-xl font-bold">Gestor de pedidos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ver detalles del cliente, productos y cambiar entre Pendiente / Empacando / Enviado.
        </p>
        <Link
          to="/panel/pedidos"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          Abrir gestor de pedidos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
