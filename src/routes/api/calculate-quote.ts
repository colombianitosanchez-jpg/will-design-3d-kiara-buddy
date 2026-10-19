import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  grams: z.number().min(0).max(100000).optional().default(0),
  hours: z.number().min(0).max(1000).optional().default(0),
  material: z.string().trim().max(60).optional(),
  finish: z.string().trim().max(60).optional(),
  quantity: z.number().min(1).max(1000).optional().default(1),
  serviceSlug: z.string().trim().max(80).optional(),
  answers: z.record(z.unknown()).optional(),
});

/** Motor único de cotización segura en servidor. */
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

        const { computeQuote, coerceAnswers } = await import("@/lib/quoter-core");
        const { getQuoterServices, getQuotingVars } = await import("@/lib/quoter.server");

        const services = await getQuoterServices();
        const serviceSlug = parsed.serviceSlug || "impresion-3d";
        const service = services.find((s) => s.slug === serviceSlug || s.id === serviceSlug) || services[0];

        if (!service) {
          return Response.json({ error: "Servicio no configurado" }, { status: 404 });
        }

        const vars = await getQuotingVars();
        const answers = parsed.answers || {
          peso_gramos: parsed.grams,
          horas_impresion: parsed.hours,
          material: parsed.material,
        };

        const coerced = coerceAnswers(service, answers);
        const result = computeQuote(service, coerced, parsed.quantity, vars as any);
        const isBreakdown = service.price_display === "breakdown";

        return Response.json({
          ok: true,
          quote: {
            service_name: service.name,
            quantity: result.quantity,
            unit_price_cop: result.unit_price_cop,
            total_cop: result.total_cop,
            lines: isBreakdown ? result.lines : [],
            requires_approval: result.requires_approval,
          },
        });
      },
    },
  },
});
