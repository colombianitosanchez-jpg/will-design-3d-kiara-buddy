// Servicios de la página /servicios (Panel → Servicios), leídos de site_services.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Boxes,
  GraduationCap,
  Package,
  Paintbrush,
  PenTool,
  PencilRuler,
  Printer,
  Ruler,
  ScanLine,
  Settings,
  ShoppingBag,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type SiteServiceColor = "orange" | "teal" | "wine";

export type SiteService = {
  id: string;
  slug: string;
  title: string;
  lead: string;
  bullets: string[];
  color: SiteServiceColor;
  icon: string;
  kiara_tip: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

/** Claves de icono → componente lucide (las que ofrece el panel). */
export const SITE_SERVICE_ICONS: Record<string, LucideIcon> = {
  boxes: Boxes,
  "pen-tool": PenTool,
  wrench: Wrench,
  "scan-line": ScanLine,
  sparkles: Sparkles,
  ruler: Ruler,
  "shopping-bag": ShoppingBag,
  printer: Printer,
  package: Package,
  "pencil-ruler": PencilRuler,
  "graduation-cap": GraduationCap,
  paintbrush: Paintbrush,
  settings: Settings,
};

export const SITE_SERVICE_ICON_OPTIONS = [
  { value: "boxes", label: "Cajas (impresión)" },
  { value: "pen-tool", label: "Pluma (diseño)" },
  { value: "wrench", label: "Llave (técnico)" },
  { value: "scan-line", label: "Escáner (escaneo 3D)" },
  { value: "sparkles", label: "Destellos (upgrades)" },
  { value: "ruler", label: "Regla (acabados)" },
  { value: "shopping-bag", label: "Bolsa (prototipos)" },
  { value: "printer", label: "Impresora" },
  { value: "package", label: "Paquete" },
  { value: "pencil-ruler", label: "Lápiz y regla" },
  { value: "graduation-cap", label: "Graduación (cursos)" },
  { value: "paintbrush", label: "Brocha (pintura)" },
  { value: "settings", label: "Engranaje" },
];

export const SITE_SERVICE_COLORS: { value: SiteServiceColor; label: string }[] = [
  { value: "orange", label: "Naranja" },
  { value: "teal", label: "Verde azulado" },
  { value: "wine", label: "Vino" },
];

function normColor(v: unknown): SiteServiceColor {
  return v === "teal" || v === "wine" ? v : "orange";
}

function normalize(row: Record<string, unknown>): SiteService {
  return {
    id: String(row["id"]),
    slug: String(row["slug"]),
    title: String(row["title"] ?? ""),
    lead: String(row["lead"] ?? ""),
    bullets: Array.isArray(row["bullets"])
      ? (row["bullets"] as unknown[]).filter((b): b is string => typeof b === "string")
      : [],
    color: normColor(row["color"]),
    icon: String(row["icon"] ?? "boxes"),
    kiara_tip: String(row["kiara_tip"] ?? ""),
    image_url: typeof row["image_url"] === "string" && row["image_url"] ? row["image_url"] : null,
    is_active: row["is_active"] !== false,
    sort_order: Number(row["sort_order"]) || 0,
  };
}

export async function fetchSiteServices(includeInactive = false): Promise<SiteService[]> {
  const base = supabase.from("site_services").select("*").order("sort_order");
  const { data, error } = await (includeInactive ? base : base.eq("is_active", true));
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
}

export const siteServicesQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: ["site-services", includeInactive],
    queryFn: () => fetchSiteServices(includeInactive),
    staleTime: 60_000,
  });

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
