import { parseVariants, type ProductVariant } from "@/lib/product-variants";
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
  image_url?: string | null;
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
  quote_only: boolean;
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
  variants: ProductVariant[];
  variant_label: string;
};

const PRODUCT_SELECT =
  "id,slug,name,price_cop,btn_text,show_whatsapp,hide_default_cta,accepts_3d_file,quote_only,custom_share_text,custom_buttons,variants,variant_label,short,description,kiara_tip,image_url,images,featured,active,stock,sku,specs," +
  "category:categories(id,slug,name,parent_id),brand:brands(id,name,slug)," +
  "attribute_links:product_attribute_values(text_value,attribute:attributes(slug,name),value:attribute_values(slug,label,color_hex))";


function normalize(row: Record<string, unknown>): Product {
  let specs: ProductSpec[] = [];
  try {
    if (Array.isArray(row.specs)) specs = row.specs as ProductSpec[];
    else if (typeof row.specs === "string") specs = JSON.parse(row.specs);
  } catch {
    specs = [];
  }
  let images: string[] = [];
  try {
    if (Array.isArray(row.images)) images = row.images.filter((x: unknown): x is string => typeof x === "string");
    else if (typeof row.images === "string") images = JSON.parse(row.images);
  } catch {
    images = [];
  }
  const rawLinks = Array.isArray(row.attribute_links) ? row.attribute_links : [];
  const attributes: ProductAttribute[] = rawLinks
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object" && !!(l as Record<string, unknown>).attribute)
    .map((l) => {
      const attr = l.attribute as Record<string, unknown>;
      const val = l.value as Record<string, unknown> | null;
      return {
        attribute_slug: typeof attr.slug === "string" ? attr.slug : "",
        attribute_name: typeof attr.name === "string" ? attr.name : "",
        value_slug: val && typeof val.slug === "string" ? val.slug : null,
        value_label: val && typeof val.label === "string" ? val.label : typeof l.text_value === "string" ? l.text_value : "",
        color_hex: val && typeof val.color_hex === "string" ? val.color_hex : null,
      };
    })
    .filter((a: ProductAttribute) => a.value_label);

  const { attribute_links: _drop, ...rest } = row;
  return {
    ...rest,
    specs,
    images,
    attributes,
    hide_default_cta: !!row.hide_default_cta,
    accepts_3d_file: !!row.accepts_3d_file,
    quote_only: !!row.quote_only,
    custom_share_text: typeof row.custom_share_text === "string" ? row.custom_share_text : null,
    custom_buttons: parseProductButtons(row.custom_buttons),
    variants: parseVariants(row.variants).filter((v) => v.is_active),
    variant_label: typeof row.variant_label === "string" && row.variant_label ? row.variant_label : "Color",
  } as Product;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("sort_order", { ascending: true })
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
  // Nota: se excluye la columna image_url de attribute_values para evitar error 42703 en Supabase
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
  queryOptions({ queryKey: ["products"], queryFn: fetchProducts, staleTime: 60_000 });
export const featuredProductsQuery = () =>
  queryOptions({ queryKey: ["products", "featured"], queryFn: fetchFeaturedProducts, staleTime: 60_000 });
export const productBySlugQuery = (slug: string) =>
  queryOptions({ queryKey: ["products", slug], queryFn: () => fetchProductBySlug(slug), staleTime: 60_000 });
export const categoriesQuery = () =>
  queryOptions({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: 10 * 60_000 });
export const brandsQuery = () =>
  queryOptions({ queryKey: ["brands"], queryFn: fetchBrands, staleTime: 10 * 60_000 });
export const attributesQuery = () =>
  queryOptions({ queryKey: ["attributes"], queryFn: fetchAttributes, staleTime: 10 * 60_000 });
export const categoryAttributesQuery = () =>
  queryOptions({
    queryKey: ["category_attributes"],
    queryFn: fetchCategoryAttributes,
    staleTime: 10 * 60_000,
  });
export const siteContentQuery = () =>
  queryOptions({
    queryKey: ["site_content"],
    queryFn: fetchSiteContent,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

/** Número válido (≥7 dígitos) o el de respaldo. */
export function pickWhatsapp(candidate: string | null | undefined, fallback: string): string {
  const c = (candidate ?? "").trim();
  return c.replace(/\D/g, "").length >= 7 ? c : fallback;
}

/** Aplica la plantilla global de WhatsApp de Contenido del Sitio. */
export function applyGlobalWaTemplate(
  template: string | null | undefined,
  data: { producto: string; precio?: string; variante?: string; media?: string },
  fallback: string,
): string {
  const t = (template ?? "").trim();
  if (!t) return fallback;
  return t
    .replace(/\{\{?(producto|product)\}?\}/g, data.producto)
    .replace(/\{\{?(precio|price)\}?\}/g, data.precio ?? "")
    .replace(/\{\{?(variante|variant)\}?\}/g, data.variante ?? "")
    .replace(/\{\{?media(_link)?\}?\}/g, data.media ?? "");
}

export const DEFAULT_CONTACT = {
  whatsapp: "",
  whatsapp_display: "",
  email: "",
  instagram_url: "",
  instagram_handle: "",
  location_text: "",
  location_short: "",
  map_embed_url: "",
};

export function getContactInfo(content: Record<string, string> | undefined) {
  const g = (k: string, d = "") => (content?.[k]?.trim() ? content![k].trim() : d);
  return {
    whatsapp: g("contact_whatsapp", ""),
    whatsapp_display: g("contact_whatsapp_display", ""),
    email: g("contact_email", ""),
    instagram_url: g("contact_instagram_url", ""),
    instagram_handle: g("contact_instagram_handle", ""),
    location_text: g("contact_location_text", ""),
    location_short: g("contact_location_short", ""),
    map_embed_url: g("contact_map_embed_url", ""),
    whatsapp_quote_template: g("whatsapp_quote_template", ""),
  };
}

export function buildWhatsAppQuoteMessage(
  template: string,
  params: {
    servicio: string;
    cliente: string;
    email: string;
    telefono: string;
    resumen: string;
    total: string;
    notas?: string;
    mediaUrl?: string | null;
  },
): string {
  let text = template
    .replaceAll("{{servicio}}", params.servicio)
    .replaceAll("{{cliente}}", params.cliente)
    .replaceAll("{{email}}", params.email)
    .replaceAll("{{telefono}}", params.telefono)
    .replaceAll("{{resumen}}", params.resumen)
    .replaceAll("{{total}}", params.total)
    .replaceAll("{{notas}}", params.notas ? `📝 Notas: ${params.notas}` : "");

  if (params.mediaUrl) {
    text = text.replaceAll("{{media_link}}", `📎 Archivo/Foto adjunta: ${params.mediaUrl}`);
  } else {
    text = text.replaceAll("{{media_link}}", "");
  }

  return text.trim();
}

export function waLink(
  whatsapp: string | null | undefined,
  text?: string | null,
  options?: { defaultMessage?: string; mediaToSend?: string }
): string | undefined {
  if (!whatsapp) return undefined;
  const num = whatsapp.replace(/\D/g, "");
  if (!num) return undefined;

  let msg = (text || "").trim() || (options?.defaultMessage || "").trim();

  if (options?.mediaToSend) {
    if (msg.includes("{media}")) {
      msg = msg.replaceAll("{media}", options.mediaToSend);
    }
    if (msg.includes("{media_link}")) {
      msg = msg.replaceAll("{media_link}", options.mediaToSend);
    }
  }

  return msg
    ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
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

/** Filtra el catálogo por rama de categoría, marca, atributos y texto libre, ordenado por relevancia si hay búsqueda. */
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
  const trimmedQuery = query?.trim();

  const normQ = trimmedQuery ? normalizeText(trimmedQuery) : "";

  const matchingProducts = products.filter((p) => {
    const okCat = !filter.categorySlug || (p.category?.slug ? branch.has(p.category.slug) : false);
    const okBrand = !brandSlug || brandSlugOf(p.brand) === brandSlug;
    const okAttrs = productMatchesAttrs(p, attrs);

    if (!normQ) {
      return okCat && okBrand && okAttrs;
    }

    const prodName = normalizeText(p.name);
    const prodSku = normalizeText(p.sku ?? "");
    const prodDesc = normalizeText(`${p.short ?? ""} ${p.description ?? ""}`);
    const prodCatBrand = normalizeText(`${p.category?.name ?? ""} ${p.brand?.name ?? ""}`);
    const prodAttrs = normalizeText(p.attributes.map((a) => `${a.attribute_name} ${a.value_label}`).join(" "));
    const prodSpecs = normalizeText((p.specs ?? []).map((s) => `${s.label} ${s.value}`).join(" "));
    const variantMatch = (p.variants ?? []).some((v) =>
      normalizeText(`${v.name} ${v.sku ?? ""}`).includes(normQ),
    );

    const titleMatch = prodName.includes(normQ);
    const skuMatch = prodSku.includes(normQ);
    const descMatch = prodDesc.includes(normQ);
    const attrMatch = prodAttrs.includes(normQ) || prodSpecs.includes(normQ);
    const catBrandMatch = prodCatBrand.includes(normQ);

    const okQ = titleMatch || skuMatch || descMatch || attrMatch || catBrandMatch || variantMatch;
    return okCat && okBrand && okAttrs && okQ;
  });

  if (!normQ) {
    return matchingProducts;
  }

  const scored = matchingProducts.map((p) => {
    let score = 0;
    const prodName = normalizeText(p.name);
    const prodSku = normalizeText(p.sku ?? "");
    const prodDesc = normalizeText(`${p.short ?? ""} ${p.description ?? ""}`);
    const prodAttrs = normalizeText(p.attributes.map((a) => `${a.attribute_name} ${a.value_label}`).join(" "));
    const matchingVars = (p.variants ?? []).filter((v) =>
      normalizeText(`${v.name} ${v.sku ?? ""}`).includes(normQ),
    );

    // 1. Título o SKU comience o coincida exactamente
    if (prodName === normQ || prodSku === normQ) {
      score += 4000;
    } else if (prodName.startsWith(normQ) || prodSku.startsWith(normQ)) {
      score += 3000;
    } else if (prodName.includes(normQ) || prodSku.includes(normQ)) {
      score += 2500;
    }

    // 2. Variantes (JSONB) cuyo nombre o SKU coincida
    if (matchingVars.length > 0) {
      const exactVar = matchingVars.some(
        (v) => normalizeText(v.name) === normQ || normalizeText(v.sku ?? "") === normQ,
      );
      const startVar = matchingVars.some(
        (v) => normalizeText(v.name).startsWith(normQ) || normalizeText(v.sku ?? "").startsWith(normQ),
      );
      if (exactVar) {
        score += 2000;
      } else if (startVar) {
        score += 1800;
      } else {
        score += 1500;
      }
    }

    // 3. Atributos y especificaciones
    if (prodAttrs.includes(normQ)) {
      score += 1000;
    }

    // 4. Coincidencias en la descripción
    if (prodDesc.includes(normQ)) {
      score += 500;
    }

    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.product);
}
