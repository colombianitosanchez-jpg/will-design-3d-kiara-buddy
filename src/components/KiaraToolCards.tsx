import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Receipt } from "lucide-react";
import type { KiaraOrderData, KiaraQuoteData } from "@/lib/kiara-chat";
import { confirmQuoteOrder } from "@/lib/kiara-orders.functions";

const cop = (n: number) =>
  (Number(n) || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

/** Tarjeta interactiva de cotización generada por Kiara, con paso a pedido. */
export function KiaraQuoteCard({ quote }: { quote: KiaraQuoteData }) {
  const confirm = useServerFn(confirmQuoteOrder);
  const [openForm, setOpenForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    shipping_city: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await confirm({
        data: {
          ...form,
          notes: `${quote.project_name} · ${quote.material} · acabado ${quote.finish} · ${quote.grams} g · ${quote.hours} h`,
          item_name: `${quote.project_name} (${quote.material})`,
          quantity: quote.quantity,
          unit_price_cop: Math.round(quote.unit_price_cop),
        },
      });
      setOrderId(res.order_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, number][] = [
    ["Material", quote.material_cost_cop],
    ["Tiempo de máquina", quote.machine_cost_cop],
    ["Preparación", quote.setup_fee_cop],
    ["Margen", quote.margin_cop],
  ];

  return (
    <div className="mt-2 w-full rounded-2xl border border-border bg-background p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-[var(--brand-orange)]" />
        <p className="text-sm font-bold">{quote.project_name}</p>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {quote.material} · acabado {quote.finish} · {quote.grams} g · {quote.hours} h ·{" "}
        {quote.quantity} u
      </p>

      <div className="mt-2 space-y-1 border-t border-dashed border-border pt-2 text-[11px]">
        {rows.map(([label, val]) => (
          <div key={label} className="flex justify-between text-muted-foreground">
            <span>{label}</span>
            <span>{cop(val)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-1 text-sm font-black text-foreground">
          <span>Total estimado</span>
          <span>{cop(quote.total_cop)}</span>
        </div>
      </div>

      {orderId ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-teal-deep)]">
          <CheckCircle2 className="h-4 w-4" /> ¡Pedido creado! Te contactamos pronto.
        </p>
      ) : openForm ? (
        <form onSubmit={submit} className="mt-3 space-y-2">
          {(
            [
              ["customer_name", "Nombre completo", "text", true],
              ["customer_email", "Correo", "email", true],
              ["customer_phone", "WhatsApp", "tel", false],
              ["shipping_address", "Dirección de envío", "text", true],
              ["shipping_city", "Ciudad", "text", false],
            ] as const
          ).map(([key, label, type, req]) => (
            <input
              key={key}
              type={type}
              required={req}
              placeholder={label}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          ))}
          {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-wine)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enviar pedido
          </button>
        </form>
      ) : (
        <button
          onClick={() => setOpenForm(true)}
          className="mt-3 w-full rounded-full bg-[var(--brand-orange)] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          Confirmar pedido
        </button>
      )}
    </div>
  );
}

/** Confirmación de pedido creado directamente por Kiara. */
export function KiaraOrderCard({ order }: { order: KiaraOrderData }) {
  return (
    <div className="mt-2 w-full rounded-2xl border border-[var(--brand-teal)] bg-background p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--brand-teal-deep)]">
        <CheckCircle2 className="h-4 w-4" /> Pedido registrado
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
        {order.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span>
              {it.quantity}× {it.product_name}
            </span>
            <span>{cop(it.unit_price_cop * it.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex justify-between border-t border-border pt-1 text-sm font-black">
        <span>Total</span>
        <span>{cop(order.total_cop)}</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Referencia: {order.order_id.slice(0, 8).toUpperCase()}
      </p>
    </div>
  );
}
