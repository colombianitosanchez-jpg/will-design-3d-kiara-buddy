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


  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setSending(true);
    try {
      const res = await submit({
        data: {
          items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
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
        payment_method_type: selectedMethod?.type ?? null,
        qr_image_url: selectedMethod?.qr_image_url ?? null,
      });
      toast.success("¡Pedido enviado! Te contactaremos muy pronto.");
    } catch (err) {
      toast.error((err as Error).message || "No pudimos enviar el pedido");
    } finally {
      setSending(false);
    }
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
        {done.payment_instructions && (
          <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-border bg-muted/40 p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cómo pagar {done.payment_method_name ? `con ${done.payment_method_name}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm">{done.payment_instructions}</p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
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
                <RadioGroup value={methodId} onValueChange={setMethodId} className="mt-2 space-y-2">
                  {methods.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-border p-3"
                    >
                      <RadioGroupItem value={m.id} id={`pm-${m.id}`} />
                      <Label htmlFor={`pm-${m.id}`} className="cursor-pointer text-sm font-semibold">
                        {m.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {selectedMethod?.type === "manual_transfer" && selectedMethod.instructions && (
                  <p className="mt-2 whitespace-pre-line rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                    {selectedMethod.instructions}
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
