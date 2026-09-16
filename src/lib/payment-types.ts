import { Banknote, Coins, CreditCard, Truck, Wallet, type LucideIcon } from "lucide-react";
import type { PaymentMethodType } from "@/lib/payment-methods.functions";

export type PaymentGroup = "wallet" | "card" | "cash" | "crypto";

type TypeMeta = {
  label: string;
  group: PaymentGroup;
};

const TYPE_META: Record<PaymentMethodType, TypeMeta> = {
  manual_transfer: { label: "Transferencia Manual / QR", group: "wallet" },
  gateway: { label: "Redirección a Pasarela (PSE/Tarjetas)", group: "card" },
  gateway_redirect: { label: "Redirección a Pasarela (PSE/Tarjetas)", group: "card" },
  cash_on_delivery: { label: "Pago Contra Entrega", group: "cash" },
  cash_point: { label: "Punto de Efectivo (Efecty, etc)", group: "cash" },
  crypto: { label: "Criptomonedas", group: "crypto" },
};

/** Opciones visibles en el selector del panel (el tipo antiguo `gateway` no se ofrece de nuevo). */
export const PAYMENT_TYPE_OPTIONS: { value: PaymentMethodType; label: string }[] = [
  { value: "manual_transfer", label: TYPE_META.manual_transfer.label },
  { value: "gateway_redirect", label: TYPE_META.gateway_redirect.label },
  { value: "cash_on_delivery", label: TYPE_META.cash_on_delivery.label },
  { value: "cash_point", label: TYPE_META.cash_point.label },
  { value: "crypto", label: TYPE_META.crypto.label },
];

export function paymentTypeLabel(type: string | null | undefined): string {
  return TYPE_META[type as PaymentMethodType]?.label ?? "Método de pago";
}

export function paymentGroup(type: string | null | undefined): PaymentGroup {
  return TYPE_META[type as PaymentMethodType]?.group ?? "wallet";
}

export const PAYMENT_GROUPS: { group: PaymentGroup; label: string; icon: LucideIcon }[] = [
  { group: "wallet", label: "Transferencias y billeteras", icon: Wallet },
  { group: "card", label: "Tarjetas y pasarelas", icon: CreditCard },
  { group: "cash", label: "Efectivo", icon: Banknote },
  { group: "crypto", label: "Criptomonedas", icon: Coins },
];

export const CASH_ON_DELIVERY_ICON = Truck;

/** Flujos que terminan en la pantalla de agradecimiento + comprobante por WhatsApp. */
export function isManualFlow(type: string | null | undefined): boolean {
  return type === "manual_transfer" || type === "cash_point" || type === "cash_on_delivery";
}

/** Flujos que redirigen al enlace externo de pago. */
export function isRedirectFlow(type: string | null | undefined): boolean {
  return type === "gateway" || type === "gateway_redirect" || type === "crypto";
}

/** Los tipos que usan código QR e instrucciones de pago manuales. */
export function usesQr(type: string | null | undefined): boolean {
  return type === "manual_transfer" || type === "cash_point";
}
