// Kiara chat service — habla con la ruta de servidor /api/kiara, que enruta la
// petición a los proveedores de IA configurados en el Panel (cascada por prioridad).

import { supabase } from "@/integrations/supabase/client";

export type ChatRole = "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createMessage(role: ChatRole, content: string): ChatMessage {
  return { id: uid(), role, content, createdAt: Date.now() };
}

/**
 * Envía el historial y va entregando el texto por partes (streaming).
 * Devuelve el texto completo al terminar.
 */
export async function sendChat(
  messages: ChatMessage[],
  onDelta?: (chunk: string) => void,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch("/api/kiara", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Kiara no disponible (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

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
          choices?: { delta?: { content?: string }; message?: { content?: string } }[];
        };
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

  if (!full.trim()) throw new Error("Respuesta vacía del proveedor");
  return full;
}
