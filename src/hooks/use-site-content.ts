import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { siteContentQuery } from "@/lib/catalog";

/**
 * Diccionario global de contenido (CMS clave-valor).
 * getText(key, fallback) devuelve el texto del panel o el fallback.
 */
export function useSiteContent() {
  const query = useQuery(siteContentQuery());
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
