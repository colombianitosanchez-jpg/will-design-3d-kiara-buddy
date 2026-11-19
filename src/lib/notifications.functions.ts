import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_ORDER_TEMPLATES } from "@/lib/notification-templates";

export type NotificationSettingsDTO = {
  id: string;
  is_enabled: boolean;
  working_days: number[];
  work_start_hour: number;
  work_end_hour: number;
  timezone: string;
  whatsapp_api_url: string;
  events: Record<string, boolean>;
  templates: Record<string, string>;
  telegram_bot_token: string;
  telegram_chat_id: string;
};

export type NotificationQueueItem = {
  id: string;
  order_id: string | null;
  customer_phone: string | null;
  message: string;
  event: string;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  error: string | null;
};

async function assertTeamRole(context: { supabase: unknown; userId: string }): Promise<string> {
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
    throw new Error("No tienes permiso para acceder a notificaciones");
  }
  return data.role;
}

export const getNotificationAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await assertTeamRole(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: initialSettings }, { data: q }] = await Promise.all([
      supabaseAdmin
        .from("notification_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("notifications_queue")
        .select("id, order_id, customer_phone, message, event, status, scheduled_for, sent_at, error")
        .order("scheduled_for", { ascending: false })
        .limit(50),
    ]);
    let s = initialSettings;

    if (!s) {
      const { data: created } = await supabaseAdmin
        .from("notification_settings")
        .insert({
          is_enabled: true,
          templates: DEFAULT_ORDER_TEMPLATES,
        })
        .select("*")
        .single();
      s = created;
    }

    const rawTemplates = ((s?.templates ?? {}) as Record<string, string>) || {};
    const rawEvents = ((s?.events ?? {}) as Record<string, boolean>) || {};
    const {
      _telegram_bot_token,
      _telegram_chat_id,
      ...cleanTemplates
    } = rawTemplates;

    const mergedTemplates: Record<string, string> = {
      ...DEFAULT_ORDER_TEMPLATES,
      ...cleanTemplates,
    };

    const settings: NotificationSettingsDTO = {
      id: s!.id,
      is_enabled: Boolean(s!.is_enabled),
      working_days: (s!.working_days as number[]) ?? [1, 2, 3, 4, 5],
      work_start_hour: Number(s!.work_start_hour ?? 8),
      work_end_hour: Number(s!.work_end_hour ?? 18),
      timezone: s!.timezone || "America/Bogota",
      whatsapp_api_url: s!.whatsapp_api_url ?? "",
      events: {
        pendiente: true,
        empacando: true,
        enviado: true,
        entregado: false,
        cancelado: false,
        comprobante_enviado: true,
        pago_confirmado: true,
        pago_rechazado: true,
        tg_new_order: true,
        tg_voucher: true,
        tg_payment_confirmed: true,
        tg_status_change: true,
        ...rawEvents,
      },
      templates: mergedTemplates,
      // El token solo se devuelve al super_admin autenticado para permitir mostrar/ocultar en /panel/notificaciones
      telegram_bot_token: role === "super_admin" ? (_telegram_bot_token ?? "") : "",
      telegram_chat_id: role === "super_admin" ? (_telegram_chat_id ?? "") : "",
    };

    return {
      settings,
      queue: (q ?? []) as NotificationQueueItem[],
      isSuperAdmin: role === "super_admin",
    };
  });

/** Devuelve solo plantillas + eventos para armar mensajes manuales de WhatsApp en /panel/pedidos. */
export const getNotificationTemplatesForOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTeamRole(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("notification_settings")
      .select("templates")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const rawTemplates = ((s?.templates ?? {}) as Record<string, string>) || {};
    const { _telegram_bot_token: _t, _telegram_chat_id: _c, ...cleanTemplates } = rawTemplates;
    return { ...DEFAULT_ORDER_TEMPLATES, ...cleanTemplates };
  });

const saveSettingsSchema = z.object({
  id: z.string().uuid(),
  is_enabled: z.boolean(),
  working_days: z.array(z.number().int().min(0).max(6)),
  work_start_hour: z.number().int().min(0).max(23),
  work_end_hour: z.number().int().min(1).max(24),
  whatsapp_api_url: z.string().trim().max(500).optional().default(""),
  events: z.record(z.string(), z.boolean()),
  templates: z.record(z.string(), z.string()),
  telegram_bot_token: z.string().trim().max(300).optional().default(""),
  telegram_chat_id: z.string().trim().max(120).optional().default(""),
});

export const saveNotificationSettingsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => saveSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const role = await assertTeamRole(context as never);
    if (role !== "super_admin") {
      throw new Error("Solo un Super Admin puede guardar la configuración de notificaciones");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safeTemplates: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.templates)) {
      if (!k.startsWith("_telegram_")) safeTemplates[k] = v;
    }
    if (data.telegram_bot_token) {
      safeTemplates._telegram_bot_token = data.telegram_bot_token;
    }
    if (data.telegram_chat_id) {
      safeTemplates._telegram_chat_id = data.telegram_chat_id;
    }

    const { error } = await supabaseAdmin
      .from("notification_settings")
      .update({
        is_enabled: data.is_enabled,
        working_days: data.working_days,
        work_start_hour: data.work_start_hour,
        work_end_hour: data.work_end_hour,
        whatsapp_api_url: data.whatsapp_api_url,
        events: data.events,
        templates: safeTemplates,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const sendTelegramTestAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        telegram_bot_token: z.string().trim().max(300).optional().default(""),
        telegram_chat_id: z.string().trim().max(120).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertTeamRole(context as never);
    const { sendTelegramNotification } = await import("@/lib/telegram.server");

    const nowText = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
    const res = await sendTelegramNotification({
      text: [
        "🧪 <b>Prueba de conexión exitosa — Will Design 3D</b>",
        "Tu canal de alertas en tiempo real para pedidos, comprobantes y pagos está activo.",
        `🕒 ${nowText}`,
      ].join("\n"),
      overrideToken: data.telegram_bot_token || undefined,
      overrideChatId: data.telegram_chat_id || undefined,
    });

    if (!res.ok) {
      throw new Error(res.error || "No se pudo enviar el mensaje de prueba a Telegram");
    }
    return { ok: true as const };
  });

export const retryQueuedNotificationAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertTeamRole(context as never);
    const { retryNotificationQueueRow } = await import("@/lib/notifications.server");
    return await retryNotificationQueueRow(data.id);
  });

export const updateOrderStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(["pendiente", "empacando", "enviado", "entregado", "cancelado"]),
        guia: z.string().trim().max(120).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertTeamRole(context as never);
    const { updateOrderStatusAndNotify } = await import("@/lib/notifications.server");
    return await updateOrderStatusAndNotify({
      orderId: data.order_id,
      status: data.status,
      guia: data.guia,
    });
  });
