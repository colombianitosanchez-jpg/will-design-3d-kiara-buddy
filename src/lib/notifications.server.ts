import {
  DEFAULT_ORDER_TEMPLATES,
  expandNotificationTemplate,
  normalizeWhatsAppDigits,
} from "@/lib/notification-templates";
import { notifyTelegramStatusChange } from "@/lib/telegram.server";

export async function sendCustomerWhatsAppApi(params: {
  endpoint: string;
  phone: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const digits = normalizeWhatsAppDigits(params.phone);
  if (!digits) {
    return { ok: false, error: "Sin teléfono válido del cliente" };
  }
  const url = params.endpoint.trim();
  if (!url) {
    return { ok: false, error: "Sin URL de API de WhatsApp configurada" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body: params.message },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message.slice(0, 300) };
  }
}

/** Determina si la hora actual cae dentro de los días y horario laboral configurados. */
export function isWithinWorkingHours(
  cfg: {
    working_days?: number[] | null;
    work_start_hour?: number | null;
    work_end_hour?: number | null;
    timezone?: string | null;
  },
  now = new Date(),
): boolean {
  const tz = cfg.timezone || "America/Bogota";
  const days = Array.isArray(cfg.working_days) && cfg.working_days.length ? cfg.working_days : [1, 2, 3, 4, 5];
  const start = Number.isFinite(cfg.work_start_hour) ? Number(cfg.work_start_hour) : 8;
  const end = Number.isFinite(cfg.work_end_hour) ? Number(cfg.work_end_hour) : 18;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
    const hourStr = parts.find((p) => p.type === "hour")?.value ?? "12";
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const dayNum = dayMap[weekdayStr] ?? now.getDay();
    const hourNum = Number(hourStr) % 24;
    return days.includes(dayNum) && hourNum >= start && hourNum < end;
  } catch {
    const h = now.getHours();
    return days.includes(now.getDay()) && h >= start && h < end;
  }
}

/**
 * Actualiza el estado de un pedido desde el panel, dispara alerta Telegram y sincroniza
 * el mensaje en `notifications_queue` (enviando inmediatamente por API si aplica).
 */
export async function updateOrderStatusAndNotify(params: {
  orderId: string;
  status: "pendiente" | "empacando" | "enviado" | "entregado" | "cancelado";
  guia?: string;
}): Promise<{ ok: true; whatsappDispatched: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: updated, error } = await supabaseAdmin
    .from("orders")
    .update({ status: params.status })
    .eq("id", params.orderId)
    .select("id, customer_name, customer_phone, total_cop, status")
    .single();
  if (error || !updated) {
    throw new Error(error?.message || "No se pudo actualizar el estado del pedido");
  }

  // Alerta Telegram al desarrollador / equipo
  await notifyTelegramStatusChange({
    orderId: updated.id,
    customerName: updated.customer_name,
    status: params.status,
    totalCop: updated.total_cop,
    guia: params.guia,
  });

  let whatsappDispatched = false;

  try {
    const { data: cfg } = await supabaseAdmin
      .from("notification_settings")
      .select("is_enabled, working_days, work_start_hour, work_end_hour, timezone, events, templates, whatsapp_api_url")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (cfg?.is_enabled) {
      const events = (cfg.events ?? {}) as Record<string, unknown>;
      const templates = (cfg.templates ?? {}) as Record<string, string>;
      const eventEnabled = Boolean(events[params.status]);

      if (eventEnabled) {
        const rawTpl = templates[params.status] || DEFAULT_ORDER_TEMPLATES[params.status] || "";
        const expanded = expandNotificationTemplate(rawTpl, {
          customerName: updated.customer_name,
          orderId: updated.id,
          status: params.status,
          totalCop: updated.total_cop,
          guia: params.guia,
        });

        // El trigger Postgres inserta una fila en notifications_queue al actualizar orders.status.
        // La ubicamos para enriquecer su texto con {{nombre}}, {{pedido}}, {{total}} y {{guia}},
        // y si hay API configurada dentro de horario hábil, la despachamos inmediatamente.
        const { data: latestQueue } = await supabaseAdmin
          .from("notifications_queue")
          .select("id")
          .eq("order_id", updated.id)
          .eq("event", params.status)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let queueId = latestQueue?.id;
        if (!queueId) {
          const { data: inserted } = await supabaseAdmin
            .from("notifications_queue")
            .insert({
              order_id: updated.id,
              customer_phone: updated.customer_phone || "",
              message: expanded,
              event: params.status,
              status: "pending",
              scheduled_for: new Date().toISOString(),
            })
            .select("id")
            .single();
          queueId = inserted?.id;
        } else {
          await supabaseAdmin
            .from("notifications_queue")
            .update({ message: expanded })
            .eq("id", queueId);
        }

        const endpoint = (cfg.whatsapp_api_url ?? "").trim();
        if (queueId && endpoint && isWithinWorkingHours(cfg)) {
          const res = await sendCustomerWhatsAppApi({
            endpoint,
            phone: updated.customer_phone ?? "",
            message: expanded,
          });
          if (res.ok) {
            await supabaseAdmin
              .from("notifications_queue")
              .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
              .eq("id", queueId);
            whatsappDispatched = true;
          } else {
            await supabaseAdmin
              .from("notifications_queue")
              .update({ status: "failed", error: res.error ?? "Error enviando WhatsApp" })
              .eq("id", queueId);
          }
        } else if (queueId && !endpoint) {
          await supabaseAdmin
            .from("notifications_queue")
            .update({ status: "manual", error: null })
            .eq("id", queueId);
        }
      }
    }
  } catch (err) {
    console.error("[Notifications] Error en cola WhatsApp:", err);
  }

  return { ok: true, whatsappDispatched };
}

export async function retryNotificationQueueRow(queueId: string): Promise<{ ok: boolean; status: string; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: row, error: rowErr }, { data: cfg }] = await Promise.all([
    supabaseAdmin
      .from("notifications_queue")
      .select("id, customer_phone, message")
      .eq("id", queueId)
      .maybeSingle(),
    supabaseAdmin
      .from("notification_settings")
      .select("whatsapp_api_url")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (rowErr || !row) throw new Error("No encontramos la notificación en la cola.");

  const endpoint = (cfg?.whatsapp_api_url ?? "").trim();
  if (!endpoint) {
    await supabaseAdmin
      .from("notifications_queue")
      .update({
        status: "manual",
        error: "Configura la URL de API de WhatsApp o envíalo manualmente desde Pedidos.",
      })
      .eq("id", row.id);
    return {
      ok: false,
      status: "manual",
      error: "No hay URL de API de WhatsApp configurada. Puedes enviarlo manualmente desde Pedidos.",
    };
  }

  const res = await sendCustomerWhatsAppApi({
    endpoint,
    phone: row.customer_phone ?? "",
    message: row.message,
  });

  if (res.ok) {
    await supabaseAdmin
      .from("notifications_queue")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .eq("id", row.id);
    return { ok: true, status: "sent" };
  }

  await supabaseAdmin
    .from("notifications_queue")
    .update({ status: "failed", error: res.error ?? "Error de envío" })
    .eq("id", row.id);
  return { ok: false, status: "failed", error: res.error };
}
