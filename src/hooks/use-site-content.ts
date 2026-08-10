import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { siteContentQuery } from "@/lib/catalog";

/**
 * Diccionario global de contenido (CMS clave-valor).
 * getText(key, fallback) devuelve el texto del panel o el fallback.
 */
export function useSiteContent() {
  const { data, isLoading } = useQuery(siteContentQuery());

  const getText = useCallback(
    (key: string, fallback = "") => {
      const value = data?.[key];
      return value && value.trim() ? value : fallback;
    },
    [data],
  );

  return { content: data ?? {}, getText, isLoading };
}
