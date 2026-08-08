// Lectura server-only de las reglas de precios activas.
import { DEFAULT_RULES, type PricingRules } from "./pricing";

export async function getActivePricingRules(): Promise<PricingRules> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pricing_rules")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return DEFAULT_RULES;

  return {
    id: data.id,
    name: data.name,
    base_price_per_gram_cop: Number(data.base_price_per_gram_cop),
    machine_hour_cop: Number(data.machine_hour_cop),
    setup_fee_cop: Number(data.setup_fee_cop),
    margin_percent: Number(data.margin_percent),
    min_price_cop: Number(data.min_price_cop),
    material_multipliers:
      (data.material_multipliers as Record<string, number>) ?? DEFAULT_RULES.material_multipliers,
    finish_multipliers:
      (data.finish_multipliers as Record<string, number>) ?? DEFAULT_RULES.finish_multipliers,
    is_active: data.is_active,
  };
}
