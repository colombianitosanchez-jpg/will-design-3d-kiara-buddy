import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TrackedOrder = {
  reference: string;
  created_at: string;
  total_cop: number;
  status: string;
  payment_status: "esperando_pago" | "comprobante_enviado" | "pagado" | "rechazado";
  payment_method_name: string | null;
  payment_method_type: string | null;
  payment_instructions: string;
  qr_image_url: string | null;
  payment_url: string | null;
  allowed_zones: string | null;
  payment_reference: string | null;
  payment_note: string | null;
  customer_name: string;
  items: { product_name: string; quantity: number; unit_price_cop: number }[];
};

const tokenSchema = z.object({ token: z.string().uuid() });

/** Devuelve solo datos seguros del pedido a partir del enlace único de seguimiento. */
export const getOrderByToken = createServerFn({ method: "GET" })
  .validator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }): Promise<TrackedOrder | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, created_at, total_cop, status, payment_status, payment_method_id, payment_method_name, payment_reference, payment_note, customer_name",
      )
      .eq("public_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return null;

    const [{ data: items }, method] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("product_name, quantity, unit_price_cop")
        .eq("order_id", order.id),
      order.payment_method_id
        ? supabaseAdmin
            .from("payment_methods")
            .select("instructions, type, qr_image_url, config")
            .eq("id", order.payment_method_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const pm = (method?.data ?? null) as {
      type?: string;
      instructions?: string;
      qr_image_url?: string | null;
      config?: { payment_url?: string; allowed_zones?: string } | null;
    } | null;

    return {
      reference: order.id.slice(0, 8).toUpperCase(),
      created_at: order.created_at,
      total_cop: order.total_cop,
      status: order.status,
      payment_status: order.payment_status,
      payment_method_name: order.payment_method_name,
      payment_method_type: pm?.type ?? null,
      payment_instructions: pm?.instructions ?? "",
      qr_image_url: pm?.qr_image_url ?? null,
      payment_url: pm?.config?.payment_url ?? null,
      allowed_zones: pm?.config?.allowed_zones ?? null,
      payment_reference: order.payment_reference,
      payment_note: order.payment_note,
      customer_name: order.customer_name,
      items: (items ?? []) as TrackedOrder["items"],
    };
  });

/** El cliente reporta que ya pagó, indicando la referencia del comprobante. */
export const reportPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        token: z.string().uuid(),
        payment_reference: z.string().trim().min(3).max(120),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: findErr } = await supabaseAdmin
      .from("orders")
      .select("id, customer_name, total_cop, payment_method_name, payment_status")
      .eq("public_token", data.token)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!order) throw new Error("No encontramos ese pedido");
    if (order.payment_status === "pagado") {
      throw new Error("Este pedido ya está pagado");
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "comprobante_enviado",
        payment_reference: data.payment_reference,
        payment_reported_at: new Date().toISOString(),
        payment_note: null,
      })
      .eq("id", order.id);
    if (error) throw new Error(error.message);

    try {
      const { notifyTelegramVoucher } = await import("@/lib/telegram.server");
      await notifyTelegramVoucher({
        orderId: order.id,
        customerName: order.customer_name,
        totalCop: order.total_cop,
        paymentReference: data.payment_reference,
        paymentMethodName: order.payment_method_name,
      });
    } catch (err) {
      console.error("[Telegram] Error notificando comprobante:", err);
    }

    return { ok: true as const };
  });
