// Kiara agéntica — definición y ejecución de herramientas (function calling).
// Server-only: nunca llega al bundle del cliente.

import { computeQuote, coerceAnswersDetailed, formatCOP } from "@/lib/quoter-core";
import { getQuoterServices, getQuotingVars } from "@/lib/quoter.server";
import { parseVariants } from "@/lib/product-variants";
import { formatOrderCode } from "@/lib/notification-templates";


export const KIARA_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "quote_service",
      description:
        "Calcula el precio oficial de cualquier servicio del cotizador (impresión FDM o resina, gran formato, diseño, escaneo, post-procesado, cursos, insumos) usando las reglas configuradas en el panel. Es la única forma válida de dar precios: nunca los inventes.",
      parameters: {
        type: "object",
        properties: {
          service_slug: {
            type: "string",
            description:
              "Slug o nombre del servicio del cotizador, por ejemplo impresion-fdm o diseno-3d.",
          },
          answers: {
            type: "object",
            description:
              "Respuestas por clave o etiqueta de la pregunta, por ejemplo {\"peso_gramos\": 120, \"material\": \"PETG\", \"urgente\": \"si\"}.",
          },
          quantity: { type: "number", description: "Cantidad de unidades" },
        },
        required: ["service_slug"],
      },
    },
  },

  {
    type: "function" as const,
    function: {
      name: "search_products",
      description:
        "Busca productos reales del catálogo (impresoras 3D, filamentos, resinas, repuestos, insumos) para recomendarlos con su precio y su enlace de compra. Úsala SIEMPRE que el cliente pida, compare o pregunte por un producto: la respuesta muestra tarjetas con botón de compra.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Texto de búsqueda: nombre, marca, categoría o tipo (por ejemplo impresora, PLA, resina).",
          },
          max_price_cop: { type: "number", description: "Precio máximo en COP si el cliente da presupuesto" },
        },
        required: ["query"],
      },
    },
  },

  {
    type: "function" as const,
    function: {
      name: "create_order",
      description:
        "Crea un pedido pendiente en el sistema. Úsala solo cuando ya tengas nombre, correo, teléfono y dirección del cliente, y el detalle de lo que quiere.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string" },
          customer_email: { type: "string" },
          customer_phone: { type: "string" },
          shipping_address: { type: "string" },
          shipping_city: { type: "string" },
          notes: { type: "string" },
          items: {
            type: "array",
            description:
              "Ítems del pedido. Los precios NO se envían: el servidor los toma del catálogo o del cotizador.",
            items: {
              type: "object",
              properties: {
                product_slug: {
                  type: "string",
                  description:
                    "Slug del producto del catálogo obtenido con search_products, si el ítem es un producto.",
                },
                product_name: { type: "string" },
                quantity: { type: "number" },
              },
              required: ["product_name", "quantity"],
            },
          },
        },
        required: ["customer_name", "customer_email", "shipping_address", "items"],
      },
    },
  },
];

export const TOOL_INSTRUCTIONS = `\n\nHERRAMIENTAS (function calling):
- quote_service es la ÚNICA forma válida de dar un precio. Nunca calcules, estimes ni inventes cifras.
- Antes de llamar a quote_service debes tener: el slug exacto de un servicio de la lista y TODOS los datos numéricos que ese servicio pide (por ejemplo gramos, altura, horas). Si falta alguno, NO llames la herramienta: pregunta en una sola frase por los datos que faltan.
- Usa las claves exactas de cada pregunta (por ejemplo {"peso_gramos": 120, "material": "PLA"}). No rellenes campos que el cliente no mencionó.
- search_products es la ÚNICA forma válida de recomendar productos. Nunca listes productos de memoria ni escribas enlaces a mano: llama la herramienta y luego resume en 1-2 frases; las tarjetas con precio y botón "Comprar" aparecen automáticamente.
- Llama a create_order solo cuando tengas nombre, correo, dirección y el detalle del pedido confirmado por el usuario.
- Cuando recibas el resultado de una herramienta, resume SOLO esas cifras en 1-2 frases; la tarjeta con el desglose se muestra automáticamente. No repitas ni modifiques los números.`;

type ProductRow = {
  name: string;
  slug: string;
  price_cop: number | null;
  short: string | null;
  stock: number | null;
  image_url: string | null;
  variants?: unknown;
  categories?: { name?: string } | null;
  brands?: { name?: string } | null;
};

