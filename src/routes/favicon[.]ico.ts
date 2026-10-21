import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_FAVICON_URL =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/Hj8JfrWa2qQArO2BOXZdviQDjWA2/social-images/social-1783472807154-WILL_LOGO.webp";

function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  return undefined;
}

async function getFaviconUrl(): Promise<string> {
  const url = getEnv("VITE_SUPABASE_URL");
  const key = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return DEFAULT_FAVICON_URL;
  try {
    const res = await fetch(`${url}/rest/v1/site_content?key=eq.site_favicon_url&select=value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return DEFAULT_FAVICON_URL;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.value) {
      return data[0].value.trim() || DEFAULT_FAVICON_URL;
    }
  } catch {
    // fallback to default logo
  }
  return DEFAULT_FAVICON_URL;
}

export const Route = createFileRoute("/favicon.ico")({
  server: {
    handlers: {
      GET: async () => {
        const targetUrl = await getFaviconUrl();

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
