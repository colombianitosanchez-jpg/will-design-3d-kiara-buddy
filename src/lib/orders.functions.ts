import { createServerFn } from "@tanstack/react-start";
import { parseVariants } from "@/lib/product-variants";
import { formatOrderCode, normalizeWhatsAppDigits } from "@/lib/notification-templates";
import { parseOrderRequestInput } from "@/lib/order-validation";

/** Crea una solicitud de pedido pública en las mismas tablas orders / order_items del Panel. */
export const createOrderRequest = createServerFn({ method: "POST" })
  .validator(parseOrderRequestInput)
  .handler(async ({ data }) => {
    const { assertRateLimitFromRequest } = await import("@/lib/rate-limit.server");
    assertRateLimitFromRequest("orders:create");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let resolvedProductId: string | null = null;
    let unitPrice = 0;
    let itemLabel = "";
    let isServiceOrder = false;

    if (data.product_id) {
      const { data: product, error: pErr } = await supabaseAdmin
        .from("products")
        .select("id,name,price_cop,active,variants")
        .eq("id", data.product_id)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!product || !product.active) throw new Error("Producto no disponible");

      resolvedProductId = product.id;
      unitPrice = product.price_cop;
      itemLabel = product.name;
      if (data.variant_id) {
        const variants = parseVariants(product.variants);
        const variant = variants.find((v) => v.id === data.variant_id);
        if (!variant) throw new Error("Variante no encontrada");
        unitPrice = variant.price_cop ?? product.price_cop;
        itemLabel = `${product.name} — ${variant.name}`;
      }
    } else {
      isServiceOrder = true;
      const serviceQuery = supabaseAdmin
        .from("site_services")
        .select("id, slug, title, quoter_service_id, is_active")
        .eq("is_active", true);
      const { data: serviceRow, error: sErr } = data.service_id
        ? await serviceQuery.eq("id", data.service_id).maybeSingle()
        : await serviceQuery.eq("slug", data.service_slug.trim()).maybeSingle();
      if (sErr) throw new Error(sErr.message);
      if (!serviceRow) throw new Error("Servicio no disponible");

      itemLabel = `Servicio: ${serviceRow.title}`;
      unitPrice = 0;
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
        payment_method_name: isServiceOrder
          ? "Servicio Web WhatsApp"
          : data.quick_capture
            ? "Compra rápida WhatsApp"
            : null,
        notes: data.notes
          ? `${isServiceOrder ? "Solicitud de servicio" : data.quick_capture ? "Pedido rápido WhatsApp" : "Solicitud web"}: ${data.notes}`
          : isServiceOrder
            ? `Solicitud rápida de ${itemLabel} por WhatsApp`
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
      product_id: resolvedProductId,
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
        paymentMethodName: isServiceOrder
          ? "Servicio Web WhatsApp"
          : data.quick_capture
            ? "WhatsApp (Pedido Rápido)"
            : "Solicitud Web",
        items: [{ product_name: itemLabel, quantity: data.quantity, unit_price_cop: unitPrice }],
        sourceLabel: isServiceOrder
          ? "Servicio Web WhatsApp"
          : data.quick_capture
            ? "Compra Rápida WhatsApp"
            : "Ficha Producto",
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
