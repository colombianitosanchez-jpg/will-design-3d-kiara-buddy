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

        // ¿La petición viene de un miembro del equipo autenticado? (no se confía en el cliente)
        let isTeam = false;
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (token) {
          const { data: userData } = await supabaseAdmin.auth.getUser(token);
          const userId = userData?.user?.id;
          if (userId) {
            const { data: roles } = await supabaseAdmin
              .from("user_roles")
              .select("role")
              .eq("user_id", userId);
            isTeam = Boolean(roles && roles.length > 0);
          }
        }

        const { data: contentRows } = await supabaseAdmin
          .from("site_content")
          .select("key, value")
          .in("key", ["kiara_prompt_public", "kiara_prompt_internal"]);
        const content: Record<string, string> = {};
        (contentRows ?? []).forEach((r) => (content[r.key] = r.value));

        const basePrompt = isTeam
          ? content.kiara_prompt_internal?.trim() || DEFAULT_INTERNAL_PROMPT
          : content.kiara_prompt_public?.trim() || DEFAULT_PUBLIC_PROMPT;

        // ── RAG: base de conocimiento según el origen de la conversación ──
        const allowedCategories = isTeam
          ? ["internal_team", "all"]
          : ["public_web", "all"];
        const { data: kbRows } = await supabaseAdmin
          .from("knowledge_base")
          .select("title, content, category")
          .eq("is_active", true)
          .in("category", allowedCategories)
          .order("updated_at", { ascending: false })
          .limit(60);

        let knowledgeBlock = "";
        if (kbRows && kbRows.length > 0) {
          let used = 0;
          const parts: string[] = [];
          for (const r of kbRows) {
            const doc = `### ${r.title}\n${String(r.content ?? "").trim()}`;
            if (used + doc.length > 24_000) break;
            used += doc.length;
            parts.push(doc);
          }
          knowledgeBlock =
            `\n\n[INFORMACIÓN INTERNA DE WILL DESIGN 3D]\n${parts.join("\n\n")}\n[FIN DE LA INFORMACIÓN INTERNA]`;
        }

        const RAG_RULES = `\n\nREGLAS DE USO DEL CONTEXTO:
- Para preguntas técnicas, de inventario, precios internos o procedimientos, usa ÚNICAMENTE la información interna entregada arriba.
- Si la respuesta no está en ese contexto, dilo claramente: "Todavía no tengo ese registro interno" e invita a registrarlo en la Base de Conocimiento del Panel (o a escribir por WhatsApp si es un visitante).
- No inventes datos, precios, plazos ni stock que no aparezcan en el contexto.`;

        const systemPrompt = knowledgeBlock
          ? `${basePrompt}${knowledgeBlock}${RAG_RULES}`
          : `${basePrompt}${RAG_RULES}`;


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
          try {
            const upstream = await fetch(
              `${p.base_url.replace(/\/+$/, "")}/chat/completions`,
              {
                method: "POST",
                signal: controller.signal,
                headers: {
                  "Content-Type": "application/json",
                  ...(p.api_key ? { Authorization: `Bearer ${p.api_key}` } : {}),
                },
                body: JSON.stringify({
                  model: p.model,
                  messages: payloadMessages,
                  stream: true,
                  temperature: 0.7,
                }),
              },
            );

            if (!upstream.ok || !upstream.body) {
              const detail = upstream.ok ? "sin cuerpo" : `HTTP ${upstream.status}`;
              failures.push(`${p.name}: ${detail}`);
              console.error(`[kiara] proveedor "${p.name}" falló (${detail}), pasando al siguiente`);
              clearTimeout(timer);
              if (!upstream.ok && !shouldFallback(upstream.status)) continue;
              continue;
            }

            // El primero que responde gana: se reenvía su stream tal cual.
            const stream = upstream.body.pipeThrough(
              new TransformStream({
                flush() {
                  clearTimeout(timer);
                },
              }),
            );

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
