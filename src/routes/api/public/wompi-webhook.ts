import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { buildWompiChecksumInput } from "@/lib/payment-config";

const wompiEventSchema = z.object({
  event: z.string(),
  data: z.object({
    transaction: z.object({
      id: z.string().min(1),
      status: z.string().min(1),
      reference: z.string().min(1),
      amount_in_cents: z.number().optional(),
      payment_method_type: z.string().optional(),
    }),
  }),
  signature: z.object({
    properties: z.array(z.string()).min(1),
    checksum: z.string().min(1),
  }),
  timestamp: z.union([z.number(), z.string()]),
});

function verifyChecksum(expectedHex: string, actualHex: string): boolean {
  const a = Buffer.from(expectedHex.trim().toLowerCase());
  const b = Buffer.from(actualHex.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

async function resolveWompiEventsSecret(): Promise<string> {
  const envSecret = (process.env["WOMPI_EVENTS_SECRET"] ?? "").trim();
  if (envSecret) return envSecret;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_methods")
    .select("type, config, credentials")
    .in("type", ["gateway_redirect", "gateway"])
    .eq("is_active", true);

  for (const row of data ?? []) {
    const creds = (row.credentials ?? {}) as Record<string, unknown>;
    const candidate =
      (typeof creds.wompi_events_secret === "string" && creds.wompi_events_secret) ||
      (typeof creds.events_secret === "string" && creds.events_secret) ||
      (typeof creds.secret === "string" && creds.secret) ||
      "";
    if (candidate.trim()) return candidate.trim();
  }
  return "";
}

/**
 * Webhook oficial de Wompi para confirmación automática de pagos (`transaction.updated`).
 * Verifica la firma SHA256 con el Secreto de Eventos, actualiza `orders.payment_status`
 * y dispara alerta en Telegram en tiempo real.
 */
export const Route = createFileRoute("/api/public/wompi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let rawJson: unknown;
        try {
          rawJson = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsedRes = wompiEventSchema.safeParse(rawJson);
        if (!parsedRes.success) {
          return new Response("Invalid Wompi payload", { status: 400 });
        }

        const secret = await resolveWompiEventsSecret();
        if (!secret) {
          return new Response("Wompi events secret not configured", { status: 503 });
        }

        const event = parsedRes.data;
        const headerChecksum = request.headers.get("x-event-checksum");
        const providedChecksum = headerChecksum || event.signature.checksum;
        const rawToHash = buildWompiChecksumInput(
          event.data as unknown as Record<string, unknown>,
          event.signature.properties,
          event.timestamp,
          secret,
        );
        const expectedHex = createHash("sha256").update(rawToHash).digest("hex");

        if (!verifyChecksum(expectedHex, providedChecksum)) {
          return new Response("Invalid signature", { status: 401 });
        }

        if (event.event !== "transaction.updated") {
          return Response.json({ ok: true, ignored: event.event });
        }

        const tx = event.data.transaction;
        const ref = tx.reference.trim();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Permite hacer match por UUID completo, public_token o código #WD-XXXXXXXX
        const uuidMatch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
        let orderRow: {
          id: string;
          customer_name: string;
          total_cop: number;
          payment_method_name: string | null;
          payment_status: string;
        } | null = null;

        if (uuidMatch) {
          const { data } = await supabaseAdmin
            .from("orders")
            .select("id, customer_name, total_cop, payment_method_name, payment_status")
            .or(`id.eq.${ref},public_token.eq.${ref}`)
            .maybeSingle();
          orderRow = data;
        } else {
          const cleanCode = ref.replace(/^#?WD-/i, "").toLowerCase();
          if (cleanCode.length >= 8) {
            const { data: candidates } = await supabaseAdmin
              .from("orders")
              .select("id, customer_name, total_cop, payment_method_name, payment_status")
              .order("created_at", { ascending: false })
              .limit(100);
            orderRow =
              (candidates ?? []).find((o) => o.id.toLowerCase().startsWith(cleanCode)) ?? null;
          }
        }

        if (!orderRow) {
          return Response.json({ ok: false, error: "Order not found" }, { status: 404 });
        }

        const txStatus = tx.status.toUpperCase();
        if (txStatus === "APPROVED") {
          if (orderRow.payment_status === "pagado") {
            return Response.json({ ok: true, already_paid: true, order_id: orderRow.id });
          }
          const expectedCents = Math.round(orderRow.total_cop * 100);
          if (typeof tx.amount_in_cents !== "number" || tx.amount_in_cents < expectedCents) {
            await supabaseAdmin
              .from("orders")
              .update({
                payment_status: "comprobante_enviado",
                payment_reference: `Wompi ${tx.id}`,
                payment_note: `Wompi aprobó ${(tx.amount_in_cents ?? 0) / 100} COP pero el pedido es de ${orderRow.total_cop} COP. Revisar manualmente.`,
              })
              .eq("id", orderRow.id);
            return Response.json({ ok: true, amount_mismatch: true, order_id: orderRow.id });
          }
          const { error } = await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "pagado",
              payment_confirmed_at: new Date().toISOString(),
              payment_reference: `Wompi ${tx.id}`,
              payment_note: null,
            })
            .eq("id", orderRow.id);
          if (error) return new Response("Order update failed", { status: 500 });

          try {
            const { notifyTelegramPaymentConfirmed } = await import("@/lib/telegram.server");
            await notifyTelegramPaymentConfirmed({
              orderId: orderRow.id,
              customerName: orderRow.customer_name,
              totalCop: orderRow.total_cop,
              paymentMethodName: orderRow.payment_method_name ?? "Wompi",
              reference: tx.id,
              gateway: `Wompi (${tx.payment_method_type ?? "Pasarela"})`,
            });
          } catch (err) {
            console.error("[Telegram] Wompi webhook alert error:", err);
          }
        } else if (["DECLINED", "VOIDED", "ERROR"].includes(txStatus) && orderRow.payment_status !== "pagado") {
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "rechazado",
              payment_reference: `Wompi ${tx.id}`,
              payment_note: `Wompi reportó estado ${txStatus}.`,
            })
            .eq("id", orderRow.id);
        }

        return Response.json({ ok: true, status: txStatus, order_id: orderRow.id });
      },
    },
  },
});
