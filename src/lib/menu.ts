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
  const roots: MenuNodeData[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    }
  });
  const sort = (list: MenuNodeData[]) => {
    list.sort((a, b) => a.display_order - b.display_order);
    list.forEach((n) => sort(n.children));
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
