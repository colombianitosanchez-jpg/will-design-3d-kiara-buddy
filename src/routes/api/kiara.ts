import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .min(1)
    .max(30),
});

type Provider = {
  id: string;
  name: string;
  base_url: string;
  model: string;
  api_key: string | null;
};

/** Códigos que deben provocar el salto al siguiente proveedor de la cascada. */
function shouldFallback(status: number) {
  return status === 429 || status >= 500 || status === 401 || status === 403 || status === 400 || status === 404;
}


export const Route = createFileRoute("/api/kiara")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Solicitud inválida" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { resolveAuthBoundary, buildKiaraSystemPrompt } = await import(
          "@/lib/kiara-context.server"
        );

        // ── Firewall: solo un JWT válido con rol admin/staff activa el modo interno ──
        const { isInternalTeam } = await resolveAuthBoundary(
          request.headers.get("authorization"),
        );

        const { data: contentRows } = await supabaseAdmin
          .from("site_content")
          .select("key, value")
          .in("key", ["kiara_prompt_public", "kiara_prompt_internal"]);
        const content: Record<string, string> = {};
        (contentRows ?? []).forEach((r) => (content[r.key] = r.value));

        // Dos caminos aislados: el modo público nunca consulta pedidos, clientes ni costos.
        const { KIARA_TOOLS, TOOL_INSTRUCTIONS, interceptToolStream } = await import(
          "@/lib/kiara-tools.server"
        );

        // Dos caminos aislados: el modo público nunca consulta pedidos, clientes ni costos.
        const basePrompt = await buildKiaraSystemPrompt(isInternalTeam, {
          publicPrompt: content.kiara_prompt_public,
          internalPrompt: content.kiara_prompt_internal,
        });
        const systemPrompt = basePrompt + TOOL_INSTRUCTIONS;





        const { data: providers } = await supabaseAdmin
          .from("llm_providers")
          .select("id, name, base_url, model, api_key")
          .eq("is_active", true)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: true });

        const list = (providers ?? []) as Provider[];
        if (list.length === 0) {
          return Response.json(
            { error: "Sin proveedores de IA configurados" },
            { status: 503 },
          );
        }

        const payloadMessages = [
          { role: "system", content: systemPrompt },
          ...parsed.messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const failures: string[] = [];

        for (const p of list) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 25_000);
          const endpoint = `${p.base_url.replace(/\/+$/, "")}/chat/completions`;
          const authHeaders = {
            "Content-Type": "application/json",
            ...(p.api_key ? { Authorization: `Bearer ${p.api_key}` } : {}),
          };
          try {
            const upstream = await fetch(endpoint, {
              method: "POST",
              signal: controller.signal,
              headers: authHeaders,
              body: JSON.stringify({
                model: p.model,
                messages: payloadMessages,
                stream: true,
                temperature: 0.2,
                tools: KIARA_TOOLS,
                tool_choice: "auto",
              }),
            });

            if (!upstream.ok || !upstream.body) {
              const detail = upstream.ok ? "sin cuerpo" : `HTTP ${upstream.status}`;
              failures.push(`${p.name}: ${detail}`);
              console.error(`[kiara] proveedor "${p.name}" falló (${detail}), pasando al siguiente`);
              clearTimeout(timer);
              if (!upstream.ok && !shouldFallback(upstream.status)) continue;
              continue;
            }

            // El primero que responde gana: se reenvía su stream, se ejecutan las
            // herramientas y el resultado se devuelve al modelo (segunda pasada)
            // para que redacte con las cifras exactas del motor de precios.
            const stream = interceptToolStream(upstream.body, {
              onFinish: () => clearTimeout(timer),
              followUp: async (call, resultJson) => {
                const res = await fetch(endpoint, {
                  method: "POST",
                  headers: authHeaders,
                  body: JSON.stringify({
                    model: p.model,
                    stream: true,
                    temperature: 0.2,
                    messages: [
                      ...payloadMessages,
                      {
                        role: "assistant",
                        content: "",
                        tool_calls: [
                          {
                            id: call.id,
                            type: "function",
                            function: { name: call.name, arguments: call.args },
                          },
                        ],
                      },
                      { role: "tool", tool_call_id: call.id, name: call.name, content: resultJson },
                    ],
                  }),
                });
                if (!res.ok || !res.body) {
                  console.error(`[kiara] 2a pasada falló en ${p.name}: HTTP ${res.status} ${await res.text().catch(() => "")}`);
                  return null;
                }
                return res.body;
              },
            });


            return new Response(stream, {
              status: 200,
              headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Kiara-Provider": p.name,
              },
            });

          } catch (e) {
            clearTimeout(timer);
            const msg = (e as Error).name === "AbortError" ? "timeout" : (e as Error).message;
            failures.push(`${p.name}: ${msg}`);
            console.error(`[kiara] proveedor "${p.name}" error de red (${msg}), pasando al siguiente`);
          }
        }

        console.error(`[kiara] todos los proveedores fallaron: ${failures.join(" | ")}`);
        return Response.json(
          { error: "Ningún proveedor de IA disponible" },
          { status: 503 },
        );
      },
    },
  },
});
