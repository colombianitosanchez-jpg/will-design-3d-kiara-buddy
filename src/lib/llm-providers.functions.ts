import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type LLMProvider = "gemini" | "groq" | "openrouter" | "custom";

export type LlmProviderRow = {
  id: string;
  name: string;
  base_url: string;
  model: string;
  priority: number;
  is_active: boolean;
  has_key: boolean;
  temperature: number;
  system_prompt?: string | null;
  max_tokens?: number | null;
};

const upsertSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(100),
  base_url: z.string().trim().url().refine(isSafeProviderUrl, "URL no permitida: usa https y un dominio público"),
  model: z.string().trim().min(1).max(100),
  api_key: z.string().trim().max(1000).nullable().optional(),
  priority: z.number().int().min(1).max(99).optional().default(1),
  is_active: z.boolean().optional().default(true),
  temperature: z.number().min(0).max(2).optional().default(0.2),
  system_prompt: z.string().trim().max(4000).nullable().optional(),
  max_tokens: z.number().int().min(1).max(128000).nullable().optional(),
});

function isSafeProviderUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(".") || h.includes(":")) return false; // no bare hosts / IPv6 literals
  if (/^\d+(\.\d+){3}$/.test(h)) return false; // no IPv4 literals
  if (/(^|\.)(localhost|local|internal|lan|home|corp|intranet)$/.test(h)) return false;
  return true;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: string,
        ) => { maybeSingle: () => Promise<{ data: { role: string; is_active: boolean } | null }> };
      };
    };
  };
  const { data } = await supabase
    .from("user_roles")
    .select("role, is_active")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data || !data.is_active || (data.role !== "admin" && data.role !== "super_admin")) {
    throw new Error("Acceso denegado: Se requieren permisos de administrador");
  }
}

export const listLlmProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("llm_providers")
      .select("id, name, base_url, model, priority, is_active, api_key, temperature, system_prompt, max_tokens")
      .order("priority", { ascending: true });

    if (error) return [] as LlmProviderRow[];

    return (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      base_url: p.base_url,
      model: p.model,
      priority: p.priority,
      is_active: p.is_active,
      has_key: Boolean(p.api_key),
      temperature: Number(p.temperature ?? 0.2),
      system_prompt: p.system_prompt,
      max_tokens: p.max_tokens,
    })) as LlmProviderRow[];
  });

export const saveLlmProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => upsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      name: data.name,
      base_url: data.base_url,
      model: data.model,
      priority: data.priority,
      is_active: data.is_active,
      temperature: data.temperature,
      system_prompt: data.system_prompt ?? null,
      max_tokens: data.max_tokens ?? null,
      ...(data.api_key ? { api_key: data.api_key } : {}),
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("llm_providers").update(payload as any).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("llm_providers")
      .insert(payload as any)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteLlmProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("llm_providers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setLlmProviderActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("llm_providers")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderLlmProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ ids: z.array(z.string().uuid()) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const [idx, id] of data.ids.entries()) {
      await supabaseAdmin.from("llm_providers").update({ priority: idx + 1 }).eq("id", id);
    }
    return { ok: true };
  });

export const testLlmProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prov, error } = await supabaseAdmin
      .from("llm_providers")
      .select("base_url, model, api_key")
      .eq("id", data.id)
      .single();

    if (error || !prov) throw new Error("Proveedor no encontrado");
    if (!isSafeProviderUrl(prov.base_url)) {
      return { ok: false, ms: 0, message: "URL no permitida: usa https y un dominio público" };
    }

    const start = Date.now();
    try {
      const url = `${prov.base_url.replace(/\/+$/, "")}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        redirect: "manual",
        headers: {
          "Content-Type": "application/json",
          ...(prov.api_key ? { Authorization: `Bearer ${prov.api_key}` } : {}),
        },
        body: JSON.stringify({
          model: prov.model,
          messages: [{ role: "user", content: "Ping" }],
          max_tokens: 5,
        }),
      });

      const elapsed = Date.now() - start;
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, ms: elapsed, message: `HTTP ${res.status}: ${text.slice(0, 150)}` };
      }

      return { ok: true, ms: elapsed, message: "Conexión exitosa" };
    } catch (e) {
      return { ok: false, ms: Date.now() - start, message: (e as Error).message };
    }
  });
