import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type LlmProviderRow = {
  id: string;
  name: string;
  base_url: string;
  model: string;
  priority: number;
  is_active: boolean;
  has_key: boolean;
  temperature: number;
  system_prompt: string;
  max_tokens: number | null;
};

const SAFE_COLUMNS =
  "id, name, base_url, model, priority, is_active, api_key, temperature, system_prompt, max_tokens";

const upsertSchema = z.object({
  id: z.string().uuid().nullable().optional().default(null),
  name: z.string().trim().min(2).max(80),
  base_url: z.string().trim().url().max(400),
  model: z.string().trim().min(1).max(160),
  api_key: z.string().trim().max(400).nullable().optional().default(null),
  priority: z.number().int().min(1).max(99),
  is_active: z.boolean().default(true),
  temperature: z.number().min(0).max(2).default(0.2),
  system_prompt: z.string().trim().max(4000).nullable().optional().default(null),
  max_tokens: z.number().int().min(64).max(32000).nullable().optional().default(null),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: se requiere rol de administrador");
}

/** Lista los proveedores (sin exponer la clave, solo si existe o no). */
export const listLlmProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LlmProviderRow[]> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("llm_providers")
      .select(SAFE_COLUMNS)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      base_url: r.base_url,
      model: r.model,
      priority: r.priority,
      is_active: r.is_active,
      has_key: Boolean(r.api_key && String(r.api_key).length > 0),
      temperature: Number(r.temperature ?? 0.2),
      system_prompt: r.system_prompt ?? "",
      max_tokens: r.max_tokens ?? null,
    }));
  });

/** Crea o actualiza un proveedor. Si api_key viene vacío/nulo en una edición, se conserva la clave guardada. */
export const saveLlmProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const base = {
      name: data.name,
      base_url: data.base_url.replace(/\/+$/, ""),
      model: data.model,
      priority: data.priority,
      is_active: data.is_active,
      temperature: data.temperature,
      system_prompt: data.system_prompt || null,
      max_tokens: data.max_tokens ?? null,
    };

    if (data.id) {
      const patch = { ...base, ...(data.api_key ? { api_key: data.api_key } : {}) };
      const { error } = await supabaseAdmin.from("llm_providers").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    const { data: row, error } = await supabaseAdmin
      .from("llm_providers")
      .insert({ ...base, api_key: data.api_key || null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteLlmProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("llm_providers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setLlmProviderActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("llm_providers")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Guarda el nuevo orden de prioridades (array de ids en el orden deseado). */
export const reorderLlmProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await supabaseAdmin
        .from("llm_providers")
        .update({ priority: i + 1 })
        .eq("id", data.ids[i]);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Prueba un proveedor con un mensaje mínimo y devuelve el resultado. */
export const testLlmProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("llm_providers")
      .select("name, base_url, model, api_key")
      .eq("id", data.id)
      .single();
    if (error || !p) throw new Error(error?.message ?? "Proveedor no encontrado");

    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(`${String(p.base_url).replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(p.api_key ? { Authorization: `Bearer ${p.api_key}` } : {}),
        },
        body: JSON.stringify({
          model: p.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 16,
          stream: false,
        }),
      });
      const ms = Date.now() - started;
      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        return { ok: false, status: res.status, ms, message: body || res.statusText };
      }
      return { ok: true, status: res.status, ms, message: "Respondió correctamente" };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        ms: Date.now() - started,
        message: (e as Error).name === "AbortError" ? "Tiempo de espera agotado" : (e as Error).message,
      };
    } finally {
      clearTimeout(timer);
    }
  });
