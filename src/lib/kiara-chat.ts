// Kiara chat service — habla con la ruta de servidor /api/kiara, que enruta la
// petición a los proveedores de IA configurados en el Panel (cascada por prioridad).

import { supabase } from "@/integrations/supabase/client";

export type ChatRole = "user" | "assistant";
export type KiaraServiceQuoteData = {
  service_slug: string;
  project_name: string;
  answers: { label: string; value: string }[];
  lines: { label: string; detail: string; amount: number }[];
  quantity: number;
  unit_price_cop: number;
  total_cop: number;
  total_formatted: string;
};
export type KiaraOrderData = {
  order_id: string;
  total_cop: number;
  customer_name?: string;
  items: { product_name: string; quantity: number; unit_price_cop: number }[];
};
export type KiaraProductsData = {
  query: string;
  items: {
    name: string;
    slug: string;
    price_cop: number;
    brand: string | null;
    category: string | null;
    short: string;
    image_url: string | null;
    in_stock: boolean;
    url: string;
    variants_summary?: string;
  }[];
};
export type KiaraTool =
  | { name: "quote_service"; data: KiaraServiceQuoteData }
  | { name: "create_order"; data: KiaraOrderData }
  | { name: "search_products"; data: KiaraProductsData };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  tool?: KiaraTool;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createMessage(role: ChatRole, content: string, id?: string): ChatMessage {
  return { id: id ?? uid(), role, content, createdAt: 0 };
}

/**
 * Envía el historial y va entregando el texto por partes (streaming).
 * Devuelve el texto completo al terminar.
 */
export async function sendChat(
  messages: ChatMessage[],
  onDelta?: (chunk: string) => void,
  onTool?: (tool: KiaraTool) => void,
): Promise<string> {

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const doFetch = () => fetch("/api/kiara", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  let res = await doFetch();
  // 503 transitorio (servidor recargando): reintentar una vez tras una pausa.
  if (res.status === 503) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await doFetch();
  }

  if (!res.ok || !res.body) {
    throw new Error(`Kiara no disponible (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let sawTool = false;


  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          kiara_tool?: KiaraTool;
          choices?: { delta?: { content?: string }; message?: { content?: string } }[];
        };
        if (json.kiara_tool) {
          sawTool = true;
          onTool?.(json.kiara_tool);
          continue;
        }
        const piece =
          json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? "";
        if (piece) {
          full += piece;
          onDelta?.(piece);
        }
      } catch {
        /* fragmento incompleto o comentario del proveedor */
      }
    }
  }

  if (!full.trim() && !sawTool) throw new Error("Respuesta vacía del proveedor");
  return full;

}
