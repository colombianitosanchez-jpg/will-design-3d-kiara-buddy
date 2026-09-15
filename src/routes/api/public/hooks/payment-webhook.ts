import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const payloadSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["paid", "rejected"]),
  reference: z.string().trim().max(200).optional(),
});

function verify(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/hooks/payment-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYMENT_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-payment-signature");
        if (!verify(raw, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let parsed: z.infer<typeof payloadSchema>;
        try {
          parsed = payloadSchema.parse(JSON.parse(raw));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const patch =
          parsed.status === "paid"
            ? {
                payment_status: "pagado" as const,
                payment_confirmed_at: new Date().toISOString(),
                payment_reference: parsed.reference ?? null,
                payment_note: null,
              }
            : {
                payment_status: "rechazado" as const,
                payment_note: "La pasarela rechazó el pago.",
              };

        const { error } = await supabaseAdmin
          .from("orders")
          .update(patch)
          .eq("id", parsed.order_id);
        if (error) return new Response("Update failed", { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
