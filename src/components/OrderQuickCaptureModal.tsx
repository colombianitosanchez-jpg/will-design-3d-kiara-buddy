import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
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
import { formatCOP, waLink, type Product } from "@/lib/catalog";
import { createOrderRequest } from "@/lib/orders.functions";
import {
  buildQuickOrderWhatsappMessage,
  normalizeWhatsAppDigits,
} from "@/lib/notification-templates";
import type { ServiceQuickContext } from "@/lib/product-buttons";
import { openExternalUrl } from "@/lib/whatsapp";

export interface OrderQuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  service?: ServiceQuickContext;
  variantId?: string | null;
  variantName?: string | null;
  whatsappNumber: string;
  shareUrl?: string | null;
  customNote?: string | null;
}

export function OrderQuickCaptureModal({
  open,
  onOpenChange,
  product,
  service,
  variantId,
  variantName,
  whatsappNumber,
  shareUrl,
  customNote,
}: OrderQuickCaptureModalProps) {
  const submitOrder = useServerFn(createOrderRequest);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressOrCity, setAddressOrCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    orderCode: string;
    totalCop: number;
    whatsappUrl: string;
  } | null>(null);

  if (!product && !service) return null;
  const itemTitle = product?.name ?? service?.title ?? "Solicitud Will Design 3D";
  const resolvedNote = [customNote?.trim(), service?.whatsappTemplate?.trim()]
    .filter(Boolean)
    .join(" — ");

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null);
      setConfirmed(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (customerName.trim().length < 2) {
      setError("Por favor ingresa tu nombre completo.");
      return;
    }
    if (!normalizeWhatsAppDigits(customerPhone)) {
      setError("Ingresa un número de celular WhatsApp válido (mínimo 7 dígitos).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitOrder({
        data: {
          ...(product ? { product_id: product.id, variant_id: variantId || "" } : {}),
          ...(service ? { service_id: service.id, service_slug: service.slug } : {}),
          quantity: 1,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          shipping_address: addressOrCity.trim(),
          shipping_city: addressOrCity.trim(),
          notes: resolvedNote || service?.note?.trim() || "",
          quick_capture: true,
        },
      });

      const message = buildQuickOrderWhatsappMessage({
        orderCode: res.order_code,
        totalCop: res.total_cop,
        productName: itemTitle,
        variantName,
        customerName: customerName.trim(),
        shippingCity: addressOrCity.trim(),
        shareUrl,
        customNote: resolvedNote || service?.note || undefined,
      });

      const url = waLink(whatsappNumber, message);
      if (!url) {
        toast.error("Configura el WhatsApp de la marca en /panel/marca");
        setSubmitting(false);
        return;
      }

      setConfirmed({
        orderCode: res.order_code,
        totalCop: res.total_cop,
        whatsappUrl: url,
      });
      toast.success(`Pedido ${res.order_code} registrado. Redirigiendo a WhatsApp…`);
      openExternalUrl(url);
    } catch (err) {
      setError((err as Error).message || "No pudimos registrar tu pedido. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">
            {service ? "Solicitar servicio por WhatsApp" : "Finalizar pedido por WhatsApp"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {itemTitle}
            {variantName ? ` — ${variantName}` : ""} ·{" "}
            {product ? (
              <strong className="text-[var(--brand-wine)]">{formatCOP(product.price_cop)}</strong>
            ) : (
              <strong className="text-[var(--brand-teal-deep)]">Cotización personalizada</strong>
            )}
          </DialogDescription>
        </DialogHeader>

        {confirmed ? (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-11 w-11 text-[var(--brand-teal-deep)]" />
            <div>
              <p className="text-base font-black">
                ¡Pedido {confirmed.orderCode} registrado!
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {confirmed.totalCop > 0 ? (
                  <>
                    Total: <strong>{formatCOP(confirmed.totalCop)}</strong>.{" "}
                  </>
                ) : null}
                Si WhatsApp no se abrió automáticamente, presiona el botón de abajo.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={confirmed.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (typeof window !== "undefined" && window.self !== window.top) {
                    e.preventDefault();
                    openExternalUrl(confirmed.whatsappUrl);
                  }
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--brand-teal-deep)] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp con mi pedido {confirmed.orderCode}
              </a>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="rounded-full"
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quick-order-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nombre Completo *
              </Label>
              <Input
                id="quick-order-name"
                required
                minLength={2}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Laura Martínez"
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-order-phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Celular (WhatsApp) *
              </Label>
              <Input
                id="quick-order-phone"
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ej: 300 123 4567"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-order-city" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dirección / Ciudad (opcional)
              </Label>
              <Input
                id="quick-order-city"
                value={addressOrCity}
                onChange={(e) => setAddressOrCity(e.target.value)}
                placeholder="Ej: Bogotá · Chapinero, Calle 53 # 10-20"
                autoComplete="street-address"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--brand-teal-deep)]" />
              <span>
                Registramos tu código de pedido para hacer seguimiento y confirmar tu envío por WhatsApp.
              </span>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2 rounded-full bg-[var(--brand-wine)] text-white hover:brightness-95"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Registrar y abrir WhatsApp
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
