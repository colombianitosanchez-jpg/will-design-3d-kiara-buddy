import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; slug: string; name: string; sort_order: number };
export type Brand = { id: string; name: string };
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
  featured: boolean;
  active: boolean;
  stock: number;
  sku: string | null;
  category: { slug: string; name: string } | null;
  brand: { name: string } | null;
  specs: ProductSpec[];
};

const PRODUCT_SELECT =
  "id,slug,name,price_cop,short,description,kiara_tip,image_url,featured,active,stock,sku,specs,category:categories(slug,name),brand:brands(name)";

function normalize(row: any): Product {
  let specs: ProductSpec[] = [];
  try {
    if (Array.isArray(row.specs)) specs = row.specs;
    else if (typeof row.specs === "string") specs = JSON.parse(row.specs);
  } catch {
    specs = [];
  }
  return { ...row, specs } as Product;
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
