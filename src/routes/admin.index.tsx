import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, Wrench, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminHome,
});

function AdminHome() {
  const [stats, setStats] = useState({ products: 0, orders: 0, pending: 0 });

  useEffect(() => {
    (async () => {
      const [p, o, pending] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendiente"),
      ]);
      setStats({
        products: p.count ?? 0,
        orders: o.count ?? 0,
        pending: pending.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    {
      to: "/admin/inventario",
      label: "Productos en inventario",
      value: stats.products,
      icon: Package,
      color: "var(--brand-orange)",
    },
    {
      to: "/admin/pedidos",
      label: "Pedidos totales",
      value: stats.orders,
      icon: ShoppingCart,
      color: "var(--brand-teal-deep)",
    },
    {
      to: "/admin/pedidos",
      label: "Pendientes por atender",
      value: stats.pending,
      icon: TrendingUp,
      color: "var(--brand-wine)",
    },
  ];

  return (
    <>
      <h1 className="text-3xl font-black">Resumen</h1>
      <p className="mt-1 text-sm text-muted-foreground">Vista rápida del estado de la tienda.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-3xl border border-border bg-card p-5 transition hover:shadow-md"
          >
            <c.icon className="h-6 w-6" style={{ color: c.color }} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-1 text-3xl font-black">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          to="/admin/inventario"
          className="rounded-3xl border border-border bg-card p-6 transition hover:shadow-md"
        >
          <Package className="h-6 w-6 text-[var(--brand-orange)]" />
          <h2 className="mt-3 text-lg font-bold">Gestionar inventario</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Añade, edita o elimina productos de la tienda.
          </p>
        </Link>
        <Link
          to="/admin/servicios"
          className="rounded-3xl border border-border bg-card p-6 transition hover:shadow-md"
        >
          <Wrench className="h-6 w-6 text-[var(--brand-teal-deep)]" />
          <h2 className="mt-3 text-lg font-bold">Servicios 3D</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura los servicios de impresión y post-procesado.
          </p>
        </Link>
      </div>
    </>
  );
}
