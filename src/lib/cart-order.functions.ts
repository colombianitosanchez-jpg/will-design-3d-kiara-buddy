import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(99),
        kind: z.enum(["product", "service"]).optional().default("product"),
        service_slug: z.string().trim().max(120).optional(),
        answers: z.record(z.string(), z.string().max(400)).optional(),
      }),
    )
    .min(1)
    .max(40),
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().default(""),
  shipping_address: z.string().trim().min(4).max(300),
  shipping_city: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  payment_method_id: z.string().uuid().nullable().optional().default(null),
});

/** Crea un pedido público con varios productos (carrito) en las tablas orders / order_items. */
export const createCartOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const productItems = data.items.filter((i) => i.kind !== "service");
    const serviceItems = data.items.filter((i) => i.kind === "service" && i.service_slug);

    const ids = [...new Set(productItems.map((i) => i.product_id))].filter((id) =>
      /^[0-9a-f-]{36}$/i.test(id),
    );
    const { data: products, error: pErr } = ids.length
      ? await supabaseAdmin
          .from("products")
          .select("id,name,price_cop,active,quote_only")
          .in("id", ids)
      : { data: [], error: null };
    if (pErr) throw new Error(pErr.message);

    if ((products ?? []).some((p) => p.quote_only)) {
      throw new Error("Hay productos que solo se venden por cotización: escríbenos para cotizarlos");
    }

    const available = new Map(
      (products ?? []).filter((p) => p.active && !p.quote_only).map((p) => [p.id, p] as const),
    );
    const lines: {
      product_id: string | null;
      product_name: string;
      quantity: number;
      unit_price_cop: number;
    }[] = productItems
      .filter((i) => available.has(i.product_id))
      .map((i) => {
        const p = available.get(i.product_id)!;
        return {
          product_id: p.id,
          product_name: p.name,
          quantity: i.quantity,
          unit_price_cop: p.price_cop,
        };
      });

    // Los servicios cotizados se vuelven a calcular en el servidor con las
    // respuestas del cliente: nunca se confía en el precio enviado.
    if (serviceItems.length) {
      const { getQuoterServices, getQuotingVars } = await import("@/lib/quoter.server");
      const { coerceAnswers, computeQuote } = await import("@/lib/quoter-core");
      const [services, vars] = await Promise.all([getQuoterServices(), getQuotingVars()]);
      for (const item of serviceItems) {
        const svc = services.find((s) => s.slug === item.service_slug);
        if (!svc) continue;
        const values = coerceAnswers(svc, item.answers ?? {});
        const quote = computeQuote(svc, values, 1, vars);
        lines.push({
          product_id: null,
          product_name: `Servicio: ${svc.name}`,
          quantity: item.quantity,
          unit_price_cop: Math.round(quote.unit_price_cop),
        });
      }
    }

    if (!lines.length) throw new Error("Los productos del carrito ya no están disponibles");

    const total = lines.reduce((sum, l) => sum + l.unit_price_cop * l.quantity, 0);

    // El método de pago se vuelve a validar en el servidor: debe existir y estar activo.
    let paymentMethod: {
      id: string;
      name: string;
      instructions: string;
      type: string;
      payment_url: string | null;
      allowed_zones: string | null;
    } | null = null;
    if (data.payment_method_id) {
      const { data: pm } = await supabaseAdmin
        .from("payment_methods")
        .select("id, name, instructions, is_active, type, config")
        .eq("id", data.payment_method_id)
        .maybeSingle();
      if (!pm || !pm.is_active) throw new Error("El método de pago ya no está disponible");
      const cfg = (pm.config ?? {}) as { payment_url?: string; allowed_zones?: string };
      paymentMethod = {
        id: pm.id,
        name: pm.name,
        instructions: pm.instructions,
        type: pm.type as string,
        payment_url: cfg.payment_url ?? null,
        allowed_zones: cfg.allowed_zones ?? null,
      };
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        payment_method_id: paymentMethod?.id ?? null,
        payment_method_name: paymentMethod?.name ?? null,
        payment_status: "esperando_pago",
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city || null,
        notes: data.notes ? `Pedido web (carrito): ${data.notes}` : "Pedido web desde el carrito",
        total_cop: total,
        status: "pendiente",
      })
      .select("id, public_token")
      .single();
    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    return {
      ok: true as const,
      order_id: order.id,
      total_cop: total,
      public_token: order.public_token as string,
      payment_instructions: paymentMethod?.instructions ?? "",
      payment_method_name: paymentMethod?.name ?? null,
      payment_method_type: paymentMethod?.type ?? null,
      payment_url: paymentMethod?.payment_url ?? null,
      allowed_zones: paymentMethod?.allowed_zones ?? null,
    };
  });
