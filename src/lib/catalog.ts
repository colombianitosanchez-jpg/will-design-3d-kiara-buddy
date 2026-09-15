import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseProductButtons, type ProductButton } from "@/lib/product-buttons";


export type Category = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  parent_id: string | null;
  is_active: boolean;
  image_url: string | null;
};
export type CategoryNode = Category & { children: CategoryNode[] };

export type Brand = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type AttributeValue = {
  id: string;
  attribute_id: string;
  slug: string;
  label: string;
  color_hex: string | null;
  sort_order: number;
};

export type Attribute = {
  id: string;
  slug: string;
  name: string;
  input_type: string;
  is_filterable: boolean;
  sort_order: number;
  values: AttributeValue[];
};

export type CategoryAttribute = {
  id: string;
  category_id: string;
  attribute_id: string;
  is_required: boolean;
  sort_order: number;
};

export type ProductSpec = { label: string; value: string };

/** Atributo resuelto de un producto (Material = PLA, Color = Rosado…). */
export type ProductAttribute = {
  attribute_slug: string;
  attribute_name: string;
  value_slug: string | null;
  value_label: string;
  color_hex: string | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  price_cop: number;
  btn_text: string;
  show_whatsapp: boolean;
  hide_default_cta: boolean;
  accepts_3d_file: boolean;
  custom_share_text: string | null;
  custom_buttons: ProductButton[];
  short: string;
  description: string;
  kiara_tip: string;
  image_url: string | null;
  images: string[];
  featured: boolean;
  active: boolean;
  stock: number;
  sku: string | null;
  category: { id: string; slug: string; name: string; parent_id: string | null } | null;
  brand: { id: string; name: string; slug: string | null } | null;
  specs: ProductSpec[];
  attributes: ProductAttribute[];
};

const PRODUCT_SELECT =
  "id,slug,name,price_cop,btn_text,show_whatsapp,hide_default_cta,accepts_3d_file,custom_buttons,short,description,kiara_tip,image_url,images,featured,active,stock,sku,specs," +
  "category:categories(id,slug,name,parent_id),brand:brands(id,name,slug)," +
  "attribute_links:product_attribute_values(text_value,attribute:attributes(slug,name),value:attribute_values(slug,label,color_hex))";


function normalize(row: any): Product {
  let specs: ProductSpec[] = [];
  try {
    if (Array.isArray(row.specs)) specs = row.specs;
    else if (typeof row.specs === "string") specs = JSON.parse(row.specs);
  } catch {
    specs = [];
  }
  let images: string[] = [];
  try {
    if (Array.isArray(row.images)) images = row.images.filter((x: unknown) => typeof x === "string");
    else if (typeof row.images === "string") images = JSON.parse(row.images);
  } catch {
    images = [];
  }
  const attributes: ProductAttribute[] = (row.attribute_links ?? [])
    .filter((l: any) => l?.attribute)
    .map((l: any) => ({
      attribute_slug: l.attribute.slug,
      attribute_name: l.attribute.name,
      value_slug: l.value?.slug ?? null,
      value_label: l.value?.label ?? l.text_value ?? "",
      color_hex: l.value?.color_hex ?? null,
    }))
    .filter((a: ProductAttribute) => a.value_label);
  const { attribute_links: _drop, ...rest } = row;
  return {
    ...rest,
    specs,
    images,
    attributes,
    hide_default_cta: !!row.hide_default_cta,
    accepts_3d_file: !!row.accepts_3d_file,
    custom_buttons: parseProductButtons(row.custom_buttons),
  } as Product;

}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("featured", true)
    .limit(4);
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,slug,name,sort_order,parent_id,is_active,image_url")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("id,name,slug,logo_url,is_active,sort_order")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Brand[];
}

export async function fetchAttributes(): Promise<Attribute[]> {
  const { data, error } = await supabase
    .from("attributes")
    .select(
      "id,slug,name,input_type,is_filterable,sort_order,values:attribute_values(id,attribute_id,slug,label,color_hex,sort_order)",
    )
    .order("sort_order");
  if (error) throw error;
  return ((data ?? []) as any[]).map((a) => ({
    ...a,
    values: (a.values ?? []).sort(
      (x: AttributeValue, y: AttributeValue) => x.sort_order - y.sort_order,
    ),
  })) as Attribute[];
}

