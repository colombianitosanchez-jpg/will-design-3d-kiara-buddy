import { createFileRoute } from "@tanstack/react-router";
import { getCanonicalBaseUrl } from "@/lib/seo";

function readEnv(key: string): string {
  const procVal =
    typeof process !== "undefined" && process.env
      ? (process.env as Record<string, string | undefined>)[key]
      : undefined;
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
  return (procVal || metaEnv?.[key] || "").trim();
}

function safeHostname(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

function classifyFetchError(err: unknown): string {
  if (!err || typeof err !== "object") return "UNKNOWN_ERROR";
  const record = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = record.cause?.code;
  if (code) return code;
  if (record.name === "TimeoutError" || record.name === "AbortError") return "TIMEOUT";
  const msg = `${record.message ?? ""} ${record.cause?.message ?? ""}`;
  if (/ENOTFOUND/i.test(msg)) return "ENOTFOUND";
  if (/1016/.test(msg)) return "CF_1016";
  return record.name || "FETCH_FAILED";
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
        const supabaseAnonKey =
          readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || readEnv("SUPABASE_PUBLISHABLE_KEY");
        const serverServiceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

        const supabaseHost = safeHostname(supabaseUrl);
        const clientConfigured = Boolean(supabaseUrl && supabaseAnonKey);
        const serverAdminConfigured = Boolean(readEnv("SUPABASE_URL") && serverServiceKey);

        let supabaseReachable = false;
        let supabaseStatus: number | null = null;
        let supabaseErrorCode: string | null = null;

        if (!clientConfigured) {
          supabaseErrorCode = "MISSING_SUPABASE_ENV";
        } else {
          try {
            const res = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`, {
              method: "HEAD",
              headers: { apikey: supabaseAnonKey },
              signal: AbortSignal.timeout(3500),
            });
            supabaseStatus = res.status;
            if (res.status >= 500) {
              supabaseReachable = false;
              supabaseErrorCode = res.status === 530 ? "CF_1016_ORIGIN_DNS" : `HTTP_${res.status}`;
            } else {
              supabaseReachable = true;
            }
          } catch (err) {
            supabaseReachable = false;
            supabaseErrorCode = classifyFetchError(err);
          }
        }

        const payload = {
          ok: supabaseReachable,
          runtime:
            typeof (globalThis as Record<string, unknown>).WebSocketPair !== "undefined"
              ? "cloudflare-workers"
              : "node",
          canonicalUrl: getCanonicalBaseUrl(null),
          supabase: {
            clientConfigured,
            serverAdminConfigured,
            host: supabaseHost,
            reachable: supabaseReachable,
            status: supabaseStatus,
            errorCode: supabaseErrorCode,
          },
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(payload, null, 2), {
          status: supabaseReachable ? 200 : 503,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
