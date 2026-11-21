import { getRequest } from "@tanstack/react-start/server";

export const RATE_LIMIT_ERROR_MESSAGE =
  "Has realizado demasiadas solicitudes en poco tiempo. Por favor espera un minuto.";

export const DEFAULT_RATE_LIMIT_MAX = 10;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

export type RateLimitOptions = {
  maxRequests?: number;
  windowMs?: number;
  now?: () => number;
};

export type RateLimiter = {
  check: (key: string, nowMs?: number) => { allowed: boolean; remaining: number; resetAt: number };
  assert: (key: string, nowMs?: number) => void;
  clear: () => void;
};

/**
 * Extrae la IP del cliente desde headers estándar (Cloudflare / Proxies).
 */
export function extractClientIpFromHeaders(
  headers: Headers | Record<string, string | undefined> | null | undefined,
): string {
  if (!headers) return "anon";

  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name);
    }
    const record = headers as Record<string, string | undefined>;
    return record[name] ?? record[name.toLowerCase()] ?? null;
  };

  const cfIp = getHeader("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const xff = getHeader("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  return "anon";
}

/**
 * Crea un limitador de frecuencia en memoria usando ventana móvil (sliding window).
 * Compatible con Edge Runtime / Cloudflare Workers (sin timers en segundo plano).
 */
export function createRateLimiter(options: RateLimitOptions = {}): RateLimiter {
  const maxRequests = options.maxRequests ?? DEFAULT_RATE_LIMIT_MAX;
  const windowMs = options.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
  const nowFn = options.now ?? (() => Date.now());
  const hitsByKey = new Map<string, number[]>();

  function pruneStale(currentMs: number) {
    if (hitsByKey.size <= 5000) return;
    for (const [key, timestamps] of hitsByKey.entries()) {
      const fresh = timestamps.filter((t) => currentMs - t < windowMs);
      if (fresh.length === 0) {
        hitsByKey.delete(key);
      } else {
        hitsByKey.set(key, fresh);
      }
    }
    if (hitsByKey.size > 5000) {
      hitsByKey.clear();
    }
  }

  function check(key: string, nowMs = nowFn()) {
    pruneStale(nowMs);
    const recent = (hitsByKey.get(key) ?? []).filter((t) => nowMs - t < windowMs);

    if (recent.length >= maxRequests) {
      hitsByKey.set(key, recent);
      const oldest = recent[0] ?? nowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldest + windowMs,
      };
    }

    recent.push(nowMs);
    hitsByKey.set(key, recent);

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - recent.length),
      resetAt: (recent[0] ?? nowMs) + windowMs,
    };
  }

  function assert(key: string, nowMs = nowFn()) {
    const result = check(key, nowMs);
    if (!result.allowed) {
      throw new Error(RATE_LIMIT_ERROR_MESSAGE);
    }
  }

  function clear() {
    hitsByKey.clear();
  }

  return { check, assert, clear };
}

const sharedPublicLimiter = createRateLimiter({
  maxRequests: DEFAULT_RATE_LIMIT_MAX,
  windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
});

/**
 * Obtiene la IP de la petición actual de TanStack Start y aplica el límite
 * de 10 solicitudes por minuto en una ventana móvil por bucket e IP.
 */
export function assertRateLimitFromRequest(bucket: string): void {
  let ip = "anon";
  try {
    const req = getRequest();
    ip = extractClientIpFromHeaders(req?.headers);
  } catch {
    ip = "anon";
  }
  sharedPublicLimiter.assert(`${bucket}:${ip}`);
}
