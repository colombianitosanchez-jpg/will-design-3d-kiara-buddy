import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeQuote, type QuoterResult } from "@/lib/quoter-core";

const schema = z.object({
  service_id: z.string().uuid(),
  values: z.record(z.string().max(80), z.string().max(300)).default({}),
  quantity: z.number().int().min(1).max(10000).default(1),
});

/** Calcula el precio en el servidor: las variables globales internas nunca llegan al navegador. */
export const computePublicQuote = createServerFn({ method: "POST" })
  .validator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<QuoterResult | null> => {
    const { getQuoterServices, getQuotingVars } = await import("@/lib/quoter.server");
    const [services, vars] = await Promise.all([getQuoterServices(), getQuotingVars()]);
    const service = services.find((s) => s.id === data.service_id);
    if (!service) return null;
    const full = computeQuote(service, data.values, data.quantity, vars);
    // Solo se expone el precio final: el desglose de costos, el multiplicador y
    // el margen revelarían las variables internas de precios.
    return {
      ...full,
      lines: [],
      multiplier: 1,
      subtotal_cop: 0,
      margin_cop: 0,
    };
  });
