import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/inventario")({
  ssr: false,
  component: InventarioPage,
});

function InventarioPage() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona los productos que se muestran en la tienda pública.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <Package className="h-10 w-10 text-[var(--brand-orange)]" />
        <h2 className="mt-3 text-xl font-bold">Editor visual de productos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usa el gestor completo con tabla, subida de imágenes y edición en un clic.
        </p>
        <Link
          to="/panel/productos"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          Abrir gestor de productos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
