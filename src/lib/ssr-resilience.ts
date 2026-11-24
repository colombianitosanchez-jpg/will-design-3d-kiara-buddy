import type { FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/react-query";

export const DEFAULT_SSR_QUERY_TIMEOUT_MS = 4500;

export interface SafeQueryResult<T> {
  data: T;
  degraded: boolean;
}

/**
 * Ejecuta `queryClient.ensureQueryData` con timeout acotado y fallback seguro.
 * Evita que un fallo de red, DNS (p. ej. Error 1016) o base de datos pausada
 * derribe el renderizado SSR completo con HTTP 500.
 */
export async function safeEnsureQueryResult<T, TKey extends QueryKey = QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<T, Error, T, TKey>,
  fallback: NoInfer<T>,
  label = "query",
  timeoutMs = DEFAULT_SSR_QUERY_TIMEOUT_MS,
): Promise<SafeQueryResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const queryPromise = queryClient.ensureQueryData(options);
    const data =
      timeoutMs > 0
        ? await Promise.race<T>([
            queryPromise,
            new Promise<T>((_, reject) => {
              timer = setTimeout(() => {
                reject(new Error(`SSR query timeout after ${timeoutMs}ms (${label})`));
              }, timeoutMs);
            }),
          ])
        : await queryPromise;

    return { data, degraded: false };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn(`[SSR] Modo respaldo activado para "${label}": ${detail}`);
    return { data: fallback, degraded: true };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function safeEnsureQueryData<T, TKey extends QueryKey = QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<T, Error, T, TKey>,
  fallback: NoInfer<T>,
  label = "query",
  timeoutMs = DEFAULT_SSR_QUERY_TIMEOUT_MS,
): Promise<T> {
  const res = await safeEnsureQueryResult(queryClient, options, fallback, label, timeoutMs);
  return res.data;
}
