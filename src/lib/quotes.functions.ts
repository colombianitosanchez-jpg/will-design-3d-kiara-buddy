import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeQuote, coerceAnswersDetailed } from "@/lib/quoter-core";
import { getQuoterServices, getQuotingVars } from "@/lib/quoter.server";

const filePathSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" ||
      (value.startsWith("cotizaciones/") && !value.includes("..") && !value.includes("\\")),
    "Ruta de archivo inválida",
  )
  .nullable()
  .optional()
  .default(null);

const answerSchema = z.object({
  label: z.string().trim().max(160),
  value: z.string().trim().max(300),
});

const schema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().default(""),
  service_id: z.string().uuid(),
  service_name: z.string().trim().max(160).optional().default(""),
  answers: z.array(answerSchema).max(60).optional().default([]),
  quantity: z.number().int().min(1).max(10000).optional().default(1),
  estimated_total_cop: z.number().min(0).max(1_000_000_000).optional().default(0),
  design_state: z.string().trim().max(160).default(""),
  size_label: z.string().trim().max(160).default(""),
  length_cm: z.number().positive().max(10000).nullable().optional().default(null),
  width_cm: z.number().positive().max(10000).nullable().optional().default(null),
  height_cm: z.number().positive().max(10000).nullable().optional().default(null),
  material: z.string().trim().max(200).default(""),
  finish: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  file_name: z.string().trim().max(300).nullable().optional().default(null),
  file_path: filePathSchema,
});

/** Guarda una cotización del Cotizador 3D para que el equipo la vea en el Panel → Pedidos. */
export const createQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const [services, vars] = await Promise.all([getQuoterServices(), getQuotingVars()]);
    const service = services.find((candidate) => candidate.id === data.service_id);
    if (!service) {
      throw new Error("Este servicio ya no está disponible. Actualiza la página e inténtalo de nuevo.");
    }

    // El total recibido del navegador nunca es la fuente del precio guardado.
    const rawAnswers: Record<string, unknown> = {};
    for (const answer of data.answers) rawAnswers[answer.label] = answer.value;
    const { values, missingRequired } = coerceAnswersDetailed(service, rawAnswers);
    if (missingRequired.length > 0) {
      throw new Error("Completa los campos requeridos: " + missingRequired.map((field) => field.label).join(", "));
    }
    const calculation = computeQuote(service, values, data.quantity, vars);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        service_id: data.service_id,
        service_name: service.name,
        answers: calculation.answers,
        quantity: calculation.quantity,
        estimated_total_cop: calculation.total_cop,
        design_state: data.design_state,
        size_label: data.size_label,
        length_cm: data.length_cm,
        width_cm: data.width_cm,
        height_cm: data.height_cm,
        material: data.material,
        finish: data.finish,
        notes: data.notes,
        file_name: data.file_name,
        file_path: data.file_path,
        status: "nueva",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return {
      ok: true as const,
      quote_id: row.id,
      service_name: service.name,
      total_cop: calculation.total_cop,
      unit_price_cop: calculation.unit_price_cop,
      quantity: calculation.quantity,
      requires_approval: calculation.requires_approval,
      price_display: service.price_display || "final",
      lines: service.price_display === "breakdown" ? calculation.lines : [],
    };
  });
