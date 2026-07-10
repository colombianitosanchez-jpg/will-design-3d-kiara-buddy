import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/panel/pedidos")({
  ssr: false,
  component: PedidosAdmin,
});

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string | null;
  notes: string | null;
  total_cop: number;
  status: "pendiente" | "empacando" | "enviado" | "entregado" | "cancelado";
  created_at: string;
};

type Item = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price_cop: number;
};

const STATUSES: Order["status"][] = ["pendiente", "empacando", "enviado", "entregado", "cancelado"];

const statusColors: Record<Order["status"], string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  empacando: "bg-blue-100 text-blue-800",
  enviado: "bg-purple-100 text-purple-800",
  entregado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

function formatCOP(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function PedidosAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"todos" | Order["status"]>("todos");

  async function load() {
    setLoading(true);
    const [o, i] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("*"),
    ]);
    setOrders((o.data as Order[]) ?? []);
    setItems((i.data as Item[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: Order["status"]) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return alert(error.message);
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  const filtered = filter === "todos" ? orders : orders.filter((o) => o.status === filter);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} pedido{filtered.length === 1 ? "" : "s"}.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-full border border-input bg-background px-4 py-2 text-sm"
        >
          <option value="todos">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No hay pedidos aún.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((o) => {
              const orderItems = items.filter((it) => it.order_id === o.id);
              const isOpen = !!open[o.id];
              return (
                <li key={o.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setOpen((s) => ({ ...s, [o.id]: !s[o.id] }))}
                      className="rounded-lg p-1 hover:bg-muted"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{o.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.customer_email} · {new Date(o.created_at).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <p className="font-bold">{formatCOP(o.total_cop)}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[o.status]}`}>
                      {o.status}
                    </span>
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])}
                      className="rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid gap-4 rounded-2xl bg-muted/40 p-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Envío</p>
                        <p className="mt-1 text-sm">{o.shipping_address}</p>
                        {o.shipping_city && <p className="text-sm">{o.shipping_city}</p>}
                        {o.customer_phone && <p className="mt-2 text-sm">Tel: {o.customer_phone}</p>}
                        {o.notes && (
                          <p className="mt-2 text-sm italic text-muted-foreground">Notas: {o.notes}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</p>
                        <ul className="mt-1 space-y-1 text-sm">
                          {orderItems.length === 0 ? (
                            <li className="text-muted-foreground">—</li>
                          ) : (
                            orderItems.map((it) => (
                              <li key={it.id} className="flex justify-between gap-3">
                                <span>
                                  {it.quantity} × {it.product_name}
                                </span>
                                <span className="font-semibold">{formatCOP(it.unit_price_cop * it.quantity)}</span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
