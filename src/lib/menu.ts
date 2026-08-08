import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MenuItemRow = {
  id: string;
  parent_id: string | null;
  label: string;
  slug: string;
  link_type: string | null;
  link_value: string | null;
  display_order: number;
};

export type MenuNodeData = MenuItemRow & { children: MenuNodeData[] };

export async function fetchMenuItems(): Promise<MenuNodeData[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,parent_id,label,slug,link_type,link_value,display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return buildTree((data ?? []) as MenuItemRow[]);
}

export function buildTree(rows: MenuItemRow[]): MenuNodeData[] {
  const map = new Map<string, MenuNodeData>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));

  /** True si `ancestorId` es alcanzable subiendo desde `id` (detecta ciclos en datos). */
  const createsCycle = (id: string, parentId: string) => {
    const seen = new Set<string>([id]);
    let cur: string | null = parentId;
    while (cur) {
      if (seen.has(cur)) return true;
      seen.add(cur);
      cur = map.get(cur)?.parent_id ?? null;
    }
    return false;
  };

  const roots: MenuNodeData[] = [];
  map.forEach((node) => {
    const pid = node.parent_id;
    if (pid && map.has(pid) && !createsCycle(node.id, pid)) {
      map.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sort = (list: MenuNodeData[], depth = 0) => {
    list.sort((a, b) => a.display_order - b.display_order);
    if (depth > 20) return;
    list.forEach((n) => sort(n.children, depth + 1));
  };
  sort(roots);
  return roots;
}


/** Builds the final href from link_type + link_value. Returns null for group-only items. */
export function menuHref(node: MenuNodeData): string | null {
  const v = node.link_value?.trim();
  if (!v) return null;
  switch (node.link_type) {
    case "tienda_categoria":
      return `/tienda?categoria=${encodeURIComponent(v)}`;
    case "tienda_categoria_marca": {
      const [categoria, marca] = v.split("::");
      if (!categoria) return null;
      return marca
        ? `/tienda?categoria=${encodeURIComponent(categoria)}&marca=${encodeURIComponent(marca)}`
        : `/tienda?categoria=${encodeURIComponent(categoria)}`;
    }
    case "servicio_anchor":
      return `/servicios#${v}`;
    case "personalizado":
      return v;
    default:
      return null;
  }
}

export const menuItemsQuery = () =>
  queryOptions({ queryKey: ["menu_items"], queryFn: fetchMenuItems, staleTime: 60_000 });