export async function fetchCategoryAttributes(): Promise<CategoryAttribute[]> {
  const { data, error } = await supabase
    .from("category_attributes")
    .select("id,category_id,attribute_id,is_required,sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as CategoryAttribute[];
}

export async function fetchSiteContent(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("site_content").select("key,value");
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((r: any) => (map[r.key] = r.value ?? ""));
  return map;
}

// Query options
export const productsQuery = () =>
  queryOptions({ queryKey: ["products"], queryFn: fetchProducts, staleTime: 30_000 });
export const featuredProductsQuery = () =>
  queryOptions({ queryKey: ["products", "featured"], queryFn: fetchFeaturedProducts, staleTime: 30_000 });
export const productBySlugQuery = (slug: string) =>
  queryOptions({ queryKey: ["products", slug], queryFn: () => fetchProductBySlug(slug), staleTime: 30_000 });
export const categoriesQuery = () =>
  queryOptions({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: 5 * 60_000 });
export const brandsQuery = () =>
  queryOptions({ queryKey: ["brands"], queryFn: fetchBrands, staleTime: 5 * 60_000 });
export const attributesQuery = () =>
  queryOptions({ queryKey: ["attributes"], queryFn: fetchAttributes, staleTime: 5 * 60_000 });
export const categoryAttributesQuery = () =>
  queryOptions({
    queryKey: ["category_attributes"],
    queryFn: fetchCategoryAttributes,
    staleTime: 5 * 60_000,
  });
export const siteContentQuery = () =>
  queryOptions({ queryKey: ["site_content"], queryFn: fetchSiteContent, staleTime: 30_000 });

export const DEFAULT_CONTACT = {
  whatsapp: "573156724474",
  whatsapp_display: "+57 315 672 4474",
  email: "contacto@willdesign3d.com",
  instagram_url: "https://www.instagram.com/will_design2020/",
  instagram_handle: "@will_design2020",
  location_text: "Bogotá, Colombia · atención por cita previa",
  location_short: "Bogotá, Colombia",
  map_embed_url: "https://www.google.com/maps?q=Bogot%C3%A1%2C+Colombia&output=embed",
};

export function getContactInfo(content: Record<string, string> | undefined) {
  const g = (k: string, d: string) => (content?.[k]?.trim() ? content![k].trim() : d);
  return {
    whatsapp: g("contact_whatsapp", DEFAULT_CONTACT.whatsapp),
    whatsapp_display: g("contact_whatsapp_display", DEFAULT_CONTACT.whatsapp_display),
    email: g("contact_email", DEFAULT_CONTACT.email),
    instagram_url: g("contact_instagram_url", DEFAULT_CONTACT.instagram_url),
    instagram_handle: g("contact_instagram_handle", DEFAULT_CONTACT.instagram_handle),
    location_text: g("contact_location_text", DEFAULT_CONTACT.location_text),
    location_short: g("contact_location_short", DEFAULT_CONTACT.location_short),
    map_embed_url: g("contact_map_embed_url", DEFAULT_CONTACT.map_embed_url),
  };
}

export function waLink(whatsapp: string, text?: string) {
  const num = whatsapp.replace(/\D/g, "") || DEFAULT_CONTACT.whatsapp;
  return text
    ? `https://wa.me/${num}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${num}`;
}

export function formatCOP(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

// Gradient fallback by category slug (usa la raíz de la rama)
export function gradientKeyFor(categorySlug: string | null | undefined): "orange" | "teal" | "wine" {
  const s = categorySlug ?? "";
  if (s.startsWith("impresoras") || s.startsWith("lapices")) return "orange";
  if (s.startsWith("filamentos") || s.startsWith("repuestos") || s.startsWith("escaners"))
    return "teal";
  return "wine";
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------- Árbol de categorías ----------------

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CategoryNode[] = [];
  map.forEach((node) => {
    const parent = node.parent_id ? map.get(node.parent_id) : null;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (list: CategoryNode[], depth = 0) => {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    if (depth > 20) return;
    list.forEach((n) => sort(n.children, depth + 1));
  };
  sort(roots);
  return roots;
}

export function flattenCategoryTree(
  nodes: CategoryNode[],
  depth = 0,
): { category: CategoryNode; depth: number }[] {
  return nodes.flatMap((n) => [
    { category: n, depth },
    ...flattenCategoryTree(n.children, depth + 1),
  ]);
}

/** Slugs de una categoría y de todas sus subcategorías (rama completa). */
export function categoryBranchSlugs(slug: string | null, categories: Category[]): string[] {
  if (!slug) return [];
  const root = categories.find((c) => c.slug === slug);
  if (!root) return [slug];
  const out = [root.slug];
  const walk = (parentId: string, depth = 0) => {
    if (depth > 20) return;
    categories
      .filter((c) => c.parent_id === parentId)
      .forEach((c) => {
        out.push(c.slug);
        walk(c.id, depth + 1);
      });
  };
  walk(root.id);
  return out;
}

/** Ruta legible: "Filamentos › PLA". */
export function categoryPath(slug: string | null | undefined, categories: Category[]): string {
  let cur = categories.find((c) => c.slug === slug) ?? null;
  const parts: string[] = [];
  let guard = 0;
  while (cur && guard++ < 20) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? (categories.find((c) => c.id === cur!.parent_id) ?? null) : null;
  }
  return parts.join(" › ");
}

export function brandSlugOf(brand: { name: string; slug?: string | null } | null | undefined) {
  if (!brand) return null;
  return brand.slug?.trim() ? brand.slug.trim() : slugify(brand.name);
}

export function prettySlug(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/-/g, " ");
}

// ---------------- Filtros de tienda ----------------

/** Filtro de atributos serializado en la URL: "color:rosado,material:pla". */
export type AttrFilter = { attribute: string; value: string };

export function parseAttrParam(param: string | undefined | null): AttrFilter[] {
  if (!param) return [];
  return param
    .split(",")
    .map((chunk) => chunk.split(":"))
    .filter((p) => p.length === 2 && p[0] && p[1])
    .map(([attribute, value]) => ({ attribute: slugify(attribute), value: slugify(value) }));
}

export function serializeAttrParam(filters: AttrFilter[]): string | undefined {
  if (!filters.length) return undefined;
  return filters.map((f) => `${f.attribute}:${f.value}`).join(",");
}

export type StoreFilter = {
  /** Slug real de la categoría, o null si no hay filtro. */
  categorySlug: string | null;
  /** Slugs de la categoría y todas sus hijas. */
  branch: string[];
  /** true cuando el parámetro no corresponde a ninguna categoría real. */
  unknown: boolean;
};

export function resolveStoreFilter(
  param: string | undefined | null,
  categories: Category[],
): StoreFilter {
  const raw = slugify(param ?? "");
  if (!raw) return { categorySlug: null, branch: [], unknown: false };
  const exact = categories.find((c) => c.slug === raw);
  if (exact)
    return { categorySlug: exact.slug, branch: categoryBranchSlugs(exact.slug, categories), unknown: false };
  const byName = categories.find((c) => slugify(c.name) === raw);
  if (byName)
    return { categorySlug: byName.slug, branch: categoryBranchSlugs(byName.slug, categories), unknown: false };
  return { categorySlug: raw, branch: [raw], unknown: true };
}

export function productMatchesAttrs(product: Product, filters: AttrFilter[]): boolean {
  return filters.every((f) =>
    product.attributes.some(
      (a) => a.attribute_slug === f.attribute && (a.value_slug ?? slugify(a.value_label)) === f.value,
    ),
  );
}

/** Normaliza texto: minúsculas y sin acentos, para búsquedas tolerantes. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Búsqueda robusta: divide la consulta en palabras y exige que TODAS aparezcan
 * en el texto, sin importar el orden, las mayúsculas ni los acentos.
 */
export function matchesSearch(haystack: string, query?: string | null): boolean {
  const q = query?.trim();
  if (!q) return true;
  const target = normalizeText(haystack);
  return normalizeText(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => target.includes(term));
}

/** Filtra el catálogo por rama de categoría, marca, atributos y texto libre. */
export function filterProducts(
  products: Product[],
  opts: {
    filter: StoreFilter;
    brandSlug?: string | null;
    attrs?: AttrFilter[];
    query?: string;
  },
): Product[] {
  const { filter, brandSlug, attrs = [], query } = opts;
  if (filter.unknown) return [];
  const branch = new Set(filter.branch);
  return products.filter((p) => {
    const okCat = !filter.categorySlug || (p.category?.slug ? branch.has(p.category.slug) : false);
    const okBrand = !brandSlug || brandSlugOf(p.brand) === brandSlug;
    const okAttrs = productMatchesAttrs(p, attrs);
    const haystack = [
      p.name,
      p.brand?.name ?? "",
      p.category?.name ?? "",
      p.short,
      p.slug,
      p.attributes.map((a) => a.value_label).join(" "),
    ].join(" ");
    const okQ = matchesSearch(haystack, query);
    return okCat && okBrand && okAttrs && okQ;
  });
}
