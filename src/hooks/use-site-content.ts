import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { siteContentQuery } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";

/**
 * Diccionario global de contenido (CMS clave-valor).
 * getText(key, fallback) devuelve el texto del panel o el fallback.
 * Escucha cambios en tiempo real desde Supabase para actualizar la página al instante.
 */
export function useSiteContent() {
  const queryClient = useQueryClient();
  const query = useQuery(siteContentQuery());
  const data = query.data ?? {};

  useEffect(() => {
    const channel = supabase
      .channel("site_content_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["site_content"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getText = useCallback(
    (key: string, fallback = "") => {
      const value = data[key]?.trim();
      return value || fallback;
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
