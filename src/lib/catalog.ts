import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; slug: string; name: string; sort_order: number };
export type Brand = { id: string; name: string; slug: string | null };
export type ProductSpec = { label: string; value: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  price_cop: number;
  short: string;
  description: string;
  kiara_tip: string;
  image_url: string | null;
  images: string[];
  featured: boolean;
  active: boolean;
  stock: number;
  sku: string | null;
  category: { slug: string; name: string } | null;
  brand: { name: string; slug: string | null } | null;
  specs: ProductSpec[];
};

const PRODUCT_SELECT =
  "id,slug,name,price_cop,short,description,kiara_tip,image_url,images,featured,active,stock,sku,specs,category:categories(slug,name),brand:brands(name,slug)";

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
  return { ...row, specs, images } as Product;
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
    .select("id,slug,name,sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
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

// Gradient fallback by category slug
export function gradientKeyFor(categorySlug: string | null | undefined): "orange" | "teal" | "wine" {
  switch (categorySlug) {
    case "impresoras":
    case "lapices":
      return "orange";
    case "filamentos":
    case "repuestos":
    case "escaners":
      return "teal";
    case "resinas":
    case "camaras":
    default:
      return "wine";
  }
}

// ---- URL filter helpers (categoria / marca) ----
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Alias entre slugs usados en el menú y los slugs reales de categories */
const CATEGORY_ALIASES: Record<string, string> = {
  "impresoras-3d": "impresoras",
  "impresoras-filamento": "impresoras",
  "impresoras-resina": "impresoras",
  "impresora-3d": "impresoras",
  "filamento": "filamentos",
  "materiales-3d": "filamentos",
  "resina": "resinas",
  "lapices-3d": "lapices",
  "lapiz-3d": "lapices",
  "escaner-3d": "escaners",
  "escaners-3d": "escaners",
  "escaneres-3d": "escaners",
  "camaras-3d": "camaras",
  "repuestos-3d": "repuestos",
};

/** Resuelve el parámetro `categoria` de la URL al slug real de la categoría. */
export function resolveCategorySlug(
  param: string | undefined | null,
  categories: Category[],
): string | null {
  const raw = slugify(param ?? "");
  if (!raw) return null;
  if (categories.some((c) => c.slug === raw)) return raw;
  const alias = CATEGORY_ALIASES[raw];
  if (alias && categories.some((c) => c.slug === alias)) return alias;
  const byName = categories.find((c) => slugify(c.name) === raw);
  if (byName) return byName.slug;
  const partial = categories.find((c) => raw.startsWith(c.slug) || c.slug.startsWith(raw));
  return partial ? partial.slug : raw;
}

export function brandSlugOf(brand: { name: string; slug?: string | null } | null | undefined) {
  if (!brand) return null;
  return brand.slug?.trim() ? brand.slug.trim() : slugify(brand.name);
}
