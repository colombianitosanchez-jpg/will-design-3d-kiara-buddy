// Lectura del cotizador desde el servidor (Kiara y server functions).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeField, normalizeService, type QuoterService, type QuoterVars } from "@/lib/quoter-core";
import { normalizeQuotingVars } from "@/lib/quoting-vars";

function publicClient() {
  const url = process.env["SUPABASE_URL"] || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Servicios activos del cotizador con sus preguntas, para uso en el servidor. */
export async function getQuoterServices(): Promise<QuoterService[]> {
  const sb = publicClient();
  if (!sb) return [];
  const [svc, fld] = await Promise.all([
    sb.from("quoter_services").select("*").eq("is_active", true).order("sort_order"),
    sb.from("quoter_fields").select("*").eq("is_active", true).order("sort_order"),
  ]);
  if (svc.error) throw new Error(svc.error.message);
  if (fld.error) throw new Error(fld.error.message);
  const fields = (fld.data ?? []).map((r) => normalizeField(r as Record<string, unknown>));
  return (svc.data ?? []).map((r) => normalizeService(r as Record<string, unknown>, fields));
}

/** Variables globales del cotizador leídas en el servidor. */
export async function getQuotingVars(): Promise<QuoterVars> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("admin_settings").select("id, quoting_vars").limit(1).maybeSingle();
  const raw = ((data as { quoting_vars?: unknown } | null)?.quoting_vars ?? {}) as Record<string, unknown>;
  return normalizeQuotingVars(raw) as QuoterVars;
}
