import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseVariants } from "@/lib/product-variants";

const schema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().default(""),
  quantity: z.number().int().min(1).max(99),
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().default(""),
  shipping_address: z.string().trim().min(4).max(300),
  shipping_city: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

/** Crea una solicitud de pedido pública en las mismas tablas orders / order_items del Panel. */
export const createOrderRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id,name,price_cop,active,variants")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !product.active) throw new Error("Producto no disponible");

    // Determina el precio unitario: variante o producto
    let unitPrice = product.price_cop;
    if (data.variant_id) {
      const variants = parseVariants(product.variants);
      const variant = variants.find((v) => v.id === data.variant_id);
      if (!variant) throw new Error("Variante no encontrada");
      // Usa el precio de la variante si existe, si no usa el del producto
      unitPrice = variant.price_cop ?? product.price_cop;
    }

    const total = unitPrice * data.quantity;

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city || null,
        notes: data.notes
          ? `Solicitud web: ${data.notes}`
          : "Solicitud web desde la página de producto",
        total_cop: total,
        status: "pendiente",
      })
      .select("id")
      .single();
    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = await supabaseAdmin.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      quantity: data.quantity,
      unit_price_cop: unitPrice,
    });
    if (iErr) throw new Error(iErr.message);

    return { ok: true as const, order_id: order.id, total_cop: total };
  });
