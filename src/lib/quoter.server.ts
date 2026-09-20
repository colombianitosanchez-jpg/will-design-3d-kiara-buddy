// Lectura del cotizador desde el servidor (Kiara y server functions).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  normalizeField,
  normalizeService,
  type QuoterService,
  type QuoterVars,
} from "@/lib/quoter-core";

const DEFAULT_VARS: QuoterVars = {
  fdm_gram_cost: 80,
  resin_ml_cost: 150,
  machine_hour_rate: 2000,
  labor_hour_rate: 15000,
  default_margin: 1.5,
  failure_rate_percentage: 15,
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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

/** Variables globales del cotizador leídas en el servidor. */
export async function getQuotingVars(): Promise<QuoterVars> {
  const sb = publicClient();
  const { data } = await sb
    .from("admin_settings")
    .select("id, quoting_vars")
    .limit(1)
    .maybeSingle();
  const raw = ((data as { quoting_vars?: unknown } | null)?.quoting_vars ?? {}) as Record<
    string,
    unknown
  >;
  const num = (k: keyof QuoterVars) => {
    const n = Number(raw[k]);
    return Number.isFinite(n) ? n : DEFAULT_VARS[k];
  };
  return {
    fdm_gram_cost: num("fdm_gram_cost"),
    resin_ml_cost: num("resin_ml_cost"),
    machine_hour_rate: num("machine_hour_rate"),
    labor_hour_rate: num("labor_hour_rate"),
    default_margin: num("default_margin"),
    failure_rate_percentage: num("failure_rate_percentage"),
  };
}
