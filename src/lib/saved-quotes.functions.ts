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
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { parseLineKey } = await import("@/lib/payment-rules");
    const { parseVariants } = await import("@/lib/product-variants");
    const { getQuoterServices, getQuotingVars } = await import("@/lib/quoter.server");
    const { coerceAnswers, computeQuote } = await import("@/lib/quoter-core");

    const productItems = data.items.filter((item) => item.kind !== "service");
    const serviceItems = data.items.filter((item) => item.kind === "service");
    const validServiceItems = serviceItems.filter((item) => Boolean(item.service_slug));
    if (validServiceItems.length !== serviceItems.length) {
      throw new Error("Hay un servicio sin identificador válido. Vuelve a agregarlo al carrito.");
    }

    const ids = [...new Set(productItems.map((item) => parseLineKey(item.product_id).productId))].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    const { data: products, error: productsError } = ids.length
      ? await sb.from("products").select("id,name,slug,price_cop,active,quote_only,variants").in("id", ids)
      : { data: [], error: null };
    if (productsError) throw new Error(productsError.message);
    const available = new Map((products ?? []).filter((product) => product.active && !product.quote_only).map((product) => [product.id, product] as const));

    const normalizedProducts = productItems.map((item) => {
      const { productId, variantId } = parseLineKey(item.product_id);
      const product = available.get(productId);
      if (!product) throw new Error("Un producto ya no está disponible. Actualiza tu carrito.");
      const variant = variantId ? parseVariants(product.variants).find((candidate) => candidate.id === variantId && candidate.is_active) ?? null : null;
      if (variantId && !variant) throw new Error("Una variante ya no está disponible. Actualiza tu carrito.");
      return { ...item, name: variant ? `${product.name} — ${variant.name}` : product.name, slug: product.slug ?? item.slug, price_cop: variant?.price_cop ?? product.price_cop, kind: "product" as const };
    });

    let normalizedServices: SavedQuoteItem[] = [];
    if (validServiceItems.length) {
      const [services, vars] = await Promise.all([getQuoterServices(), getQuotingVars()]);
      normalizedServices = validServiceItems.map((item) => {
        const service = services.find((candidate) => candidate.slug === item.service_slug);
        if (!service) throw new Error("Un servicio ya no está disponible. Actualiza tu carrito.");
        const answers = coerceAnswers(service, item.answers ?? {});
        const quote = computeQuote(service, answers, item.quantity, vars);
        return {
          ...item,
          name: `Servicio: ${service.name}`,
          slug: service.slug,
          price_cop: Math.round(quote.unit_price_cop),
          quantity: quote.quantity,
          kind: "service" as const,
          service_slug: service.slug,
          answers,
          detail: quote.answers.map((answer) => `${answer.label}: ${answer.value}`).join(" · ").slice(0, 600),
        };
      });
    }

    const normalizedItems: SavedQuoteItem[] = [...normalizedProducts, ...normalizedServices];
    const total = normalizedItems.reduce((sum, item) => sum + item.price_cop * item.quantity, 0);
    const { data: row, error } = await sb
      .from("saved_quotes")
      .insert({ items: normalizedItems, total_price: total } as never)
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
