import { createFileRoute } from "@tanstack/react-router";

function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  return undefined;
}

async function getFaviconUrl(): Promise<string | null> {
  const url = getEnv("VITE_SUPABASE_URL");
  const key = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/site_content?key=eq.site_favicon_url&select=value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.value) {
      return data[0].value.trim() || null;
    }
  } catch {
    // failure
  }
  return null;
}

export const Route = createFileRoute("/favicon.ico")({
  server: {
    handlers: {
      GET: async () => {
        const targetUrl = await getFaviconUrl();
        if (!targetUrl) {
          return new Response(null, { status: 404 });
        }

        try {
          const imgRes = await fetch(targetUrl);
          if (imgRes.ok) {
            const contentType = imgRes.headers.get("content-type") || "image/x-icon";
            const buffer = await imgRes.arrayBuffer();
            return new Response(buffer, {
              status: 200,
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
              },
            });
          }
        } catch {
          // If proxying fails, fall back to 302 redirect
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: targetUrl,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      },
    },
  },
});
