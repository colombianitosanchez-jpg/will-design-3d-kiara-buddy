import { createFileRoute } from "@tanstack/react-router";

/**
 * Procesador de la cola de notificaciones de WhatsApp.
 * Llamar cada 15 minutos (pg_cron) con el header `x-cron-secret`
 * usando el valor del secreto NOTIFICATIONS_CRON_SECRET.
 * Envía los mensajes cuya fecha programada ya pasó usando la URL de API
 * de WhatsApp configurada en Panel → Notificaciones y horarios.
 */
export const Route = createFileRoute("/api/public/hooks/process-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Solo el programador interno puede disparar los envíos: secreto privado,
        // nunca la clave publicable que viaja al navegador.
        const cronSecret = (request.headers.get("x-cron-secret") ?? "").trim();
        const envSecret = (process.env["NOTIFICATIONS_CRON_SECRET"] ?? "").trim();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let authorized = Boolean(cronSecret) && Boolean(envSecret) && cronSecret === envSecret;
        if (!authorized && cronSecret) {
          const { data: ok } = await supabaseAdmin.rpc("verify_cron_secret", {
            _secret: cronSecret,
          });
          authorized = ok === true;
        }
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }


        const { data: cfg } = await supabaseAdmin
          .from("notification_settings")
          .select("is_enabled, whatsapp_api_url")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!cfg?.is_enabled) {
          return Response.json({ ok: true, skipped: "notificaciones desactivadas" });
        }

        const { data: pending } = await supabaseAdmin
          .from("notifications_queue")
          .select("id, customer_phone, message")
          .eq("status", "pending")
          .lte("scheduled_for", new Date().toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(25);

        const rows = pending ?? [];
        let sent = 0;
        let failed = 0;

        for (const row of rows) {
          const phone = (row.customer_phone ?? "").replace(/[^0-9]/g, "");
          if (!phone) {
            await supabaseAdmin
              .from("notifications_queue")
              .update({ status: "failed", error: "Sin teléfono del cliente" })
              .eq("id", row.id);
            failed++;
            continue;
          }

          const endpoint = (cfg.whatsapp_api_url ?? "").trim();
          if (!endpoint) {
            // Sin proveedor configurado: se marca como listo para envío manual.
            await supabaseAdmin
              .from("notifications_queue")
              .update({ status: "manual", error: "Sin URL de API de WhatsApp configurada" })
              .eq("id", row.id);
            continue;
          }

          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              // Payload estándar tipo WhatsApp Cloud API
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: phone,
                type: "text",
                text: { body: row.message },
              }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

            await supabaseAdmin
              .from("notifications_queue")
              .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
              .eq("id", row.id);
            sent++;
          } catch (e) {
            await supabaseAdmin
              .from("notifications_queue")
              .update({ status: "failed", error: (e as Error).message.slice(0, 500) })
              .eq("id", row.id);
            failed++;
          }
        }

        return Response.json({ ok: true, processed: rows.length, sent, failed });
      },
    },
  },
});
