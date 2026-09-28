import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Tipos de destino de un ítem del menú (referencias reales, no texto libre). */
export type MenuTargetKind =
  | "group"
  | "category"
  | "category_brand"
  | "attribute"
  | "service"
  | "page"
  | "url";

export type MenuItemRow = {
  id: string;
  parent_id: string | null;
  label: string;
  slug: string;
  display_order: number;
  target_kind: string | null;
  category_id: string | null;
  brand_id: string | null;
  attribute_value_id: string | null;
  service_anchor: string | null;
  custom_url: string | null;
  site_page: string | null;
  /** Referencias resueltas por el join (solo lectura). */
  category?: { slug: string; name: string } | null;
  brand?: { slug: string | null; name: string } | null;
  value?: { slug: string; label: string; attribute: { slug: string; name: string } | null } | null;
  /** Formato antiguo, se mantiene como respaldo. */
  link_type?: string | null;
  link_value?: string | null;
};

export type MenuNodeData = MenuItemRow & { children: MenuNodeData[] };

export const MENU_SELECT =
  "id,parent_id,label,slug,display_order,target_kind,category_id,brand_id,attribute_value_id," +
  "service_anchor,custom_url,site_page,link_type,link_value," +
  "category:categories(slug,name),brand:brands(slug,name)," +
  "value:attribute_values(slug,label,attribute:attributes(slug,name))";

export const SITE_PAGES = [
  { value: "/", label: "Inicio" },
  { value: "/tienda", label: "Tienda (todo el catálogo)" },
  { value: "/servicios", label: "Servicios" },
  { value: "/galeria", label: "Galería" },
  { value: "/nosotros", label: "Nosotros" },
  { value: "/contacto", label: "Contacto" },
  { value: "/contacto#cotizador", label: "Cotizador de proyectos" },
];

export const SERVICE_ANCHORS = [
  { value: "impresion-3d", label: "Impresión 3D" },
  { value: "modelado-3d", label: "Modelado 3D" },
  { value: "escaneo-3d", label: "Escaneo 3D" },
  { value: "servicio-tecnico", label: "Servicio técnico" },
  { value: "postprocesado", label: "Postprocesado" },
  { value: "cursos-3d-modelado", label: "Curso: Modelado 3D" },
  { value: "cursos-3d-impresion", label: "Curso: Impresión 3D" },
  { value: "cursos-3d-mantenimiento", label: "Curso: Mantenimiento de impresoras" },
];

export async function fetchMenuItems(): Promise<MenuNodeData[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_SELECT)
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return buildTree((data ?? []) as unknown as MenuItemRow[]);
}

export function buildTree(rows: MenuItemRow[]): MenuNodeData[] {
  const map = new Map<string, MenuNodeData>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));

  /** True si `parentId` es alcanzable subiendo desde `id` (detecta ciclos en datos). */
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

function storeHref(params: Record<string, string | undefined>) {
  const qs = Object.entries(params)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return qs ? `/tienda?${qs}` : "/tienda";
}

/**
 * Construye el enlace final desde las referencias reales del ítem.
 * Si el ítem aún no fue migrado, cae al formato antiguo `link_type` + `link_value`.
 */
export function menuHref(node: MenuItemRow): string | null {
  switch (node.target_kind as MenuTargetKind | null) {
    case "group":
      return null;
    case "category": {
      const slug = node.category?.slug || node.slug || undefined;
      return slug ? storeHref({ categoria: slug }) : "/tienda";
    }
    case "category_brand": {
      const marca = node.brand?.slug || (node.brand?.name ? node.brand.name : undefined);
      const categoria = node.category?.slug || undefined;
      if (!categoria && !marca) return "/tienda";
      return storeHref({ categoria, marca });
    }
    case "attribute": {
      if (!node.value?.slug || !node.value.attribute?.slug) {
        return node.category?.slug ? storeHref({ categoria: node.category.slug }) : "/tienda";
      }
      return storeHref({
        categoria: node.category?.slug,
        atributo: `${node.value.attribute.slug}:${node.value.slug}`,
      });
    }
    case "service":
      return node.service_anchor ? `/servicios#${node.service_anchor}` : "/servicios";
    case "page":
      return node.site_page || "/";
    case "url":
      return node.custom_url || null;
    default:
      return legacyHref(node);
  }
}


/** Etiqueta legible del destino, para el panel. */
export function menuTargetLabel(node: MenuItemRow): string {
  switch (node.target_kind as MenuTargetKind | null) {
    case "category":
      return node.category ? `Categoría: ${node.category.name}` : "Categoría (sin asignar)";
    case "category_brand":
      return `Categoría + marca: ${node.category?.name ?? "—"} / ${node.brand?.name ?? "—"}`;
    case "attribute":
      return `${node.value?.attribute?.name ?? "Atributo"}: ${node.value?.label ?? "—"}`;
    case "service":
      return `Servicio: ${node.service_anchor ?? "—"}`;
    case "page":
      return `Página: ${node.site_page ?? "—"}`;
    case "url":
      return `URL: ${node.custom_url ?? "—"}`;
    case "group":
      return "Grupo (sin enlace)";
    default:
      return "Formato antiguo";
  }
}

function legacyHref(node: MenuItemRow): string | null {
  const v = node.link_value?.trim();
  if (!v) return null;
  switch (node.link_type) {
    case "tienda_categoria":
      return v.startsWith("/") ? v : storeHref({ categoria: v });
    case "tienda_categoria_marca": {
      if (v.startsWith("/")) return v;
      const [categoria, marca] = v.split("::");
      if (!categoria) return null;
      return storeHref({ categoria, marca });
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
