import type { LlmsProductItem, LlmsServiceItem } from "./seo";

function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  const importMetaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
  if (importMetaEnv && importMetaEnv[key]) {
    return importMetaEnv[key];
  }
  return undefined;
}

function getSupabaseRestCredentials(): { url: string; key: string } | null {
  const url = (getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL"))?.replace(/\/+$/, "");
  const key = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return null;
  return { url, key };
}

export async function fetchSiteContentMapServer(keys?: string[]): Promise<Record<string, string>> {
  const creds = getSupabaseRestCredentials();
  if (!creds) return {};

  const filter = keys?.length
    ? `&key=in.(${keys.map((k) => encodeURIComponent(k)).join(",")})`
    : "";

  try {
    const res = await fetch(`${creds.url}/rest/v1/site_content?select=key,value${filter}`, {
      headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}` },
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{ key?: string; value?: string | null }>;
    const map: Record<string, string> = {};
    for (const row of rows ?? []) {
      if (row?.key) {
        map[row.key] = row.value ?? "";
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function fetchActiveProductsServer(): Promise<
  Array<LlmsProductItem & { created_at?: string; updated_at?: string }>
> {
  const creds = getSupabaseRestCredentials();
  if (!creds) return [];
  try {
    const res = await fetch(
      `${creds.url}/rest/v1/products?select=slug,name,price_cop,short,description,quote_only,created_at,updated_at&active=eq.true&order=featured.desc,sort_order.asc,name.asc`,
      { headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchActiveServicesServer(): Promise<
  Array<LlmsServiceItem & { created_at?: string; updated_at?: string }>
> {
  const creds = getSupabaseRestCredentials();
  if (!creds) return [];
  try {
    const res = await fetch(
      `${creds.url}/rest/v1/site_services?select=slug,title,lead,created_at,updated_at&is_active=eq.true&order=sort_order.asc,title.asc`,
      { headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
