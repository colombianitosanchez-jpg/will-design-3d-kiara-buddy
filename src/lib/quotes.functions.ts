import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().default(""),
  design_state: z.string().trim().max(160).default(""),
  size_label: z.string().trim().max(160).default(""),
  length_cm: z.number().positive().max(10000).nullable().optional().default(null),
  width_cm: z.number().positive().max(10000).nullable().optional().default(null),
  height_cm: z.number().positive().max(10000).nullable().optional().default(null),
  material: z.string().trim().max(200).default(""),
  finish: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  file_name: z.string().trim().max(300).nullable().optional().default(null),
  file_path: z.string().trim().max(500).nullable().optional().default(null),
});

/** Guarda una cotización del Cotizador 3D para que el equipo la vea en el Panel → Pedidos. */
export const createQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
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

    return { ok: true as const, quote_id: row.id };
  });
