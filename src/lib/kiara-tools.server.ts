// Kiara agéntica — definición y ejecución de herramientas (function calling).
// Server-only: nunca llega al bundle del cliente.

import { computeQuote, coerceAnswers, formatCOP } from "@/lib/quoter-core";
import { getQuoterServices } from "@/lib/quoter.server";

export const KIARA_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_quoter_services",
      description:
        "Lista los servicios cotizables de Will Design 3D con sus preguntas, unidades y opciones, tal como están configurados en el panel. Úsala antes de cotizar si no sabes qué servicio o qué datos pedir.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
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
              "Slug o nombre del servicio, tal como lo devuelve list_quoter_services (por ejemplo impresion-fdm).",
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

export const TOOL_INSTRUCTIONS = `\n\nHERRAMIENTAS:
- Si el usuario pide un precio o cotización de una impresión, llama a generate_quote (estima gramos y horas a partir de su descripción si no los da). No inventes precios manualmente.
- Llama a create_order solo cuando tengas nombre, correo, dirección y el detalle del pedido confirmado por el usuario.
- Después de una herramienta, comenta el resultado en 1-2 frases cálidas; la tarjeta con el detalle se muestra automáticamente.`;

export type ToolOutcome = { text: string; data: unknown };

function money(n: number) {
  return (Number(n) || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export async function runKiaraTool(name: string, rawArgs: string): Promise<ToolOutcome> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(rawArgs || "{}") as Record<string, unknown>;
  } catch {
    args = {};
  }

  if (name === "generate_quote") {
    const rules = await getActivePricingRules();
    const quote = calcQuote(rules, {
      grams: Number(args.estimated_grams) || 0,
      hours: Number(args.print_time) || 0,
      material: typeof args.material === "string" ? args.material : "PLA",
      finish: typeof args.finish === "string" ? args.finish : "Ninguno",
      quantity: Number(args.quantity) || 1,
    });
    const projectName =
      typeof args.project_name === "string" && args.project_name.trim()
        ? args.project_name.trim()
        : "Tu proyecto 3D";

    return {
      text: `Listo 🐾 Te preparé una cotización estimada de ${money(quote.total_cop)}.`,
      data: { ...quote, project_name: projectName },
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
    if (items.length === 0) return { text: "Necesito el detalle del pedido antes de crearlo.", data: null };

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
    if (error) return { text: `No pude guardar el pedido: ${error.message}`, data: null };

    await supabaseAdmin
      .from("order_items")
      .insert(items.map((it) => ({ order_id: order.id, ...it })));

    return {
      text: `¡Pedido registrado! Queda como pendiente por ${money(total)}.`,
      data: { order_id: order.id, total_cop: total, items, customer_name: args.customer_name },
    };
  }

  return { text: "", data: null };
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
          if (result.data) emit({ kiara_tool: { name: toolName, data: result.data } });
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
