import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";
import { formatCOP, getContactInfo, waLink } from "@/lib/catalog";
import { useSiteContent } from "@/hooks/use-site-content";
import { createCartOrder } from "@/lib/cart-order.functions";
import {
  listPublicPaymentMethods,
  type PublicPaymentMethod,
} from "@/lib/payment-methods.functions";
import {
  PAYMENT_GROUPS,
  isManualFlow,
  isRedirectFlow,
  paymentGroup,
  usesQr,
} from "@/lib/payment-types";

export const Route = createFileRoute("/carrito")({
  ssr: false,
  component: CarritoPage,
  head: () => ({
    meta: [
      { title: "Carrito de compras | Will Design 3D" },
      {
        name: "description",
        content:
          "Revisa los productos de impresión 3D que elegiste y confirma tu pedido con Will Design 3D en Bogotá.",
      },
      { property: "og:title", content: "Carrito de compras | Will Design 3D" },
      {
        property: "og:description",
        content: "Revisa tus productos y confirma tu pedido con Will Design 3D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function CarritoPage() {
  const { items, total, count, setQuantity, removeItem, clear } = useCart();
  const submit = useServerFn(createCartOrder);
  const loadMethods = useServerFn(listPublicPaymentMethods);
  const [sending, setSending] = useState(false);
  const [methods, setMethods] = useState<PublicPaymentMethod[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  const [done, setDone] = useState<{
    order_id: string;
    public_token: string;
    payment_instructions: string;
    payment_method_name: string | null;
    payment_method_type: string | null;
    qr_image_url: string | null;
    payment_url: string | null;
    allowed_zones: string | null;
  } | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    shipping_city: "",
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    let alive = true;
    void loadMethods({})
      .then((list) => {
        if (!alive) return;
        setMethods(list);
        if (list.length) setMethodId((prev) => prev || list[0]!.id);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [loadMethods]);

  const selectedMethod = methods.find((m) => m.id === methodId) ?? null;
  const { content } = useSiteContent();
  const whatsapp = getContactInfo(content).whatsapp;

  function receiptWaUrl(reference: string, type: string | null) {
    const text =
      type === "cash_on_delivery"
        ? `Hola, acabo de realizar el pedido #${reference}. El método es Pago Contra Entrega.`
        : `Hola, acabo de realizar el pedido #${reference} en Will Design 3D. Adjunto el comprobante de pago.`;
    return waLink(whatsapp, text);
  }

  // Para pasarelas y cripto: al confirmar, el navegador sale al enlace de pago externo.
  useEffect(() => {
    if (done && isRedirectFlow(done.payment_method_type) && done.payment_url) {
      const url = done.payment_url;
      const t = window.setTimeout(() => window.location.assign(url), 1200);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [done]);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setSending(true);
    try {
      const res = await submit({
        data: {
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            kind: i.kind ?? "product",
            ...(i.service_slug ? { service_slug: i.service_slug } : {}),
            ...(i.answers ? { answers: i.answers } : {}),
          })),
          ...form,
          payment_method_id: methodId || null,
        },
      });
      clear();
      setDone({
        order_id: res.order_id,
        public_token: res.public_token,
        payment_instructions: res.payment_instructions,
        payment_method_name: res.payment_method_name,
        payment_method_type: res.payment_method_type ?? selectedMethod?.type ?? null,
        qr_image_url: selectedMethod?.qr_image_url ?? null,
        payment_url: res.payment_url ?? null,
        allowed_zones: res.allowed_zones ?? null,
      });
      toast.success("¡Pedido enviado! Te contactaremos muy pronto.");
    } catch (err) {
      toast.error((err as Error).message || "No pudimos enviar el pedido");
    } finally {
      setSending(false);
    }
  }

  if (done && isRedirectFlow(done.payment_method_type) && done.payment_url) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-black">Te llevamos a pagar…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu pedido {done.order_id.slice(0, 8).toUpperCase()} quedó registrado. Estamos abriendo{" "}
          {done.payment_method_name ?? "la plataforma de pago"} para completar el pago.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={done.payment_url} className="btn-primary inline-flex text-sm">
            Abrir la página de pago
          </a>
          <Link
            to="/pedido/$token"
            params={{ token: done.public_token }}
            className="text-sm font-semibold underline"
          >
            Ver mi pedido
          </Link>
        </div>
      </section>
    );
  }

  if (done) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-black">¡Gracias por tu pedido! 🐾</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Registramos tu solicitud. Sigue tu pedido y repórtanos el pago desde tu enlace privado.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Referencia: {done.order_id.slice(0, 8).toUpperCase()}
        </p>
        {done.payment_method_type === "cash_on_delivery" && (
          <p className="mx-auto mt-4 max-w-xl rounded-2xl bg-muted/50 p-3 text-sm">
            Pagas al recibir tu pedido.
            {done.allowed_zones ? ` Cobertura: ${done.allowed_zones}.` : ""}
          </p>
        )}
        {done.payment_instructions && (
          <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-border bg-muted/40 p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cómo pagar {done.payment_method_name ? `con ${done.payment_method_name}` : ""}
            </p>
            {done.qr_image_url && (
              <img
                src={done.qr_image_url}
                alt={`Código QR para pagar con ${done.payment_method_name ?? "transferencia"}`}
                className="mx-auto mt-3 w-full max-w-[250px] rounded-xl border border-border object-contain shadow-sm"
              />
            )}
            <p className="mt-2 whitespace-pre-line text-sm">{done.payment_instructions}</p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isManualFlow(done.payment_method_type) && (
            <a
              href={receiptWaUrl(
                done.order_id.slice(0, 8).toUpperCase(),
                done.payment_method_type,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow transition hover:brightness-95"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Enviar comprobante por WhatsApp
            </a>
          )}
          <Link
            to="/pedido/$token"
            params={{ token: done.public_token }}
            className="btn-primary inline-flex text-sm"
          >
            Ver mi pedido y reportar el pago
          </Link>
          <Link to="/tienda" className="text-sm font-semibold underline">
            Seguir viendo productos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-black sm:text-4xl">Tu carrito</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {count === 0 ? "Todavía no has añadido productos." : `${count} artículo${count === 1 ? "" : "s"} listo${count === 1 ? "" : "s"} para pedir.`}
      </p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-border bg-card p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Explora la tienda y añade lo que necesites.
          </p>
          <Link to="/tienda" className="btn-primary mt-6 inline-flex text-sm">
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
            <ul className="divide-y divide-border">
              {items.map((i) => (
                <li key={i.product_id} className="flex flex-wrap items-center gap-4 py-4">
                  {i.image_url ? (
                    <img src={i.image_url} alt={i.name} className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCOP(i.price_cop)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Quitar una unidad"
                      onClick={() => setQuantity(i.product_id, i.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-9 text-center text-sm font-bold">{i.quantity}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Añadir una unidad"
                      onClick={() => setQuantity(i.product_id, i.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="w-28 text-right text-sm font-black text-[var(--brand-wine)]">
                    {formatCOP(i.price_cop * i.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(i.product_id)}
                    aria-label={`Quitar ${i.name}`}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={clear}
                className="text-xs font-semibold text-muted-foreground hover:underline"
              >
                Vaciar carrito
              </button>
              <p className="text-lg font-black">
                Total: <span className="text-[var(--brand-wine)]">{formatCOP(total)}</span>
              </p>
            </div>
          </div>

          <form onSubmit={confirm} className="rounded-3xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-lg font-black">Datos para el pedido</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmamos disponibilidad, pago y envío por WhatsApp o correo.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nombre completo *
              <input required value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} className={inputCls} />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Correo *
              <input required type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} className={inputCls} />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              WhatsApp / teléfono
              <input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} className={inputCls} placeholder="+57 300 000 0000" />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dirección de envío *
              <input required value={form.shipping_address} onChange={(e) => set("shipping_address", e.target.value)} className={inputCls} />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ciudad
              <input value={form.shipping_city} onChange={(e) => set("shipping_city", e.target.value)} className={inputCls} />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notas
              <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
            </label>

            {methods.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ¿Cómo quieres pagar?
                </p>
                <RadioGroup value={methodId} onValueChange={setMethodId} className="mt-2 space-y-4">
                  {PAYMENT_GROUPS.filter((g) =>
                    methods.some((m) => paymentGroup(m.type) === g.group),
                  ).map((g) => (
                    <div key={g.group} className="space-y-2">
                      <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <g.icon className="h-4 w-4" aria-hidden="true" />
                        {g.label}
                      </p>
                      {methods
                        .filter((m) => paymentGroup(m.type) === g.group)
                        .map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-xl border border-border p-3"
                          >
                            <RadioGroupItem value={m.id} id={`pm-${m.id}`} />
                            <Label
                              htmlFor={`pm-${m.id}`}
                              className="cursor-pointer text-sm font-semibold"
                            >
                              {m.name}
                            </Label>
                          </div>
                        ))}
                    </div>
                  ))}
                </RadioGroup>
                {usesQr(selectedMethod?.type) && selectedMethod?.qr_image_url && (
                  <img
                    src={selectedMethod.qr_image_url}
                    alt={`Código QR para pagar con ${selectedMethod.name}`}
                    className="mx-auto mt-3 w-full max-w-[250px] rounded-xl border border-border object-contain shadow-sm"
                  />
                )}
                {selectedMethod?.instructions && (
                  <p className="mt-2 whitespace-pre-line rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                    {selectedMethod.instructions}
                  </p>
                )}
                {selectedMethod?.type === "cash_on_delivery" && (
                  <p className="mt-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                    Pagas al recibir tu pedido.
                    {selectedMethod.config?.allowed_zones
                      ? ` Cobertura: ${selectedMethod.config.allowed_zones}.`
                      : ""}
                  </p>
                )}
                {isRedirectFlow(selectedMethod?.type) && (
                  <p className="mt-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                    Al confirmar el pedido te llevaremos a {selectedMethod?.name} para completar el
                    pago de forma segura.
                  </p>
                )}
              </div>
            )}
            <Button type="submit" disabled={sending} className="mt-5 w-full">
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                `Confirmar pedido · ${formatCOP(total)}`
              )}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