export type ToolOutcome = { text: string; data: unknown; result: unknown };

function money(n: number) {
  return (Number(n) || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function runKiaraTool(name: string, rawArgs: string): Promise<ToolOutcome> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(rawArgs || "{}") as Record<string, unknown>;
  } catch {
    args = {};
  }

  if (name === "quote_service" || name === "generate_quote") {
    const services = await getQuoterServices();
    if (services.length === 0)
      return {
        text: "Aún no tengo servicios configurados para cotizar.",
        data: null,
        result: { error: "sin_servicios" },
      };

    const wanted = slugify(String(args.service_slug ?? ""));
    // Sin coincidencia clara NO se cotiza a ciegas: se pregunta.
    const service =
      services.find((s) => s.slug === wanted) ??
      services.find((s) => slugify(s.name) === wanted) ??
      (wanted.length >= 4
        ? services.find((s) => s.slug.includes(wanted) || slugify(s.name).includes(wanted))
        : undefined);

    if (!service) {
      const opciones = services.map((s) => `${s.name} (${s.slug})`).join(", ");
      return {
        text: `¿Cuál de estos servicios necesitas? ${opciones}`,
        data: null,
        result: { error: "servicio_no_encontrado", servicios_disponibles: opciones },
      };
    }

    const rawAnswers =
      args.answers && typeof args.answers === "object"
        ? (args.answers as Record<string, unknown>)
        : (args as Record<string, unknown>);
    const { values, missingRequired } = coerceAnswersDetailed(service, rawAnswers);

    if (missingRequired.length > 0) {
      const faltan = missingRequired
        .map((f) => `${f.label}${f.unit ? ` en ${f.unit}` : ""} (clave ${f.key})`)
        .join(", ");
      return {
        text: `Para cotizar ${service.name} necesito: ${faltan}.`,
        data: null,
        result: { error: "datos_faltantes", servicio: service.slug, faltan },
      };
    }

    const vars = await getQuotingVars();
    const quote = computeQuote(service, values, Number(args.quantity) || 1, vars as any);
    const isBreakdown = service.price_display === "breakdown";
    const data = {
      service_slug: service.slug,
      project_name: service.name,
      answers: quote.answers,
      lines: isBreakdown ? quote.lines : [],
      quantity: quote.quantity,
      unit_price_cop: quote.unit_price_cop,
      total_cop: quote.total_cop,
      total_formatted: formatCOP(quote.total_cop),
    };

    return {
      text: `Listo 🐾 ${service.name}: cotización estimada de ${money(quote.total_cop)}.`,
      data,
      result: data,
    };
  }




  if (name === "search_products") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = String(args.query ?? "").trim().slice(0, 80);
    const maxPrice = Number(args.max_price_cop);

    let builder = supabaseAdmin
      .from("products")
      .select("name, slug, price_cop, short, stock, image_url, variants, categories(name), brands(name)")
      .eq("active", true);
    if (Number.isFinite(maxPrice) && maxPrice > 0) builder = builder.lte("price_cop", Math.round(maxPrice));

    const { data: all } = await builder.order("featured", { ascending: false }).limit(200);
    const rows = (all ?? []) as ProductRow[];

    const terms = slugify(q).split("-").filter((t) => t.length >= 3);
    const score = (p: ProductRow) => {
      const activeVars = parseVariants(p.variants)
        .filter((v) => v.is_active !== false && v.name.trim())
        .map((v) => v.name.trim());
      const hay = slugify(
        [p.name, p.short, p.categories?.name, p.brands?.name, ...activeVars].filter(Boolean).join(" "),
      );
      return terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
    };
    const matched = terms.length
      ? rows
          .map((p) => ({ p, s: score(p) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .map((x) => x.p)
      : rows;

    const items = matched.slice(0, 6).map((p) => {
      const activeVars = parseVariants(p.variants)
        .filter((v) => v.is_active !== false && v.name.trim())
        .map((v) => v.name.trim());
      return {
        name: p.name,
        slug: p.slug,
        price_cop: Number(p.price_cop) || 0,
        brand: p.brands?.name ?? null,
        category: p.categories?.name ?? null,
        short: p.short ?? "",
        image_url: p.image_url ?? null,
        in_stock: (p.stock ?? 0) > 0,
        url: `/tienda/${p.slug}`,
        variants_summary: activeVars.length ? activeVars.join(", ") : undefined,
      };
    });

    if (items.length === 0)
      return {
        text: `No encontré productos que coincidan con "${q}" en el catálogo.`,
        data: null,
        result: { error: "sin_resultados", query: q },
      };

    const data = { query: q, items };
    return {
      text: `Encontré ${items.length} opción(es) para "${q}" 🐾`,
      data,
      result: {
        query: q,
        items: items.map((i) => ({
          name: i.name,
          price_cop: i.price_cop,
          url: i.url,
          in_stock: i.in_stock,
          variants_summary: i.variants_summary,
        })),
      },
    };
  }

  if (name === "create_order") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const requested = Array.isArray(args.items)
      ? (args.items as Record<string, unknown>[]).slice(0, 20).map((it) => ({
          product_slug: it.product_slug ? slugify(String(it.product_slug)) : "",
          product_name: String(it.product_name ?? "Proyecto 3D").slice(0, 200),
          quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
        }))
      : [];
    if (requested.length === 0)
      return {
        text: "Necesito el detalle del pedido antes de crearlo.",
        data: null,
        result: { error: "sin_items" },
      };

    // El precio NUNCA se toma de la llamada del modelo: se lee del catálogo.
    const slugs = [
      ...new Set([
        ...requested.map((r) => r.product_slug).filter(Boolean),
        ...requested.map((r) => slugify(r.product_name)).filter(Boolean),
      ]),
    ];
    const { data: catalog } = slugs.length
      ? await supabaseAdmin
          .from("products")
          .select("id, name, slug, price_cop, active")
          .in("slug", slugs)
      : { data: [] as { id: string; name: string; slug: string; price_cop: number | null; active: boolean }[] };

    const bySlug = new Map(
      (catalog ?? []).filter((p) => p.active).map((p) => [p.slug, p] as const),
    );

    const items = requested.map((r) => {
      const found = bySlug.get(r.product_slug) ?? bySlug.get(slugify(r.product_name));
      return {
        product_id: found?.id ?? null,
        product_name: found?.name ?? r.product_name,
        quantity: r.quantity,
        // Sin producto del catálogo el precio queda en 0 para que el equipo lo confirme.
        unit_price_cop: found ? Math.max(0, Math.round(Number(found.price_cop) || 0)) : 0,
      };
    });

    const total = items.reduce((s, it) => s + it.quantity * it.unit_price_cop, 0);

    const resolvedName = String(args.customer_name ?? "").trim().slice(0, 120) || "Cliente";
    const resolvedEmail = String(args.customer_email ?? "").trim().slice(0, 160);
    const resolvedPhone = args.customer_phone ? String(args.customer_phone).trim().slice(0, 40) : null;
    const resolvedAddress = String(args.shipping_address ?? "").trim().slice(0, 300) || "Por confirmar";
    const resolvedCity = args.shipping_city ? String(args.shipping_city).trim().slice(0, 120) : null;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: resolvedName,
        customer_email: resolvedEmail,
        customer_phone: resolvedPhone,
        shipping_address: resolvedAddress,
        shipping_city: resolvedCity,
        payment_method_name: "Pedido Asistido Kiara IA",
        notes: `Pedido creado por Kiara. ${args.notes ? String(args.notes).slice(0, 800) : ""}`.trim(),
        total_cop: total,
        status: "pendiente" as const,
      })
      .select("id, public_token")
      .single();
    if (error)
      return {
        text: `No pude guardar el pedido: ${error.message}`,
        data: null,
        result: { error: error.message },
      };

    await supabaseAdmin
      .from("order_items")
      .insert(items.map((it) => ({ order_id: order.id, ...it })));

    try {
      const { notifyTelegramNewOrder } = await import("@/lib/telegram.server");
      await notifyTelegramNewOrder({
        orderId: order.id,
        customerName: resolvedName,
        customerPhone: resolvedPhone,
        customerEmail: resolvedEmail || null,
        shippingAddress: resolvedAddress,
        shippingCity: resolvedCity,
        totalCop: total,
        paymentMethodName: "Pedido Asistido Kiara IA",
        items,
        sourceLabel: "Chat Kiara IA",
      });
    } catch (tgErr) {
      console.error("[Kiara create_order] Error notificando Telegram:", tgErr);
    }

    const orderCode = formatOrderCode(order.id);
    const data = {
      order_id: order.id,
      public_token: order.public_token,
      order_code: orderCode,
      total_cop: total,
      items,
      customer_name: resolvedName,
    };
    return {
      text: `¡Pedido ${orderCode} registrado! Queda como pendiente por ${money(total)}.`,
      data,
      result: data,
    };
  }

  return { text: "", data: null, result: { error: "herramienta_desconocida" } };

}

