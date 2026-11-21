import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  service_id: z.string().uuid().nullable().optional().default(null),
  service_name: z.string().trim().max(160).optional().default(""),
  values: z.record(z.string().max(80), z.string().max(300)).optional(),
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
  .validator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    let trusted = { service_name: data.service_name, quantity: data.quantity, answers: data.answers, estimated_total_cop: data.estimated_total_cop };
    if (data.service_id && data.values) {
      const { getQuoterServices, getQuotingVars } = await import("@/lib/quoter.server");
      const { computeQuote, quoteAnswerErrors } = await import("@/lib/quoter-core");
      const [services, vars] = await Promise.all([getQuoterServices(), getQuotingVars()]);
      const service = services.find((s) => s.id === data.service_id);
      if (!service || service.has_calculator === false) throw new Error("El cotizador ya no está disponible");
      const errors = quoteAnswerErrors(service, data.values);
      if (errors.length) throw new Error(errors[0]);
      const result = computeQuote(service, data.values, data.quantity, vars);
      if (result.total_cop <= 0) throw new Error("El servicio necesita una tarifa configurada");
      trusted = { service_name: service.name, quantity: result.quantity, answers: result.answers, estimated_total_cop: result.total_cop };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        service_id: data.service_id,
        service_name: trusted.service_name,
        answers: trusted.answers,
        quantity: trusted.quantity,
        estimated_total_cop: trusted.estimated_total_cop,
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

    try {
      const { notifyTelegramNewQuote } = await import("@/lib/telegram.server");
      const fallbackDetails: Array<{ label: string; value: string }> = [];
      if (data.design_state) fallbackDetails.push({ label: "Diseño", value: data.design_state });
      if (data.size_label) fallbackDetails.push({ label: "Tamaño", value: data.size_label });
      if (data.material) fallbackDetails.push({ label: "Material", value: data.material });
      if (data.finish) fallbackDetails.push({ label: "Acabado", value: data.finish });
      if (trusted.quantity > 1) {
        fallbackDetails.push({ label: "Cantidad", value: String(trusted.quantity) });
      }
      await notifyTelegramNewQuote({
        quoteId: row.id,
        serviceName: trusted.service_name || data.design_state || "Cotización 3D",
        customerName: data.customer_name,
        customerPhone: data.customer_phone || null,
        customerEmail: data.customer_email,
        totalCop: trusted.estimated_total_cop,
        fileName: data.file_name,
        answers: trusted.answers.length > 0 ? trusted.answers : fallbackDetails,
        notes: data.notes,
      });
    } catch (tgErr) {
      console.error("[Telegram] Error notificando nueva cotización:", tgErr);
    }

    return { ok: true as const, quote_id: row.id };
  });

const ALLOWED_QUOTE_EXT = /\.(stl|obj|3mf|step|stp|iges|igs|fbx|blend|zip|rar|7z|png|jpe?g|webp|gif|pdf|svg|dxf|ai|eps)$/i;

/** Emite una URL de subida firmada de un solo uso para archivos de cotización (sin política INSERT pública). */
export const createQuoteUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ file_name: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const safe = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!ALLOWED_QUOTE_EXT.test(safe)) throw new Error("Tipo de archivo no permitido");
    const path = `cotizaciones/${crypto.randomUUID()}-${safe}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("quote-files")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error("No pudimos preparar la subida del archivo");
    return { path: signed.path, token: signed.token };
  });
