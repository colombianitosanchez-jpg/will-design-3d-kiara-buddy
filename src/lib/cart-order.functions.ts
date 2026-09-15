import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(40),
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().default(""),
  shipping_address: z.string().trim().min(4).max(300),
  shipping_city: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  payment_method_id: z.string().uuid().nullable().optional().default(null),
});

/** Crea un pedido público con varios productos (carrito) en las tablas orders / order_items. */
export const createCartOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = [...new Set(data.items.map((i) => i.product_id))];
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id,name,price_cop,active")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);

    const available = new Map(
      (products ?? []).filter((p) => p.active).map((p) => [p.id, p] as const),
    );
    const lines = data.items
      .filter((i) => available.has(i.product_id))
      .map((i) => {
        const p = available.get(i.product_id)!;
        return {
          product_id: p.id,
          product_name: p.name,
          quantity: i.quantity,
          unit_price_cop: p.price_cop,
        };
      });
    if (!lines.length) throw new Error("Los productos del carrito ya no están disponibles");

    const total = lines.reduce((sum, l) => sum + l.unit_price_cop * l.quantity, 0);

    // El método de pago se vuelve a validar en el servidor: debe existir y estar activo.
    let paymentMethod: { id: string; name: string; instructions: string } | null = null;
    if (data.payment_method_id) {
      const { data: pm } = await supabaseAdmin
        .from("payment_methods")
        .select("id, name, instructions, is_active")
        .eq("id", data.payment_method_id)
        .maybeSingle();
      if (!pm || !pm.is_active) throw new Error("El método de pago ya no está disponible");
      paymentMethod = { id: pm.id, name: pm.name, instructions: pm.instructions };
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        payment_method_id: paymentMethod?.id ?? null,
        payment_method_name: paymentMethod?.name ?? null,
        payment_status: "esperando_pago",
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city || null,
        notes: data.notes ? `Pedido web (carrito): ${data.notes}` : "Pedido web desde el carrito",
        total_cop: total,
        status: "pendiente",
      })
      .select("id")
      .single();
    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    return { ok: true as const, order_id: order.id, total_cop: total };
  });
