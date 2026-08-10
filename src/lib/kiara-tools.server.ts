// Kiara agéntica — definición y ejecución de herramientas (function calling).
// Server-only: nunca llega al bundle del cliente.

import { computeQuote, coerceAnswersDetailed, formatCOP } from "@/lib/quoter-core";
import { getQuoterServices } from "@/lib/quoter.server";


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
            description: "Ítems del pedido",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                quantity: { type: "number" },
                unit_price_cop: { type: "number" },
              },
              required: ["product_name", "quantity", "unit_price_cop"],
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
- Llama a create_order solo cuando tengas nombre, correo, dirección y el detalle del pedido confirmado por el usuario.
- Cuando recibas el resultado de una herramienta, resume SOLO esas cifras en 1-2 frases; la tarjeta con el desglose se muestra automáticamente. No repitas ni modifiques los números.`;

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

    const quote = computeQuote(service, values, Number(args.quantity) || 1);
    const data = {
      service_slug: service.slug,
      project_name: service.name,
      answers: quote.answers,
      lines: quote.lines,
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




  if (name === "create_order") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items = Array.isArray(args.items)
      ? (args.items as Record<string, unknown>[]).slice(0, 20).map((it) => ({
          product_name: String(it.product_name ?? "Proyecto 3D").slice(0, 200),
          quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
          unit_price_cop: Math.max(0, Math.round(Number(it.unit_price_cop) || 0)),
        }))
      : [];
    if (items.length === 0)
      return {
        text: "Necesito el detalle del pedido antes de crearlo.",
        data: null,
        result: { error: "sin_items" },
      };

    const total = items.reduce((s, it) => s + it.quantity * it.unit_price_cop, 0);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: String(args.customer_name ?? "").slice(0, 120) || "Cliente",
        customer_email: String(args.customer_email ?? "").slice(0, 160),
        customer_phone: args.customer_phone ? String(args.customer_phone).slice(0, 40) : null,
        shipping_address: String(args.shipping_address ?? "").slice(0, 300) || "Por confirmar",
        shipping_city: args.shipping_city ? String(args.shipping_city).slice(0, 120) : null,
        notes: `Pedido creado por Kiara. ${args.notes ? String(args.notes).slice(0, 800) : ""}`.trim(),
        total_cop: total,
        status: "pendiente" as const,
      })
      .select("id")
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

    const data = {
      order_id: order.id,
      total_cop: total,
      items,
      customer_name: args.customer_name,
    };
    return {
      text: `¡Pedido registrado! Queda como pendiente por ${money(total)}.`,
      data,
      result: data,
    };
  }

  return { text: "", data: null, result: { error: "herramienta_desconocida" } };

}

/**
 * Reenvía el stream del proveedor al cliente, acumulando las llamadas a
 * herramientas. Cuando la llamada termina, ejecuta la herramienta y emite un
 * frame `kiara_tool` que el widget convierte en tarjeta interactiva.
 */
export function interceptToolStream(
  upstream: ReadableStream<Uint8Array>,
  onFinish?: () => void,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buffer = "";
  let toolName = "";
  let toolArgs = "";
  let sawContent = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      const emit = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

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
              const json = JSON.parse(payload) as {
                choices?: {
                  delta?: {
                    content?: string;
                    tool_calls?: { function?: { name?: string; arguments?: string } }[];
                  };
                  message?: {
                    content?: string;
                    tool_calls?: { function?: { name?: string; arguments?: string } }[];
                  };
                }[];
              };
              const choice = json.choices?.[0];
              const delta = choice?.delta ?? choice?.message ?? {};
              const tc = delta.tool_calls?.[0];
              if (tc) {
                if (tc.function?.name) toolName = toolName || tc.function.name;
                if (tc.function?.arguments) toolArgs += tc.function.arguments;
                continue;
              }
              if (delta.content) sawContent = true;
              controller.enqueue(enc.encode(`data: ${payload}\n\n`));
            } catch {
              controller.enqueue(enc.encode(`${line}\n\n`));
            }
          }
        }

        if (toolName) {
          const result = await runKiaraTool(toolName, toolArgs);
          if (result.text) {
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
        onFinish?.();
      }
    },
  });
}
