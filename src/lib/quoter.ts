// Consultas del Cotizador para el navegador. La matemática vive en quoter-core.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeField, normalizeService, type QuoterService } from "@/lib/quoter-core";

export * from "@/lib/quoter-core";

/** Servicios + campos del cotizador. `includeInactive` solo se usa en el panel. */
export async function fetchQuoterServices(includeInactive = false): Promise<QuoterService[]> {
  const svcQ = supabase.from("quoter_services").select("*").order("sort_order");
  const fldQ = supabase.from("quoter_fields").select("*").order("sort_order");
  const [svc, fld] = await Promise.all([
    includeInactive ? svcQ : svcQ.eq("is_active", true),
    includeInactive ? fldQ : fldQ.eq("is_active", true),
  ]);
  if (svc.error) throw new Error(svc.error.message);
  if (fld.error) throw new Error(fld.error.message);

  const fields = (fld.data ?? []).map((r) => normalizeField(r as Record<string, unknown>));
  return (svc.data ?? []).map((r) => normalizeService(r as Record<string, unknown>, fields));
}

export const quoterServicesQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: ["quoter-services", includeInactive],
    queryFn: () => fetchQuoterServices(includeInactive),
    staleTime: 60_000,
  });
