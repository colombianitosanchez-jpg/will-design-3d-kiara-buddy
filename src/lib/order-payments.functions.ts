import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertTeam(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: string,
        ) => { maybeSingle: () => Promise<{ data: { role: string; is_active: boolean } | null }> };
      };
    };
  };
  const { data } = await supabase
    .from("user_roles")
    .select("role, is_active")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data || !data.is_active || !["empleado", "super_admin"].includes(data.role)) {
    throw new Error("No tienes permiso para gestionar pagos");
  }
}

/** Confirma el pago: el pedido queda pagado y pasa automáticamente a empacando. */
export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ order_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertTeam(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "pagado",
        payment_confirmed_at: new Date().toISOString(),
        payment_note: null,
      })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Rechaza el comprobante y deja una nota visible para el cliente. */
export const rejectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        note: z.string().trim().max(500).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertTeam(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "rechazado",
        payment_note: data.note || "No pudimos verificar el pago. Escríbenos por WhatsApp.",
      })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
