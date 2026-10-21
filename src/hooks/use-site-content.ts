import { useQuery } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";
import { useCallback } from "react";
import { siteContentQuery } from "@/lib/catalog";

/**
 * Diccionario global de contenido (CMS clave-valor).
 * getText(key, fallback) devuelve el texto del panel o el fallback.
 */
export function useSiteContent() {
  const matches = useMatches() as any[];
  const rootMatch = matches.find((m) => m.loaderData && "siteContent" in m.loaderData)?.loaderData;
  // Utiliza el caché hidratado por SSR desde el loader de la ruta con queryKey ["site_content"]
  const query = useQuery({
    ...siteContentQuery(),
    initialData: rootMatch?.siteContent,
  });
  const data = query.data ?? {};

  const getText = useCallback(
    (key: string, fallback = "") => {
      const value = data[key]?.trim();
      return value ?? fallback;
    },
    [data],
  );

  return {
    content: data,
    getText,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
