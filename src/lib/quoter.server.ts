// Lectura del cotizador desde el servidor (Kiara y server functions).
import { normalizeField, normalizeService, type QuoterService, type QuoterVars } from "@/lib/quoter-core";
import { normalizeQuotingVars } from "@/lib/quoting-vars";

/** Servicios activos del cotizador con sus preguntas, para uso en el servidor. */
export async function getQuoterServices(): Promise<QuoterService[]> {
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
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
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  const { data } = await sb.from("admin_settings").select("id, quoting_vars").limit(1).maybeSingle();
  const raw = ((data as { quoting_vars?: unknown } | null)?.quoting_vars ?? {}) as Record<string, unknown>;
  return normalizeQuotingVars(raw) as QuoterVars;
}
