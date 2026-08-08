import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  grams: z.number().min(0).max(100000),
  hours: z.number().min(0).max(1000),
  material: z.string().trim().max(60).optional(),
  finish: z.string().trim().max(60).optional(),
  quantity: z.number().min(1).max(1000).optional(),
});

/** Motor de cotización dinámica: aplica las reglas del Panel a los datos del modelo 3D. */
export const Route = createFileRoute("/api/calculate-quote")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Datos inválidos" }, { status: 400 });
        }

        const { calcQuote } = await import("@/lib/pricing");
        const { getActivePricingRules } = await import("@/lib/pricing.server");

        const rules = await getActivePricingRules();
        const breakdown = calcQuote(rules, parsed);

        return Response.json({ ok: true, rules_name: rules.name, quote: breakdown });
      },
    },
  },
});
