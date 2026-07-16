// Kiara chat service — structured so you can swap the simulated reply for a
// real LLM/webhook without changing the widget.
//
// To connect a real backend, set VITE_KIARA_CHAT_ENDPOINT to an HTTPS URL that
// accepts POST { messages: {role, content}[] } and returns { reply: string }.

export type ChatRole = "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

const ENDPOINT =
  (import.meta.env.VITE_KIARA_CHAT_ENDPOINT as string | undefined)?.trim() || "";

const SIMULATED_REPLIES = [
  "¡Guau! Estoy buscando esa información para ti… 🐾",
  "¡Buena pregunta! Mi humano Will te confirma los detalles por WhatsApp en unos minutos.",
  "Puedo ayudarte con cotizaciones de impresión 3D, filamentos y servicios. ¿Qué necesitas?",
  "Tenemos impresión de gran formato (¡hasta 50x50 cm o más!). ¿Te comparto el catálogo?",
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createMessage(role: ChatRole, content: string): ChatMessage {
  return { id: uid(), role, content, createdAt: Date.now() };
}

export async function sendChat(messages: ChatMessage[]): Promise<string> {
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Chat endpoint error: ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (!data.reply) throw new Error("Respuesta vacía del servidor");
    return data.reply;
  }
  // Simulated fallback
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  return SIMULATED_REPLIES[Math.floor(Math.random() * SIMULATED_REPLIES.length)];
}
