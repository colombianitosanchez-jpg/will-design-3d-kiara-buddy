import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileText, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/catalog";
import { getSavedQuote } from "@/lib/saved-quotes.functions";

export const Route = createFileRoute("/cotizacion/$id")({
  loader: ({ params }) => getSavedQuote({ data: { id: params.id } }),
  head: () => ({
    meta: [
      { title: "Cotización | Will Design 3D" },
      {
        name: "description",
        content:
          "Revisa la cotización de impresión 3D preparada por Will Design 3D y añádela a tu carrito para pagar.",
      },
      { property: "og:title", content: "Cotización | Will Design 3D" },
      {
        property: "og:description",
        content: "Cotización de impresión 3D lista para revisar y pagar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => <QuoteMessage title="No pudimos abrir esta cotización" />,
  notFoundComponent: () => <QuoteMessage title="Esta cotización no existe" />,
  component: QuotePage,
});

function QuoteMessage({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Puede que el enlace haya cambiado. Arma una nueva cotización en segundos.
      </p>
      <Link to="/cotizador" className="btn-primary mt-6 inline-flex text-sm">
        Ir al cotizador
      </Link>
    </section>
  );
}

function QuotePage() {
  const quote = Route.useLoaderData();
  const { items: cartItems, addItem, clear } = useCart();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!quote) return <QuoteMessage title="Esta cotización no existe" />;

  function appendQuoteItems() {
    for (const i of quote!.items) {
      addItem(
        {
          product_id: i.product_id,
          slug: i.slug ?? "",
          name: i.name,
          price_cop: i.price_cop,
          image_url: i.image_url ?? null,
          kind: i.kind,
          ...(i.service_slug ? { service_slug: i.service_slug } : {}),
          ...(i.answers ? { answers: i.answers } : {}),
          ...(i.detail ? { detail: i.detail } : {}),
        },
        i.quantity,
      );
    }
    void navigate({ to: "/carrito" });
  }

  function addAll() {
    if (cartItems.length > 0) {
      setConfirmOpen(true);
      return;
    }
    appendQuoteItems();
  }

  function handleMergeCart() {
    setConfirmOpen(false);
    appendQuoteItems();
  }

  function handleReplaceCart() {
    setConfirmOpen(false);
    clear();
    appendQuoteItems();
  }

  const date = new Date(quote.created_at).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand-wine)]">
              <FileText className="h-4 w-4" /> Cotización
            </p>
            <h1 className="mt-1 text-3xl font-black">Will Design 3D</h1>
            <p className="text-xs text-muted-foreground">
              Impresión 3D en Bogotá · {date}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            N.º {quote.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <ul className="divide-y divide-border">
          {quote.items.map((i, idx) => (
            <li key={`${i.product_id}-${idx}`} className="flex flex-wrap items-start gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{i.name}</p>
                {i.detail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatCOP(i.price_cop)} c/u × {i.quantity}
                </p>
              </div>
              <span className="text-sm font-black text-[var(--brand-wine)]">
                {formatCOP(i.price_cop * i.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-border pt-5">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Total estimado
          </span>
          <span className="text-2xl font-black">{formatCOP(quote.total_price)}</span>
        </div>

        <Button type="button" className="mt-6 w-full" onClick={addAll}>
          Añadir todo a mi carrito y Pagar
        </Button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Los valores son estimados y se confirman al revisar los archivos o la idea final.
        </p>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Ya tienes productos en tu carrito
            </DialogTitle>
            <DialogDescription>
              Actualmente tienes {cartItems.length}{" "}
              {cartItems.length === 1 ? "ítem guardado" : "ítems guardados"} en tu carrito. ¿Qué deseas hacer con esta cotización?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleReplaceCart}>
              Reemplazar carrito
            </Button>
            <Button type="button" onClick={handleMergeCart}>
              Sumar a mi carrito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
