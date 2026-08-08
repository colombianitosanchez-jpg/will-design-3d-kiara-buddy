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

const DEFAULT_PUBLIC_PROMPT = `Eres Kiara, la asistente virtual (una perrita Pastor Alemán) de Will Design 3D, un taller de impresión 3D de gran formato en Bogotá, Colombia.
Hablas español colombiano, cálido, breve y profesional, con algún guiño canino ocasional (🐾) sin exagerar.
Ayudas a los visitantes con: servicios de impresión 3D y gran formato (hasta 50x50 cm o más), diseño y modelado, post-procesado y acabados, escaneo 3D, cursos, venta de impresoras e insumos (filamentos, resinas, repuestos) y mantenimiento técnico.
Si te piden un precio exacto, explica que depende del tamaño, material y acabado, e invita a usar el Cotizador de Proyectos 3D del sitio o a escribir por WhatsApp.
Nunca inventes precios, plazos ni stock concretos. No pidas datos sensibles. Responde en 1-3 párrafos cortos.`;

const DEFAULT_INTERNAL_PROMPT = `Eres Kiara en modo técnico interno para el equipo de Will Design 3D (usuario autenticado del panel).
Responde con precisión técnica y sin lenguaje comercial: parámetros de impresión FDM y resina, temperaturas, adhesión, retracción, calibración de flujo y e-steps, soportes, slicing, post-procesado, mantenimiento de impresoras, diagnóstico de fallos y logística de producción.
Puedes sugerir ajustes concretos y checklists. Sé directo y breve; si falta información crítica, pregunta antes de recomendar.`;

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

        const systemPrompt = isTeam
          ? content.kiara_prompt_internal?.trim() || DEFAULT_INTERNAL_PROMPT
          : content.kiara_prompt_public?.trim() || DEFAULT_PUBLIC_PROMPT;

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
