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
  const [tab, setTab] = useState<"pedidos" | "cotizaciones">("pedidos");
  return (
    <>
      <div className="mb-6 flex gap-2">
        {(["pedidos", "cotizaciones"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
              tab === t ? "bg-[var(--brand-wine)] text-white" : "bg-muted"
            }`}
          >
            {t === "pedidos" ? "Pedidos de tienda" : "Cotizaciones 3D"}
          </button>
        ))}
      </div>
      {tab === "pedidos" ? <OrdersTab /> : <QuotesTab />}
    </>
  );
}

type Quote = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  design_state: string;
  size_label: string;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  material: string;
  finish: string;
  notes: string;
  file_name: string | null;
  file_path: string | null;
  status: string;
  created_at: string;
};

function QuotesTab() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      setQuotes((data as unknown as Quote[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function download(q: Quote) {
    if (!q.file_path) return;
    const { data, error } = await supabase.storage
      .from("quote-files")
      .createSignedUrl(q.file_path, 60 * 10, { download: q.file_name ?? true });
    if (error || !data) return alert("No se pudo generar el enlace: " + error?.message);
    window.open(data.signedUrl, "_blank");
  }

  return (
    <>
      <h1 className="text-3xl font-black">Cotizaciones 3D</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {quotes.length} cotización{quotes.length === 1 ? "" : "es"} enviada
        {quotes.length === 1 ? "" : "s"} desde el Cotizador de Proyectos 3D.
      </p>

      <div className="mt-6 rounded-3xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Todavía no hay cotizaciones.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {quotes.map((q) => {
              const isOpen = !!open[q.id];
              return (
                <li key={q.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setOpen((s) => ({ ...s, [q.id]: !s[q.id] }))}
                      className="rounded-lg p-1 hover:bg-muted"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{q.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {q.customer_email} · {new Date(q.created_at).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {q.size_label || "—"}
                    </span>
                    {q.file_path && (
                      <button
                        onClick={() => download(q)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        Descargar archivo
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid gap-4 rounded-2xl bg-muted/40 p-4 md:grid-cols-2">
                      <div className="space-y-1 text-sm">
                        <p><strong>Diseño:</strong> {q.design_state || "—"}</p>
                        <p><strong>Tamaño:</strong> {q.size_label || "—"}</p>
                        {(q.length_cm || q.width_cm || q.height_cm) && (
                          <p>
                            <strong>Medidas:</strong> {q.length_cm ?? "?"} × {q.width_cm ?? "?"} ×{" "}
                            {q.height_cm ?? "?"} cm
                          </p>
                        )}
                        <p><strong>Material:</strong> {q.material || "—"}</p>
                        <p><strong>Acabado:</strong> {q.finish || "—"}</p>
                      </div>
                      <div className="space-y-1 text-sm">
                        {q.customer_phone && <p><strong>Tel:</strong> {q.customer_phone}</p>}
                        <p>
                          <strong>Archivo:</strong>{" "}
                          {q.file_name ? q.file_name : "sin archivo adjunto"}
                        </p>
                        {q.notes && (
                          <p className="italic text-muted-foreground">Notas: {q.notes}</p>
                        )}
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

function OrdersTab() {
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
