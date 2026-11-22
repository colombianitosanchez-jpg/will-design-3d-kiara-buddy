import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCOP, getContactInfo, siteContentQuery } from "@/lib/catalog";
import { buildCartSuccessWhatsappMessage, buildWhatsAppApiUrl, formatOrderCode } from "@/lib/notification-templates";
import { getCanonicalBaseUrl, getSeo } from "@/lib/seo";
import { toAbsoluteUrl } from "@/lib/whatsapp-buttons";
import { openExternalUrl } from "@/lib/whatsapp";
import { useSiteContent } from "@/hooks/use-site-content";
import { getOrderByToken, reportPayment, type TrackedOrder } from "@/lib/order-tracking.functions";
import { isManualFlow, isRedirectFlow } from "@/lib/payment-types";

export const Route = createFileRoute("/pedido/$token")({
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.ensureQueryData(siteContentQuery()).catch(() => null);
    return { siteContent };
  },
  head: ({ params, loaderData }) => {
    const siteContent = loaderData?.siteContent;
    const seo = getSeo(null, siteContent);
    const ogImage = seo.image ? toAbsoluteUrl(seo.image, siteContent) : "";
    const businessName = siteContent?.site_business_name?.trim() || "Will Design 3D";
    const title = `Seguimiento de tu pedido | ${businessName}`;
    const desc = `Consulta el estado de tu pedido y reporta tu pago con ${businessName}.`;
    const url = params?.token ? `${getCanonicalBaseUrl(siteContent)}/pedido/${params.token}` : "";

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        ...(url ? [{ property: "og:url", content: url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        ...(ogImage
          ? [
              { property: "og:image", content: ogImage },
              { property: "og:image:secure_url", content: ogImage },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { name: "twitter:image", content: ogImage },
            ]
          : []),
      ],
    };
  },
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
  const { content } = useSiteContent();

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
          {order.qr_image_url && (
            <img
              src={order.qr_image_url}
              alt={`Código QR para pagar con ${order.payment_method_name ?? "transferencia"}`}
              className="mx-auto mt-3 w-full max-w-[250px] rounded-xl border border-border object-contain shadow-sm"
            />
          )}
          <p className="mt-2 whitespace-pre-line text-sm">{order.payment_instructions}</p>
        </div>
      )}

      {order.allowed_zones && order.payment_method_type === "cash_on_delivery" && (
        <p className="mt-6 rounded-3xl border border-border bg-card p-5 text-sm">
          Pago contra entrega · Cobertura: {order.allowed_zones}
        </p>
      )}

      {isRedirectFlow(order.payment_method_type) && order.payment_url && !paid && (
        <a
          href={order.payment_url}
          className="btn-primary mt-6 flex items-center justify-center text-sm"
        >
          Ir a pagar en {order.payment_method_name ?? "la plataforma de pago"}
        </a>
      )}

      {isRedirectFlow(order.payment_method_type) && !order.payment_url && !paid && (() => {
        const showPrepNotice =
          order.payment_method_type !== "crypto" || !order.payment_instructions;
        const trackingUrl = `${getCanonicalBaseUrl(content)}/pedido/${token}`;
        const u =
          buildWhatsAppApiUrl(
            getContactInfo(content).whatsapp,
            buildCartSuccessWhatsappMessage({
              orderCode: formatOrderCode(order.reference),
              totalCop: order.total_cop,
              customerName: order.customer_name,
              paymentMethodName: order.payment_method_name,
              items: order.items.map((it) => ({
                name: it.product_name,
                quantity: it.quantity,
                unitPriceCop: it.unit_price_cop,
              })),
              trackingUrl,
              customNote: "Quiero coordinar mi pago por WhatsApp.",
            }),
          ) || "";
        return (
          <div className="mt-6 space-y-3">
            {showPrepNotice && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
                El link de pago automático está en preparación. Puedes coordinar tu pago por
                WhatsApp con nuestro asesor.
              </div>
            )}
            <a
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  e.preventDefault();
                  openExternalUrl(u);
                }
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow transition hover:brightness-95"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Coordinar pago por WhatsApp
            </a>
          </div>
        );
      })()}

      {isManualFlow(order.payment_method_type) && !paid && (() => {
        const trackingUrl = `${getCanonicalBaseUrl(content)}/pedido/${token}`;
        const u =
          buildWhatsAppApiUrl(
            getContactInfo(content).whatsapp,
            buildCartSuccessWhatsappMessage({
              orderCode: formatOrderCode(order.reference),
              totalCop: order.total_cop,
              customerName: order.customer_name,
              paymentMethodName: order.payment_method_name,
              items: order.items.map((it) => ({
                name: it.product_name,
                quantity: it.quantity,
                unitPriceCop: it.unit_price_cop,
              })),
              trackingUrl,
              customNote:
                order.payment_method_type === "cash_on_delivery"
                  ? "Pago Contra Entrega."
                  : "Adjunto mi comprobante de pago.",
            }),
          ) || "";
        return (
          <a
            href={u}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (typeof window !== "undefined" && window.self !== window.top) {
                e.preventDefault();
                openExternalUrl(u);
              }
            }}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow transition hover:brightness-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
            Enviar comprobante por WhatsApp
          </a>
        );
      })()}

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
