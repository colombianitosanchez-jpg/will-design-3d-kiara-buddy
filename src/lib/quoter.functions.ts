// Server Functions para el motor de Cotizaciones (Server-side calculation)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { QuoterService } from "@/lib/quoter-core";
import { computeQuote, coerceAnswersDetailed } from "@/lib/quoter-core";
import { getQuoterServices, getQuotingVars } from "@/lib/quoter.server";


/** Lista pública del cotizador: entrega preguntas y descripciones, nunca los costos internos ni las fórmulas. */
export const getPublicQuoterServices = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({}).parse(data))
  .handler(async (): Promise<QuoterService[]> => {
    const services = await getQuoterServices();
    return services.map((service) => {
      const allowPublicBreakdown = service.price_display === "breakdown";
      return {
        ...service,
        // El precio mínimo puede mostrarse como "Desde"; los costes reales no salen del servidor.
        base_price_cop: 0,
        gastos_extra_cop: 0,
        margin_percent: 0,
        formula: undefined,
        fields: service.fields.map((field) => ({
          ...field,
          price_per_unit_cop: 0,
          price_source: "fixed",
          formula: undefined,
          multiplier: 1,
          options: field.options.map((option) => ({
            ...option,
            multiplier: 1,
            add_cop: allowPublicBreakdown ? option.add_cop : 0,
          })),
        })),
      };
    });
  });

const computeSchema = z.object({
  serviceSlug: z.string().trim().min(1).max(160),
  answers: z.record(z.unknown()).refine((answers) => Object.keys(answers).length <= 60, "Demasiadas respuestas"),
  quantity: z.number().int().min(1).max(10000).default(1),
});

export const computeQuoteServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => computeSchema.parse(data))
  .handler(async ({ data }) => {
    const { serviceSlug, answers, quantity } = data;
    const services = await getQuoterServices();
    const service = services.find((s) => s.slug === serviceSlug || s.id === serviceSlug);
    if (!service) {
      throw new Error(`Servicio de cotización "${serviceSlug}" no encontrado.`);
    }

    const vars = await getQuotingVars();
    const { values, missingRequired } = coerceAnswersDetailed(service, answers);
    if (missingRequired.length > 0) {
      throw new Error("Completa los campos obligatorios: " + missingRequired.map((field) => field.label).join(", "));
    }
    const result = computeQuote(service, values, quantity, vars);

    // Si el servicio está configurado como 'final', se oculta el desglose detallado de costos
    const isBreakdown = service.price_display === "breakdown";

    return {
      service_id: service.id,
      service_name: service.name,
      total_cop: result.total_cop,
      unit_price_cop: result.unit_price_cop,
      quantity: result.quantity,
      requires_approval: result.requires_approval,
      answers: result.answers,
      lines: isBreakdown ? result.lines : [],
      price_display: service.price_display || "final",
    };
  });
