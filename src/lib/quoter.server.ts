// Lectura del cotizador desde el servidor (Kiara y server functions).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeField, normalizeService, type QuoterService } from "@/lib/quoter-core";

function publicClient() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient<Database>(process.env['SUPABASE_URL']!, key, {
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
  const [svc, fld] = await Promise.all([
    sb.from("quoter_services").select("*").eq("is_active", true).order("sort_order"),
    sb.from("quoter_fields").select("*").eq("is_active", true).order("sort_order"),
  ]);
  if (svc.error) throw new Error(svc.error.message);
  if (fld.error) throw new Error(fld.error.message);
  const fields = (fld.data ?? []).map((r) => normalizeField(r as Record<string, unknown>));
  return (svc.data ?? []).map((r) => normalizeService(r as Record<string, unknown>, fields));
}
