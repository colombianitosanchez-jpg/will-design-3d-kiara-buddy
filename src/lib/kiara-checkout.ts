import { z } from "zod";
import { normalizeWhatsAppDigits } from "./notification-templates";
import { assertServiceOrderQuantity } from "./cart-quantity";
import { coerceAnswersDetailed, computeQuote, quoteAnswerErrors, type QuoterService, type QuoterVars } from "./quoter-core";

export const kiaraCustomerSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).refine((v) => Boolean(normalizeWhatsAppDigits(v)), "Ingresa un WhatsApp válido"),
  shipping_address: z.string().trim().min(4).max(300),
  shipping_city: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

/** Same rules and global prices as web checkout; never expose internal costs to chat. */
export function computeKiaraQuote(service: QuoterService, answers: Record<string, unknown>, quantity: number, vars: QuoterVars) {
  if (!service.is_active || service.has_calculator === false) throw new Error("El cotizador ya no está disponible");
  assertServiceOrderQuantity(service, quantity);
  const { values, missingRequired } = coerceAnswersDetailed(service, answers);
  if (missingRequired.length) throw new Error(`Faltan datos para cotizar ${service.name}: ${missingRequired.map((f) => f.label).join(", ")}`);
  const errors = quoteAnswerErrors(service, values);
  if (errors.length) throw new Error(errors[0]);
  const quote = computeQuote(service, values, quantity, vars);
  if (!Number.isFinite(quote.total_cop) || quote.total_cop <= 0) throw new Error("El servicio necesita una tarifa configurada");
  return { ...quote, lines: [], multiplier: 1, subtotal_cop: 0, margin_cop: 0 };
}

export function assertKiaraQuotePurchasable(quote: { requires_approval: boolean }) {
  if (quote.requires_approval) throw new Error("Este servicio requiere revisión previa. Solicita su cotización por WhatsApp.");
}