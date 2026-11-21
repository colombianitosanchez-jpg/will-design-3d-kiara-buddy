import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronDown, ChevronRight, MessageCircle, Send } from "lucide-react";
import { confirmPayment, rejectPayment } from "@/lib/order-payments.functions";
import {
  getNotificationTemplatesForOrders,
  updateOrderStatusAdmin,
} from "@/lib/notifications.functions";
import {
  buildCustomerWhatsAppUrl,
  DEFAULT_ORDER_TEMPLATES,
  expandNotificationTemplate,
  formatOrderCode,
} from "@/lib/notification-templates";
import { openExternalUrl } from "@/lib/whatsapp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  payment_method_name: string | null;
  payment_status: "esperando_pago" | "comprobante_enviado" | "pagado" | "rechazado";
  payment_reference: string | null;
  payment_reported_at: string | null;
  payment_note: string | null;
};

const paymentColors: Record<Order["payment_status"], string> = {
  esperando_pago: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  comprobante_enviado: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  pagado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rechazado: "bg-destructive/15 text-destructive",
};

const paymentLabels: Record<Order["payment_status"], string> = {
  esperando_pago: "esperando pago",
  comprobante_enviado: "comprobante enviado",
  pagado: "pagado",
  rechazado: "pago rechazado",
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
  pendiente: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  empacando: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  enviado: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  entregado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelado: "bg-destructive/15 text-destructive",
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
            type="button"
            onClick={() => setTab(t)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-bold capitalize transition ${
              tab === t ? "bg-[var(--brand-wine)] text-white" : "bg-muted text-foreground"
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

type QuoteAnswer = { label: string; value: string };

type Quote = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  service_name: string;
  answers: QuoteAnswer[] | null;
  quantity: number;
  estimated_total_cop: number;
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

const QUOTE_STATUSES = ["nueva", "cotizada", "aprobada", "rechazada"] as const;

const quoteStatusColors: Record<string, string> = {
  nueva: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  cotizada: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  aprobada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rechazada: "bg-destructive/15 text-destructive",
};

function QuotesTab() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"todos" | (typeof QUOTE_STATUSES)[number]>("todos");

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

  async function updateStatus(id: string, status: string) {
    const previous = quotes.find((q) => q.id === id)?.status;
    setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, status } : q)));
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) {
      if (previous !== undefined) {
        setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, status: previous } : q)));
      }
      return toast.error(error.message);
    }
    toast.success("Estado de cotización actualizado");
  }

  async function download(q: Quote) {
    if (!q.file_path) return;
    const { data, error } = await supabase.storage
      .from("quote-files")
      .createSignedUrl(q.file_path, 60 * 10, { download: q.file_name ?? true });
    if (error || !data) return toast.error("No se pudo generar el enlace: " + error?.message);
    openExternalUrl(data.signedUrl);
  }

  function contactQuoteWhatsApp(q: Quote) {
    const serviceLabel = q.service_name || q.size_label || "impresión 3D";
    const message = `Hola ${q.customer_name}, te escribimos de Will Design 3D sobre tu cotización de ${serviceLabel} (estimada en ${formatCOP(Number(q.estimated_total_cop) || 0)}). ¿Deseas confirmar los detalles para iniciar la producción?`;
    const url = buildCustomerWhatsAppUrl(q.customer_phone, message);
    if (!url) {
      toast.error("Esta cotización no tiene número de celular válido registrado.");
      return;
    }
    openExternalUrl(url);
  }

  const filtered = filter === "todos" ? quotes : quotes.filter((q) => q.status === filter);
  const pipeline = filtered.reduce((s, q) => s + (Number(q.estimated_total_cop) || 0), 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Cotizaciones 3D</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} cotización{filtered.length === 1 ? "" : "es"} · valor estimado{" "}
            <strong>{formatCOP(pipeline)}</strong>
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-full border border-input bg-background px-4 py-2 text-sm"
        >
          <option value="todos">Todos los estados</option>
          {QUOTE_STATUSES.map((s) => (
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
            Todavía no hay cotizaciones.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((q) => {
              const isOpen = !!open[q.id];
              const answers = Array.isArray(q.answers) ? q.answers : [];
              const hasValidPhone = Boolean(buildCustomerWhatsAppUrl(q.customer_phone, "Hola"));
              return (
                <li key={q.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOpen((s) => ({ ...s, [q.id]: !s[q.id] }))}
                      className="rounded-lg p-1 hover:bg-muted"
                      aria-label="Ver detalle"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{q.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {q.customer_phone ? `${q.customer_phone} · ` : ""}
                        {q.customer_email} · {new Date(q.created_at).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {q.service_name || q.size_label || "—"}
                    </span>
                    <p className="font-bold">{formatCOP(Number(q.estimated_total_cop) || 0)}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        quoteStatusColors[q.status] ?? "bg-muted"
                      }`}
                    >
                      {q.status}
                    </span>
                    <select
                      value={q.status}
                      onChange={(e) => updateStatus(q.id, e.target.value)}
                      className="rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold"
                    >
                      {QUOTE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!hasValidPhone}
                      onClick={() => contactQuoteWhatsApp(q)}
                      title={
                        hasValidPhone
                          ? "Contactar al cliente por WhatsApp"
                          : "Sin número de celular válido registrado"
                      }
                      className="gap-1.5 rounded-full text-xs font-bold text-[var(--brand-teal-deep)]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      💬 Contactar por WhatsApp
                    </Button>
                    {q.file_path && (
                      <button
                        type="button"
                        onClick={() => download(q)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        Descargar archivo
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid gap-4 rounded-2xl bg-muted/40 p-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Configuración elegida
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                          {answers.length === 0 ? (
                            <li className="text-muted-foreground">
                              {q.size_label || q.design_state || "—"}
                            </li>
                          ) : (
                            answers.map((a, i) => (
                              <li key={`${a.label}-${i}`} className="flex justify-between gap-3">
                                <span className="text-muted-foreground">{a.label}</span>
                                <span className="font-semibold">{a.value}</span>
                              </li>
                            ))
                          )}
                          <li className="flex justify-between gap-3 border-t border-dashed border-border pt-1">
                            <span className="text-muted-foreground">Cantidad</span>
                            <span className="font-semibold">{q.quantity || 1}</span>
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Cliente y archivo
                        </p>
                        {q.customer_phone && (
                          <p>
                            <strong>WhatsApp:</strong> {q.customer_phone}
                          </p>
                        )}
                        {(q.material || q.finish) && (
                          <p>
                            <strong>Material / acabado:</strong> {q.material || "—"} ·{" "}
                            {q.finish || "—"}
                          </p>
                        )}
                        {(q.length_cm || q.width_cm || q.height_cm) && (
                          <p>
                            <strong>Medidas:</strong> {q.length_cm ?? "?"} × {q.width_cm ?? "?"} ×{" "}
                            {q.height_cm ?? "?"} cm
                          </p>
                        )}
                        <p>
                          <strong>Archivo:</strong> {q.file_name ? q.file_name : "sin adjunto"}
                        </p>
                        {q.notes && <p className="italic text-muted-foreground">Notas: {q.notes}</p>}
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
  const [templates, setTemplates] = useState<Record<string, string>>(DEFAULT_ORDER_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"todos" | Order["status"]>("todos");

  // Modal de WhatsApp personalizado al cliente
  const [waTarget, setWaTarget] = useState<Order | null>(null);
  const [waGuia, setWaGuia] = useState("");
  const [waMessage, setWaMessage] = useState("");

  // Modal de rechazo de comprobante (reemplaza window.prompt)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("No encontramos ese pago. Verifica la referencia.");

  const doConfirm = useServerFn(confirmPayment);
  const doReject = useServerFn(rejectPayment);
  const doUpdateStatus = useServerFn(updateOrderStatusAdmin);
  const loadTemplatesFn = useServerFn(getNotificationTemplatesForOrders);

  async function load() {
    setLoading(true);
    const [o, i, tpl] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("*"),
      loadTemplatesFn({}).catch(() => DEFAULT_ORDER_TEMPLATES),
    ]);
    setOrders((o.data as Order[]) ?? []);
    setItems((i.data as Item[]) ?? []);
    setTemplates(tpl ?? DEFAULT_ORDER_TEMPLATES);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: string, status: Order["status"]) {
    setUpdatingId(id);
    try {
      const res = await doUpdateStatus({ data: { order_id: id, status } });
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
      toast.success(
        res.whatsappDispatched
          ? `Estado cambiado a "${status}". Notificación enviada por WhatsApp y Telegram.`
          : `Estado cambiado a "${status}" y notificado en Telegram.`,
      );
    } catch (err) {
      toast.error((err as Error).message || "No se pudo actualizar el estado");
    } finally {
      setUpdatingId(null);
    }
  }

  async function onConfirmPayment(id: string) {
    try {
      await doConfirm({ data: { order_id: id } });
      toast.success("Pago confirmado y notificado por Telegram");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onSubmitReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTargetId) return;
    try {
      await doReject({ data: { order_id: rejectTargetId, note: rejectNote } });
      toast.success("Comprobante marcado como rechazado");
      setRejectTargetId(null);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function buildOrderWaPreview(order: Order, guiaValue: string) {
    const rawTpl =
      templates[order.status] ||
      DEFAULT_ORDER_TEMPLATES[order.status] ||
      "¡Hola {{nombre}}! Tu pedido {{pedido}} se encuentra en estado: {{estado}}.";
    return expandNotificationTemplate(rawTpl, {
      customerName: order.customer_name,
      orderId: order.id,
      status: order.status,
      totalCop: order.total_cop,
      guia: guiaValue,
      note: order.payment_note ?? "",
    });
  }

  function openWhatsAppModal(order: Order) {
    if (!order.customer_phone?.trim()) {
      toast.error("Este pedido no tiene número de celular registrado.");
      return;
    }
    setWaTarget(order);
    setWaGuia("");
    setWaMessage(buildOrderWaPreview(order, ""));
  }

  function handleGuiaChange(nextGuia: string) {
    setWaGuia(nextGuia);
    if (waTarget) {
      setWaMessage(buildOrderWaPreview(waTarget, nextGuia));
    }
  }

  const filtered = filter === "todos" ? orders : orders.filter((o) => o.status === filter);
  const waCustomerUrl = waTarget ? buildCustomerWhatsAppUrl(waTarget.customer_phone, waMessage) : null;

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
              const code = formatOrderCode(o.id);
              return (
                <li key={o.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOpen((s) => ({ ...s, [o.id]: !s[o.id] }))}
                      className="rounded-lg p-1 hover:bg-muted"
                      aria-label={`Ver detalle del pedido ${code}`}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                          {code}
                        </span>
                        <p className="truncate font-semibold">{o.customer_name}</p>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.customer_phone ? `${o.customer_phone} · ` : ""}
                        {o.customer_email} · {new Date(o.created_at).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <p className="font-bold">{formatCOP(o.total_cop)}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[o.status]}`}>
                      {o.status}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentColors[o.payment_status] ?? ""}`}
                    >
                      {paymentLabels[o.payment_status] ?? o.payment_status}
                    </span>
                    <select
                      value={o.status}
                      disabled={updatingId === o.id}
                      onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])}
                      aria-label={`Estado de ${code}`}
                      className="rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openWhatsAppModal(o)}
                      disabled={!o.customer_phone}
                      title={
                        o.customer_phone
                          ? "Enviar mensaje de WhatsApp al cliente"
                          : "Sin celular registrado"
                      }
                      className="gap-1.5 rounded-full text-xs font-bold text-[var(--brand-teal-deep)]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      💬 Enviar WhatsApp al cliente
                    </Button>
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
                      <div className="md:col-span-2 rounded-xl border border-border bg-background p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Pago
                        </p>
                        <p className="mt-1 text-sm">
                          Método: {o.payment_method_name ?? "sin definir"} ·{" "}
                          {paymentLabels[o.payment_status] ?? o.payment_status}
                        </p>
                        {o.payment_reference && (
                          <p className="text-sm">
                            Comprobante: <strong>{o.payment_reference}</strong>
                            {o.payment_reported_at
                              ? ` · reportado ${new Date(o.payment_reported_at).toLocaleString("es-CO")}`
                              : ""}
                          </p>
                        )}
                        {o.payment_note && (
                          <p className="text-sm italic text-muted-foreground">Nota: {o.payment_note}</p>
                        )}
                        {o.payment_status !== "pagado" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => onConfirmPayment(o.id)}
                              className="cursor-pointer rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              Confirmar pago
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectNote("No encontramos ese pago. Verifica la referencia.");
                                setRejectTargetId(o.id);
                              }}
                              className="cursor-pointer rounded-full border border-input px-4 py-1.5 text-xs font-bold hover:bg-muted"
                            >
                              Rechazar pago
                            </button>
                          </div>
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

      {/* Modal para enviar WhatsApp personalizado al cliente */}
      <Dialog open={Boolean(waTarget)} onOpenChange={(openNow) => !openNow && setWaTarget(null)}>
        <DialogContent className="max-w-lg rounded-3xl border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              Enviar WhatsApp a {waTarget?.customer_name}
            </DialogTitle>
            <DialogDescription>
              Pedido {waTarget ? formatOrderCode(waTarget.id) : ""} · Estado:{" "}
              <strong className="capitalize">{waTarget?.status}</strong> · Tel:{" "}
              <strong>{waTarget?.customer_phone}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wa-guia" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Número de guía / rastreo (opcional para {"{{guia}}"})
              </Label>
              <Input
                id="wa-guia"
                value={waGuia}
                onChange={(e) => handleGuiaChange(e.target.value)}
                placeholder="Ej: Servientrega 914520144"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wa-preview" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mensaje personalizado
              </Label>
              <Textarea
                id="wa-preview"
                rows={4}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setWaTarget(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!waCustomerUrl || !waMessage.trim()}
                onClick={() => {
                  if (!waCustomerUrl) {
                    toast.error("El celular del cliente no es válido para WhatsApp");
                    return;
                  }
                  openExternalUrl(waCustomerUrl);
                  setWaTarget(null);
                }}
                className="gap-2 bg-[var(--brand-teal-deep)] text-white hover:brightness-95"
              >
                <Send className="h-4 w-4" />
                Abrir WhatsApp del cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para rechazar comprobante con nota visible */}
      <Dialog open={Boolean(rejectTargetId)} onOpenChange={(o) => !o && setRejectTargetId(null)}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Rechazar comprobante</DialogTitle>
            <DialogDescription>
              Este mensaje se mostrará al cliente en la página de seguimiento de su pedido.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitReject} className="space-y-4">
            <Textarea
              rows={3}
              required
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectTargetId(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Confirmar rechazo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
