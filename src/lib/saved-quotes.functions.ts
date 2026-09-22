// Cotizaciones guardadas y compartibles: guardar el carrito y leerlo por enlace.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  kind: z.enum(["product", "service"]).default("product"),
  product_id: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(200).optional().default(""),
  name: z.string().trim().min(1).max(200),
  price_cop: z.number().min(0).max(500_000_000),
  quantity: z.number().int().min(1).max(99),
  image_url: z.string().trim().max(2000).nullable().optional().default(null),
  service_slug: z.string().trim().max(120).optional(),
  detail: z.string().trim().max(600).optional(),
  answers: z.record(z.string(), z.string().max(400)).optional(),
});

export type SavedQuoteItem = z.infer<typeof itemSchema>;

export type SavedQuote = {
  id: string;
  items: SavedQuoteItem[];
  total_price: number;
  created_at: string;
};

const saveSchema = z.object({ items: z.array(itemSchema).min(1).max(40) });

/** Guarda la cotización y devuelve su id (el enlace público). */
export const saveQuote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data }) => {
    const { publicServerClient } = await import("@/lib/supabase-public.server");
    const sb = publicServerClient();
    // El total se recalcula en el servidor a partir de las líneas validadas.
    const total = data.items.reduce((sum, i) => sum + i.price_cop * i.quantity, 0);
    const { data: row, error } = await sb
      .from("saved_quotes")
      .insert({ items: data.items, total_price: total } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as { id: string }).id, total_price: total };
  });

/** Lee una cotización guardada por su id (enlace público). */
export const getSavedQuote = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<SavedQuote | null> => {
    // La lectura ocurre solo en el servidor y exige el id exacto del enlace:
    // el navegador no puede listar ni recorrer las cotizaciones guardadas.
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await sb
      .from("saved_quotes")
      .select("id, items, total_price, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const raw = row as { id: string; items: unknown; total_price: number; created_at: string };
    const items = Array.isArray(raw.items)
      ? raw.items.flatMap((i) => {
          const parsed = itemSchema.safeParse(i);
          return parsed.success ? [parsed.data] : [];
        })
      : [];
    return {
      id: raw.id,
      items,
      total_price: Number(raw.total_price) || 0,
      created_at: raw.created_at,
    };
  });
