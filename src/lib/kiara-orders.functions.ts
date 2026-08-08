import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().default(""),
  shipping_address: z.string().trim().min(4).max(300),
  shipping_city: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  item_name: z.string().trim().min(2).max(200),
  quantity: z.number().int().min(1).max(999),
  unit_price_cop: z.number().int().min(0).max(2_000_000_000),
});

/** Convierte una cotización de Kiara en un pedido pendiente del Panel → Pedidos. */
export const confirmQuoteOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const total = data.quantity * data.unit_price_cop;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city || null,
        notes: `Cotización aceptada en el chat de Kiara. ${data.notes}`.trim(),
        total_cop: total,
        status: "pendiente" as const,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: iErr } = await supabaseAdmin.from("order_items").insert({
      order_id: order.id,
      product_name: data.item_name,
      quantity: data.quantity,
      unit_price_cop: data.unit_price_cop,
    });
    if (iErr) throw new Error(iErr.message);

    return { ok: true as const, order_id: order.id, total_cop: total };
  });
