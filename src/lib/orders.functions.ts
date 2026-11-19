import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseVariants } from "@/lib/product-variants";
import { formatOrderCode, normalizeWhatsAppDigits } from "@/lib/notification-templates";

const schema = z
  .object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().optional().default(""),
    quantity: z.number().int().min(1).max(99).optional().default(1),
    customer_name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
    customer_email: z.string().trim().max(160).optional().default(""),
    customer_phone: z.string().trim().max(40).optional().default(""),
    shipping_address: z.string().trim().max(300).optional().default(""),
    shipping_city: z.string().trim().max(120).optional().default(""),
    notes: z.string().trim().max(1000).optional().default(""),
    quick_capture: z.boolean().optional().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.quick_capture) {
      if (!normalizeWhatsAppDigits(val.customer_phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_phone"],
          message: "Ingresa un número de WhatsApp válido (mínimo 7 dígitos)",
        });
      }
      if (val.customer_email && !z.string().email().safeParse(val.customer_email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_email"],
          message: "Correo inválido",
        });
      }
    } else {
      if (!z.string().email().safeParse(val.customer_email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_email"],
          message: "Ingresa un correo electrónico válido",
        });
      }
      if (val.shipping_address.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["shipping_address"],
          message: "Ingresa la dirección de envío",
        });
      }
    }
  });

/** Crea una solicitud de pedido pública en las mismas tablas orders / order_items del Panel. */
export const createOrderRequest = createServerFn({ method: "POST" })
  .validator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id,name,price_cop,active,variants")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !product.active) throw new Error("Producto no disponible");

    let unitPrice = product.price_cop;
    let itemLabel = product.name;
    if (data.variant_id) {
      const variants = parseVariants(product.variants);
      const variant = variants.find((v) => v.id === data.variant_id);
      if (!variant) throw new Error("Variante no encontrada");
      unitPrice = variant.price_cop ?? product.price_cop;
      itemLabel = `${product.name} — ${variant.name}`;
    }

    const total = unitPrice * data.quantity;
    const digits = normalizeWhatsAppDigits(data.customer_phone) || "cliente";
    const resolvedEmail = data.customer_email.trim() || `whatsapp-${digits}@pedido.willdesign3d.local`;
    const resolvedAddress = data.shipping_address.trim() || "Por confirmar vía WhatsApp";

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_email: resolvedEmail,
        customer_phone: data.customer_phone.trim() || null,
        shipping_address: resolvedAddress,
        shipping_city: data.shipping_city.trim() || null,
        payment_method_name: data.quick_capture ? "Compra rápida WhatsApp" : null,
        notes: data.notes
          ? `${data.quick_capture ? "Pedido rápido WhatsApp" : "Solicitud web"}: ${data.notes}`
          : data.quick_capture
            ? "Pedido rápido desde botón de WhatsApp"
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
      product_name: itemLabel,
      quantity: data.quantity,
      unit_price_cop: unitPrice,
    });
    if (iErr) throw new Error(iErr.message);

    try {
      const { notifyTelegramNewOrder } = await import("@/lib/telegram.server");
      await notifyTelegramNewOrder({
        orderId: order.id,
        customerName: data.customer_name,
        customerPhone: data.customer_phone.trim() || null,
        customerEmail: data.customer_email.trim() || null,
        shippingAddress: resolvedAddress,
        shippingCity: data.shipping_city.trim() || null,
        totalCop: total,
        paymentMethodName: data.quick_capture ? "WhatsApp (Pedido Rápido)" : "Solicitud Web",
        items: [{ product_name: itemLabel, quantity: data.quantity, unit_price_cop: unitPrice }],
        sourceLabel: data.quick_capture ? "Compra Rápida WhatsApp" : "Ficha Producto",
      });
    } catch (err) {
      console.error("[Telegram] Error notificando nuevo pedido:", err);
    }

    return {
      ok: true as const,
      order_id: order.id,
      order_code: formatOrderCode(order.id),
      total_cop: total,
    };
  });
