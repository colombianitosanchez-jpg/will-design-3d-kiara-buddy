import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TrackedOrder = {
  reference: string;
  created_at: string;
  total_cop: number;
  status: string;
  payment_status: "esperando_pago" | "comprobante_enviado" | "pagado" | "rechazado";
  payment_method_name: string | null;
  payment_instructions: string;
  payment_reference: string | null;
  payment_note: string | null;
  customer_name: string;
  items: { product_name: string; quantity: number; unit_price_cop: number }[];
};

const tokenSchema = z.object({ token: z.string().uuid() });

/** Devuelve solo datos seguros del pedido a partir del enlace único de seguimiento. */
export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
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
            .select("instructions")
            .eq("id", order.payment_method_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      reference: order.id.slice(0, 8).toUpperCase(),
      created_at: order.created_at,
      total_cop: order.total_cop,
      status: order.status,
      payment_status: order.payment_status,
      payment_method_name: order.payment_method_name,
      payment_instructions: (method?.data as { instructions?: string } | null)?.instructions ?? "",
      payment_reference: order.payment_reference,
      payment_note: order.payment_note,
      customer_name: order.customer_name,
      items: (items ?? []) as TrackedOrder["items"],
    };
  });

/** El cliente reporta que ya pagó, indicando la referencia del comprobante. */
export const reportPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
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
      .select("id, payment_status")
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
    return { ok: true as const };
  });
