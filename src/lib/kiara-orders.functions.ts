import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertServiceOrderQuantity } from "./cart-quantity";
import { formatOrderCode } from "./notification-templates";

const schema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().default(""),
  shipping_address: z.string().trim().min(4).max(300),
  shipping_city: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  service_slug: z.string().trim().min(1).max(160),
  answers: z
    .array(z.object({ label: z.string().trim().max(160), value: z.string().trim().max(300) }))
    .max(60)
    .optional()
    .default([]),
  quantity: z.number().int().min(1).max(999),
});

/**
 * Convierte una cotización de Kiara en un pedido pendiente del Panel → Pedidos.
 * El precio NUNCA se acepta del cliente: se recalcula en el servidor con las
 * reglas del cotizador configuradas en el panel.
 */
export const confirmQuoteOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getQuoterServices } = await import("@/lib/quoter.server");
    const { computeQuote, coerceAnswersDetailed } = await import("@/lib/quoter-core");

    const services = await getQuoterServices();
    const service = services.find((s) => s.slug === data.service_slug);
    if (!service) throw new Error("El servicio de la cotización ya no está disponible");
    assertServiceOrderQuantity(service, data.quantity);

    const rawAnswers: Record<string, unknown> = {};
    for (const a of data.answers) rawAnswers[a.label] = a.value;

    const { values, missingRequired } = coerceAnswersDetailed(service, rawAnswers);
    if (missingRequired.length > 0) {
      throw new Error(
        `Faltan datos para cotizar ${service.name}: ${missingRequired
          .map((f) => f.label)
          .join(", ")}`,
      );
    }

    const quote = computeQuote(service, values, data.quantity);
    const unitPrice = Math.round(quote.unit_price_cop);
    const total = Math.round(quote.total_cop);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city || null,
        payment_method_name: "Cotización Chat Kiara",
        notes: `Cotización aceptada en el chat de Kiara. ${data.notes}`.trim(),
        total_cop: total,
        status: "pendiente" as const,
      })
      .select("id, public_token")
      .single();
    if (error) throw new Error(error.message);

    const { error: iErr } = await supabaseAdmin.from("order_items").insert({
      order_id: order.id,
      product_name: service.name,
      quantity: data.quantity,
      unit_price_cop: unitPrice,
    });
    if (iErr) throw new Error(iErr.message);

    try {
      const { notifyTelegramNewOrder } = await import("@/lib/telegram.server");
      await notifyTelegramNewOrder({
        orderId: order.id,
        customerName: data.customer_name,
        customerPhone: data.customer_phone || null,
        customerEmail: data.customer_email,
        shippingAddress: data.shipping_address,
        shippingCity: data.shipping_city || null,
        totalCop: total,
        paymentMethodName: "Cotización Chat Kiara",
        items: [{ product_name: service.name, quantity: data.quantity, unit_price_cop: unitPrice }],
        sourceLabel: "Cotización Chat Kiara",
      });
    } catch (tgErr) {
      console.error("[Kiara confirmQuoteOrder] Error notificando Telegram:", tgErr);
    }

    return {
      ok: true as const,
      order_id: order.id,
      public_token: order.public_token,
      order_code: formatOrderCode(order.id),
      total_cop: total,
    };
  });
