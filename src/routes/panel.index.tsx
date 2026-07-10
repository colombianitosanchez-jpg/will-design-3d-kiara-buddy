import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, FileText } from "lucide-react";

export const Route = createFileRoute("/panel/")({
  ssr: false,
  component: PanelHome,
});

function PanelHome() {
  const [stats, setStats] = useState({ products: 0, orders: 0, pending: 0 });

  useEffect(() => {
    (async () => {
      const [p, o, pending] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
      ]);
      setStats({
        products: p.count ?? 0,
        orders: o.count ?? 0,
        pending: pending.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { to: "/panel/productos", label: "Productos", value: stats.products, icon: Package, color: "var(--brand-orange)" },
    { to: "/panel/pedidos", label: "Pedidos totales", value: stats.orders, icon: ShoppingCart, color: "var(--brand-teal-deep)" },
    { to: "/panel/pedidos", label: "Pendientes", value: stats.pending, icon: ShoppingCart, color: "var(--brand-wine)" },
  ];

  return (
    <>
      <h1 className="text-3xl font-black">Panel de administración</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gestiona productos, pedidos y contenido de la web sin tocar código.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-3xl border border-border bg-card p-5 transition hover:shadow-md"
          >
            <c.icon className="h-6 w-6" style={{ color: c.color }} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-3xl font-black">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-[var(--brand-orange)]" />
          <h2 className="text-lg font-bold">Guía rápida</h2>
        </div>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Sube o edita productos en <Link to="/panel/productos" className="font-semibold text-foreground underline">Productos</Link>.</li>
          <li>Revisa y actualiza el estado de las compras en <Link to="/panel/pedidos" className="font-semibold text-foreground underline">Pedidos</Link>.</li>
          <li>Cambia textos e imágenes del sitio en <Link to="/panel/contenido" className="font-semibold text-foreground underline">Contenido</Link>.</li>
        </ol>
      </div>
    </>
  );
}