export type ToolFollowUp = (
  call: { id: string; name: string; args: string },
  resultJson: string,
) => Promise<ReadableStream<Uint8Array> | null>;

/**
 * Reenvía el stream del proveedor al cliente, acumulando las llamadas a
 * herramientas. Cuando la llamada termina, ejecuta la herramienta, le devuelve
 * el resultado al modelo (segunda pasada) para que redacte la respuesta con las
 * cifras reales, y emite el frame `kiara_tool` que el widget convierte en tarjeta.
 */
export function interceptToolStream(
  upstream: ReadableStream<Uint8Array>,
  opts: { onFinish?: () => void; followUp?: ToolFollowUp } = {},
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buffer = "";
  let toolName = "";
  let toolArgs = "";
  let toolId = "";
  let sawContent = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      const emit = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      /** Reenvía solo el texto de un stream OpenAI-compatible. */
      const pipeText = async (stream: ReadableStream<Uint8Array>) => {
        const r = stream.getReader();
        let buf = "";
        let got = false;
        while (true) {
          const { done, value } = await r.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const ls = buf.split("\n");
          buf = ls.pop() ?? "";
          for (const raw of ls) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const p = line.slice(5).trim();
            if (!p || p === "[DONE]") continue;
            try {
              const j = JSON.parse(p) as {
                choices?: { delta?: { content?: string }; message?: { content?: string } }[];
              };
              const piece =
                j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content ?? "";
              if (piece) {
                got = true;
                emit({ choices: [{ delta: { content: piece } }] });
              }
            } catch {
              /* fragmento incompleto */
            }
          }
        }
        return got;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              type Delta = {
                content?: string;
                tool_calls?: {
                  id?: string;
                  index?: number;
                  function?: { name?: string; arguments?: string };
                }[];
              };
              const json = JSON.parse(payload) as {
                choices?: { delta?: Delta; message?: Delta }[];
                error?: { code?: string; failed_generation?: string };
              };

              // Algunos modelos (Groq/Llama) emiten la llamada con sintaxis
              // inválida y el proveedor devuelve tool_use_failed. Rescatamos
              // el nombre y los argumentos para no perder la respuesta.
              const failed = json.error?.failed_generation;
              if (failed && !toolName) {
                const m = /<function=([a-zA-Z_][\w]*)\s*(\{[\s\S]*?\})/.exec(failed);
                if (m) {
                  toolName = m[1];
                  toolArgs = m[2];
                }
              }
              const choice = json.choices?.[0];
              const delta = choice?.delta ?? choice?.message ?? {};

              for (const tc of delta.tool_calls ?? []) {
                if (tc.id && !toolId) toolId = tc.id;
                if (tc.function?.name && !toolName) toolName = tc.function.name;
                if (tc.function?.arguments) toolArgs += tc.function.arguments;
              }

              if (delta.content) {
                sawContent = true;
                emit({ choices: [{ delta: { content: delta.content } }] });
              }
            } catch {
              /* ignoramos fragmentos no JSON del proveedor */
            }
          }
        }

        if (toolName) {
          const result = await runKiaraTool(toolName, toolArgs);
          let narrated = false;
          if (opts.followUp) {
            try {
              const stream = await opts.followUp(
                { id: toolId || "call_kiara", name: toolName, args: toolArgs || "{}" },
                JSON.stringify(result.result ?? { ok: true }),
              );
              if (stream) narrated = await pipeText(stream);
            } catch {
              narrated = false;
            }
          }
          if (!narrated && result.text) {
            emit({ choices: [{ delta: { content: (sawContent ? "\n\n" : "") + result.text } }] });
          }
          if (result.data) {
            const cardName = toolName === "generate_quote" ? "quote_service" : toolName;
            emit({ kiara_tool: { name: cardName, data: result.data } });
          }
        }

        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        opts.onFinish?.();
      }
    },

  });
}
