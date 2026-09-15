import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCOP } from "@/lib/catalog";
import { getOrderByToken, reportPayment, type TrackedOrder } from "@/lib/order-tracking.functions";

export const Route = createFileRoute("/pedido/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seguimiento de tu pedido | Will Design 3D" },
      {
        name: "description",
        content: "Consulta el estado de tu pedido y reporta tu pago con Will Design 3D.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Seguimiento de tu pedido | Will Design 3D" },
      { property: "og:description", content: "Estado de tu pedido y reporte de pago." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeguimientoPage,
});

const PAYMENT_LABELS: Record<TrackedOrder["payment_status"], string> = {
  esperando_pago: "Esperando tu pago",
  comprobante_enviado: "Comprobante enviado · en revisión",
  pagado: "Pago confirmado",
  rechazado: "No pudimos verificar el pago",
};

function SeguimientoPage() {
  const { token } = Route.useParams();
  const fetchOrder = useServerFn(getOrderByToken);
  const report = useServerFn(reportPayment);

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [reference, setReference] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrder({ data: { token } }));
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [fetchOrder, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await report({ data: { token, payment_reference: reference } });
      toast.success("¡Gracias! Estamos verificando tu pago.");
      setReference("");
      await load();
    } catch (err) {
      toast.error((err as Error).message || "No pudimos registrar tu pago");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-20 text-sm text-muted-foreground sm:px-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando tu pedido…
      </section>
    );
  }

  if (!order) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-black">No encontramos ese pedido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisa el enlace que te enviamos o escríbenos y lo buscamos por ti.
        </p>
        <Link to="/tienda" className="btn-primary mt-8 inline-flex text-sm">
          Ir a la tienda
        </Link>
      </section>
    );
  }

  const paid = order.payment_status === "pagado";
  const pending = order.payment_status === "esperando_pago" || order.payment_status === "rechazado";

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Pedido {order.reference}
      </p>
      <h1 className="mt-1 text-3xl font-black">Hola {order.customer_name.split(" ")[0]} 🐾</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estado del pago
          </p>
          <p className="mt-2 flex items-center gap-2 text-lg font-black">
            {paid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : order.payment_status === "rechazado" ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-600" />
            )}
            {PAYMENT_LABELS[order.payment_status]}
          </p>
          {order.payment_method_name && (
            <p className="mt-1 text-xs text-muted-foreground">
              Método: {order.payment_method_name}
            </p>
          )}
          {order.payment_note && (
            <p className="mt-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">{order.payment_note}</p>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estado del envío
          </p>
          <p className="mt-2 text-lg font-black capitalize">{order.status}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Total: <strong>{formatCOP(order.total_cop)}</strong>
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tu pedido
        </p>
        <ul className="mt-2 divide-y divide-border text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>
                {it.quantity} × {it.product_name}
              </span>
              <span className="font-semibold">{formatCOP(it.unit_price_cop * it.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>

      {order.payment_instructions && !paid && (
        <div className="mt-6 rounded-3xl border border-border bg-muted/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cómo pagar
          </p>
          <p className="mt-2 whitespace-pre-line text-sm">{order.payment_instructions}</p>
        </div>
      )}

      {pending && (
        <form onSubmit={send} className="mt-6 rounded-3xl border border-border bg-card p-5">
          <h2 className="text-lg font-black">
            {order.payment_status === "rechazado" ? "Reportar el pago de nuevo" : "Ya pagué"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.payment_status === "rechazado"
              ? "Revisa el mensaje de arriba y envíanos otra vez el número de comprobante o referencia correcta. Lo verificamos de nuevo."
              : "Escribe el número de comprobante o referencia de la transacción para que verifiquemos tu pago."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. M1234567 · 15/09 3:40 pm"
              className="min-w-[220px] flex-1"
            />
            <Button type="submit" disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reportar pago
            </Button>
          </div>
        </form>
      )}

      {order.payment_status === "comprobante_enviado" && (
        <p className="mt-6 rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Recibimos tu comprobante <strong>{order.payment_reference}</strong>. Lo verificamos y te
          avisamos en cuanto empecemos a preparar tu pedido.
        </p>
      )}
    </section>
  );
}
