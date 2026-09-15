import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SidebarOrderRow = { id: string; sidebar_order: string[] };

/** Lee la única fila de ajustes del panel con el orden global del menú. */
export async function fetchSidebarOrder(): Promise<SidebarOrderRow | null> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("id, sidebar_order")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raw = (data as { id: string; sidebar_order: unknown }).sidebar_order;
  const order = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  return { id: (data as { id: string }).id, sidebar_order: order };
}

export const sidebarOrderQuery = () =>
  queryOptions({
    queryKey: ["admin_settings", "sidebar_order"],
    queryFn: fetchSidebarOrder,
    staleTime: 60_000,
  });

/**
 * Ordena los ítems según `order`; los que no estén en la lista van al final
 * conservando su orden original.
 */
export function sortByOrder<T extends { key: string }>(items: T[], order: string[]): T[] {
  const index = new Map(order.map((k, i) => [k, i]));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ai = index.get(a.item.key);
      const bi = index.get(b.item.key);
      if (ai === undefined && bi === undefined) return a.i - b.i;
      if (ai === undefined) return 1;
      if (bi === undefined) return -1;
      return ai - bi;
    })
    .map(({ item }) => item);
}

/** Guarda el orden completo (todas las claves) en la fila de ajustes. */
export async function saveSidebarOrder(rowId: string, order: string[]) {
  const { error } = await supabase
    .from("admin_settings")
    .update({ sidebar_order: order } as never)
    .eq("id", rowId);
  if (error) throw error;
}
