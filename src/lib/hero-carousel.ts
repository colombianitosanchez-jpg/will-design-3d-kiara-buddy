import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HeroSlide = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  is_active: boolean;
  display_order: number;
  duration_ms: number;
  action_url?: string;
};

export const HERO_MEDIA_BUCKET = "site-media";

/** Duración por defecto de cada elemento del carrusel (ms). */
export const DEFAULT_SLIDE_MS = 5000;

/** Extensiones aceptadas y su tipo. */
export function detectMediaType(file: File): "image" | "video" | null {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/.test(name)) return "video";
  if (file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif)$/.test(name)) return "image";
  return null;
}

async function fetchActiveSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("hero_carousel")
    .select("id,media_url,media_type,is_active,display_order,duration_ms,action_url")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HeroSlide[];
}

export const heroCarouselQuery = () =>
  queryOptions({
    queryKey: ["hero_carousel", "active"],
    queryFn: fetchActiveSlides,
    staleTime: 30_000,
  });
