import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Upload,
  Check,
  Eye,
  EyeOff,
  Film,
  Trash2,
  Copy,
  Layout,
  Plus,
  GripVertical,
  Sparkles,
  SlidersHorizontal,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CONTENT_TABS = [
  { value: "inicio", label: "Inicio" },
  { value: "nosotros", label: "Nosotros" },
  { value: "tienda", label: "Tienda y WhatsApp" },
] as const;

function tabOfGroup(group: string): (typeof CONTENT_TABS)[number]["value"] {
  if (group.includes("Nosotros")) return "nosotros";
  if (group.includes("Tienda") || group.includes("WhatsApp")) return "tienda";
  return "inicio";
}
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sanitizeWidgetId, parsePhotos, type PortfolioPhoto } from "@/components/InstagramFeed";
import { HomeSectionsOrder } from "@/components/HomeSectionsOrder";
import { parseHomeOrder } from "@/lib/home-sections";
import { ProductMedia, isVideoUrl } from "@/components/ProductMedia";
import { useSiteContent } from "@/hooks/use-site-content";
import { getActiveTheme } from "@/lib/theme";
import { getWhatsAppPayloadForButton } from "@/lib/whatsapp-buttons";
import { UnifiedButton } from "@/components/UnifiedButton";
import { Lottie } from "lottie-react";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/panel/contenido")({
  ssr: false,
  component: ContenidoAdmin,
});

function shortMediaName(url?: string): string {
  if (!url) return "logo Will (/logo.png)";
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "imagen";
    return last.slice(0, 35);
  } catch {
    return url.split("/").pop()?.split("?")[0]?.slice(0, 35) || "imagen";
  }
}

export type HeroStatItem = {
  id: string;
  k: string;
  v: string;
  action_type?: "none" | "link" | "whatsapp" | "cotizador";
  action_value?: string;
  whatsapp_message?: string;
  whatsapp_image_logic?: "auto" | "none" | "logo" | "product_image";
  color_id?: string;
  custom_hex?: string;
  media_url?: string;
  animation_type?: "none" | "image" | "video" | "gif" | "lottie";
  animation_style?: string;
  type?: "solid" | "gradient" | "imageFill" | "videoFill";
  bgImageUrl?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  overlayOpacity?: number;
  iconPosition?: "none" | "left" | "right";
  rounded?: "rounded-xl" | "rounded-2xl" | "rounded-3xl" | "rounded-full";
};

export function parseHeroStats(values: Record<string, string>): HeroStatItem[] {
  if (values.hero_stats) {
    try {
      const parsed = JSON.parse(values.hero_stats);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => {
          const bgUrl = item.bgImageUrl || item.media_url || "";
          const isVid = /\.(mp4|webm|quicktime)($|\?)/i.test(bgUrl);
          return {
            ...item,
            type: item.type || (bgUrl ? (isVid ? "videoFill" : "imageFill") : "solid"),
            bgImageUrl: bgUrl,
            media_url: bgUrl,
            gradientFrom: item.gradientFrom || "#f97316",
            gradientTo: item.gradientTo || "#db2777",
            gradientAngle: item.gradientAngle ?? 135,
            overlayOpacity: item.overlayOpacity ?? 45,
            iconPosition: item.iconPosition || "none",
            rounded: item.rounded || "rounded-2xl",
          };
        });
      }
    } catch {
      // fallback
    }
  }

  const legacy: HeroStatItem[] = [];
  for (let i = 1; i <= 6; i++) {
    const k = values[`hero_stat_${i}_k`]?.trim();
    const v = values[`hero_stat_${i}_v`]?.trim();
    if (k || v) {
      legacy.push({
        id: `stat_${i}`,
        k: k || "",
        v: v || "",
        action_type: "none",
        action_value: "",
        animation_type: "none",
        type: "solid",
        iconPosition: "none",
        rounded: "rounded-2xl",
      });
    }
  }
  return legacy.length > 0
    ? legacy
    : [
        { id: "stat_1", k: "50×50", v: "cm mínimo", action_type: "none", type: "solid", iconPosition: "none", rounded: "rounded-2xl" },
        { id: "stat_2", k: "1.8 m", v: "en una sola pieza", action_type: "none", type: "solid", iconPosition: "none", rounded: "rounded-2xl" },
        { id: "stat_3", k: "24/7", v: "atención y cotización", action_type: "none", type: "solid", iconPosition: "none", rounded: "rounded-2xl" },
      ];
}

export function MediaDropZone({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string, detectedType?: "imageFill" | "videoFill") => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("El archivo supera el límite máximo de 50MB");
      return;
    }
    setUploading(true);
    try {
      const path = `stats/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("site-media").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;

      const url = signed.data.signedUrl;
      const isVid = file.type.includes("video") || /\.(mp4|webm|quicktime)$/i.test(file.name);
      onChange(url, isVid ? "videoFill" : "imageFill");
      toast.success("Archivo subido con éxito");
    } catch (e) {
      toast.error("Error al subir archivo", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  const isVideo = value && /\.(mp4|webm|quicktime)($|\?)/i.test(value);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
          isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
        }`}
      >
        {value ? (
          <div className="relative w-full aspect-video max-h-36 overflow-hidden rounded-xl border border-border bg-black/50">
            {isVideo ? (
              <video src={value} autoPlay loop muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={value} alt="Preview" className="h-full w-full object-cover" />
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
              title="Eliminar multimedia"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer w-full py-3">
            <Upload className={`h-8 w-8 mb-2 ${uploading ? "animate-bounce text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs font-bold text-foreground">
              {uploading ? "Subiendo archivo..." : "Arrastra un archivo aquí o haz clic para buscar"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              Soporta: PNG, JPG, WEBP, GIF, MP4, WebM (Máx 50MB)
            </span>
            <input
              type="file"
              accept="image/*,video/*,.gif,.webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        )}
      </div>
    </div>
  );
}

type Row = { key: string; value: string };

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "images" | "switch" | "select" | "order" | "hero_stats" | "media";
  help?: string;
  section: string;
  group: string;
  options?: { value: string; label: string }[];
};

const FIELDS: FieldDef[] = [
  // Orden de la Página de Inicio (Home Builder)
  { key: "home_sections_order", label: "Orden de las Secciones del Inicio", type: "order", help: "Arrastra las secciones para decidir qué aparece primero al entrar a la página.", section: "Inicio", group: "Orden de Secciones" },

  // ---------------------------------------------------------------- Home Builder & Hero
  { key: "hero_title", label: "Título del Hero", type: "textarea", section: "Inicio", group: "Hero Principal" },
  { key: "hero_subtitle", label: "Subtítulo del Hero", type: "textarea", section: "Inicio", group: "Hero Principal" },
  {
    key: "hero_image_url",
    label: "Imagen del Hero (Respaldo)",
    type: "media",
    help: "Se usa como respaldo si el Carrusel Hero no tiene diapositivas activas.",
    section: "Inicio",
    group: "Hero Principal",
  },
  { key: "hero_badge_title", label: "Etiqueta Flotante (Pieza destacada)", type: "text", help: "Ej: Escultura 1.8 m — PLA reforzado", section: "Inicio", group: "Hero Principal" },

  // Botón Principal Hero
  { key: "hero_cta_text", label: "Texto Botón Principal Hero", type: "text", help: "Ej: Cotizar Proyecto", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_url", label: "Enlace/Ruta Botón Principal Hero", type: "text", help: "Ej: /cotizador o https://...", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_media_url", label: "Multimedia/Imagen Botón Principal Hero", type: "media", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_media_mode", label: "Modo multimedia Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_icon_url", label: "Ícono Botón Principal Hero", type: "media", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_icon_position", label: "Posición Ícono Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_text_color", label: "Color Texto Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_custom_hex", label: "Color Personalizado HEX Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  {
    key: "hero_cta_action_type",
    label: "Acción Botón Principal Hero",
    type: "select",
    section: "Inicio",
    group: "Hero Principal",
    options: [
      { value: "link", label: "Abrir Enlace / Ruta Interna" },
      { value: "whatsapp", label: "Abrir Chat de WhatsApp" },
      { value: "cotizador", label: "Abrir Cotizador Interactivo" },
    ],
  },
  {
    key: "hero_cta_whatsapp_message",
    label: "Mensaje WhatsApp Botón Principal",
    type: "textarea",
    help: "Si dejas vacío, se usa el mensaje por defecto. La imagen subida se adjunta automáticamente sin necesidad de escribir comandos.",
    section: "Inicio",
    group: "Hero Principal",
  },
  {
    key: "hero_cta_whatsapp_image_url",
    label: "Imagen Específica para WhatsApp Botón Principal",
    type: "media",
    section: "Inicio",
    group: "Hero Principal",
  },
  {
    key: "hero_cta_whatsapp_image_logic",
    label: "Lógica Imagen/Logo WhatsApp Botón Principal",
    type: "select",
    section: "Inicio",
    group: "Hero Principal",
    options: [
      { value: "auto", label: "Automático (Reglas CEO: Logo si es video, Imagen si existe)" },
      { value: "none", label: "Solo texto (mensaje limpio, sin enlace ni imagen)" },
      { value: "logo", label: "Forzar Enviar Logo de la Empresa" },
      { value: "product_image", label: "Enviar Imagen de la Sección / Producto" },
    ],
  },

  // Botón Secundario Hero
  { key: "hero_secondary_cta_text", label: "Texto Botón Secundario Hero", type: "text", help: "Ej: Ver tienda", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_url", label: "Enlace/Ruta Botón Secundario Hero", type: "text", help: "Ej: /tienda o https://...", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_media_url", label: "Multimedia Botón Secundario Hero", type: "media", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_media_mode", label: "Modo multimedia Botón Secundario Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_icon_url", label: "Ícono Botón Secundario Hero", type: "media", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_icon_position", label: "Posición Ícono Botón Secundario Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_text_color", label: "Color Texto Botón Secundario Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_custom_hex", label: "Color Personalizado HEX Botón Secundario Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  {
    key: "hero_secondary_cta_action_type",
    label: "Acción Botón Secundario Hero",
    type: "select",
    section: "Inicio",
    group: "Hero Principal",
    options: [
      { value: "link", label: "Abrir Enlace / Ruta Interna" },
      { value: "whatsapp", label: "Abrir Chat de WhatsApp" },
      { value: "cotizador", label: "Abrir Cotizador Interactivo" },
    ],
  },
  {
    key: "hero_secondary_cta_whatsapp_image_url",
    label: "Imagen Específica para WhatsApp Botón Secundario",
    type: "media",
    section: "Inicio",
    group: "Hero Principal",
  },
  {
    key: "hero_secondary_cta_whatsapp_message",
    label: "Mensaje WhatsApp Botón Secundario",
    type: "textarea",
    help: "Si dejas vacío, se usa el mensaje por defecto. La imagen subida se adjunta automáticamente sin necesidad de escribir comandos.",
    section: "Inicio",
    group: "Hero Principal",
  },
  {
    key: "hero_secondary_cta_whatsapp_image_logic",
    label: "Lógica Imagen/Logo WhatsApp Botón Secundario",
    type: "select",
    section: "Inicio",
    group: "Hero Principal",
    options: [
      { value: "auto", label: "Automático (Reglas CEO: Logo si es video, Imagen si existe)" },
      { value: "none", label: "Solo texto (mensaje limpio, sin enlace ni imagen)" },
      { value: "logo", label: "Forzar Enviar Logo de la Empresa" },
      { value: "product_image", label: "Enviar Imagen de la Sección / Producto" },
    ],
  },

  // Estadísticas del Hero
  {
    key: "hero_stats",
    label: "Botones de Acción y Estadísticas del Hero",
    type: "hero_stats",
    help: "Reordena por Drag & Drop, asigna colores de la paleta del tema, animaciones (Lottie/Video/GIF) y acciones clickeables.",
    section: "Inicio",
    group: "Estadísticas del Hero",
  },

  // Portafolio e Instagram
  { key: "show_manual_gallery", label: "Mostrar Galería Manual de Portafolio", type: "switch", help: "Se muestra si está activo y hay al menos una foto/video subida.", section: "Inicio", group: "Portafolio y Redes" },
  { key: "show_instagram_widget", label: "Mostrar Widget de Instagram en Vivo", type: "switch", help: "Se muestra si está activo y el ID del widget Elfsight es válido.", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_display_order", label: "Orden de Visualización del Portafolio", type: "select", help: "Decide cuál sección del portafolio aparece primero.", section: "Inicio", group: "Portafolio y Redes", options: [
    { value: "manual_first", label: "Fotos manuales primero, luego Instagram" },
    { value: "instagram_first", label: "Instagram primero, luego fotos manuales" },
  ] },

  { key: "portfolio_images", label: "Fotos y Videos del Portafolio Manual (Drag & Drop)", type: "images", help: "Arrastra para reordenar las imágenes del portafolio. Se muestran en el inicio y en /galeria.", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_chip", label: "Etiqueta / Chip Galería Manual", type: "text", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_title", label: "Título Sección Galería Manual", type: "text", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_subtitle", label: "Subtítulo Galería Manual", type: "textarea", section: "Inicio", group: "Portafolio y Redes" },

  { key: "elfsight_instagram_id", label: "ID del Widget de Instagram (Elfsight)", type: "text", help: "Ej: elfsight-app-abc123", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_live_chip", label: "Etiqueta / Chip Widget Instagram", type: "text", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_live_title", label: "Título Widget Instagram", type: "text", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_live_subtitle", label: "Subtítulo Widget Instagram", type: "textarea", help: "Soporta interpolación con @handle", section: "Inicio", group: "Portafolio y Redes" },

  { key: "portfolio_empty_title", label: "Título Estado Vacío Portafolio", type: "text", section: "Inicio", group: "Portafolio y Redes" },
  { key: "portfolio_empty_subtitle", label: "Subtítulo Estado Vacío Portafolio", type: "textarea", section: "Inicio", group: "Portafolio y Redes" },

  // Sección Productos Destacados
  { key: "featured_products_title", label: "Título Sección Productos Destacados", type: "text", section: "Inicio", group: "Productos Destacados" },
  { key: "featured_products_subtitle", label: "Subtítulo Sección Productos Destacados", type: "textarea", section: "Inicio", group: "Productos Destacados" },

  // Sección Nosotros
  { key: "about_chip", label: "Etiqueta / Chip 'Nosotros'", type: "text", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_title", label: "Título Principal 'Nosotros'", type: "text", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_subtitle", label: "Subtítulo / Bajada 'Nosotros'", type: "textarea", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_short", label: "Descripción Corta 'Nosotros'", type: "textarea", help: "Resumen que se muestra en la página principal.", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_long", label: "Descripción Detallada 'Nosotros'", type: "textarea", help: "Texto extendido que se muestra en la página /nosotros.", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_image_url", label: "Imagen Principal 'Nosotros'", type: "media", help: "Imagen destacada del taller o equipo.", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_stats", label: "Métricas y Logros Destacados 'Nosotros'", type: "hero_stats", help: "Añade logros y estadísticas para mostrar en la sección Nosotros.", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_text", label: "Texto del Botón 'Nosotros'", type: "text", help: "Ej: Conoce más sobre nosotros", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_url", label: "Enlace del Botón 'Nosotros'", type: "text", help: "Ej: /nosotros o https://...", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_media_url", label: "Multimedia Botón 'Nosotros'", type: "media", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_media_mode", label: "Modo multimedia Botón 'Nosotros'", type: "text", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_icon_url", label: "Ícono Botón 'Nosotros'", type: "media", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_icon_position", label: "Posición Ícono Botón 'Nosotros'", type: "text", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_text_color", label: "Color Texto Botón 'Nosotros'", type: "text", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_custom_hex", label: "Color Personalizado HEX Botón 'Nosotros'", type: "text", section: "Inicio", group: "Sección Nosotros" },
  {
    key: "about_cta_action_type",
    label: "Acción Botón 'Nosotros'",
    type: "select",
    section: "Inicio",
    group: "Sección Nosotros",
    options: [
      { value: "link", label: "Abrir Enlace / Ruta Interna" },
      { value: "whatsapp", label: "Abrir Chat de WhatsApp" },
      { value: "cotizador", label: "Abrir Cotizador Interactivo" },
    ],
  },
  {
    key: "about_cta_whatsapp_message",
    label: "Mensaje WhatsApp Botón 'Nosotros'",
    type: "textarea",
    help: "Si dejas vacío, se usa el mensaje por defecto. La imagen subida se adjunta automáticamente sin necesidad de escribir comandos.",
    section: "Inicio",
    group: "Sección Nosotros",
  },
  {
    key: "about_cta_whatsapp_image_url",
    label: "Imagen Específica para WhatsApp Botón 'Nosotros'",
    type: "media",
    section: "Inicio",
    group: "Sección Nosotros",
  },
  {
    key: "about_cta_whatsapp_image_logic",
    label: "Lógica Imagen/Logo WhatsApp Botón 'Nosotros'",
    type: "select",
    section: "Inicio",
    group: "Sección Nosotros",
    options: [
      { value: "auto", label: "Automático (Reglas CEO: Logo si es video, Imagen si existe)" },
      { value: "none", label: "Solo texto (mensaje limpio, sin enlace ni imagen)" },
      { value: "logo", label: "Forzar Enviar Logo de la Empresa" },
      { value: "product_image", label: "Enviar Imagen de la Sección / Producto" },
    ],
  },

  // Sección Nosotros Página - Misión, Visión, Valores, Kiara y Taller
  { key: "about_mission_title", label: "Título Misión", type: "text", help: "Default: Misión", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_text", label: "Texto Misión", type: "textarea", help: "Default: Democratizar la impresión 3D en Colombia con calidad profesional, precios justos y asesoría real.", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_image_url", label: "Multimedia / GIF / Video Misión", type: "media", help: "Soporta imágenes, GIF, video MP4/WebM o Lottie JSON", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_text", label: "Texto Botón Misión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_url", label: "Enlace Botón Misión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_media_url", label: "Multimedia Botón Misión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_media_mode", label: "Modo multimedia Botón Misión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_icon_url", label: "Ícono Botón Misión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_icon_position", label: "Posición Ícono Botón Misión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_text_color", label: "Color Texto Botón Misión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_custom_hex", label: "Color Personalizado HEX Botón Misión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  {
    key: "about_mission_cta_action_type",
    label: "Acción Botón Misión",
    type: "select",
    section: "Inicio",
    group: "Nosotros Página Misión Visión",
    options: [
      { value: "link", label: "Abrir Enlace / Ruta Interna" },
      { value: "whatsapp", label: "Abrir Chat de WhatsApp" },
      { value: "cotizador", label: "Abrir Cotizador Interactivo" },
    ],
  },
  { key: "about_mission_cta_whatsapp_message", label: "Mensaje WhatsApp Botón Misión", type: "textarea", help: "La imagen subida se adjunta automáticamente sin necesidad de escribir comandos.", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_mission_cta_whatsapp_image_url", label: "Imagen Específica WhatsApp Botón Misión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
  {
    key: "about_mission_cta_whatsapp_image_logic",
    label: "Lógica Imagen/Logo WhatsApp Botón Misión",
    type: "select",
    section: "Inicio",
    group: "Nosotros Página Misión Visión",
    options: [
      { value: "auto", label: "Automático (Reglas CEO: Logo si es video, Imagen si existe)" },
      { value: "none", label: "Solo texto (mensaje limpio, sin enlace ni imagen)" },
      { value: "logo", label: "Forzar Enviar Logo de la Empresa" },
      { value: "product_image", label: "Enviar Imagen de la Sección / Producto" },
    ],
  },

  { key: "about_vision_title", label: "Título Visión", type: "text", help: "Default: Visión", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_text", label: "Texto Visión", type: "textarea", help: "Default: Ser el referente colombiano en impresión 3D de gran formato...", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_image_url", label: "Multimedia / GIF / Video Visión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_text", label: "Texto Botón Visión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_url", label: "Enlace Botón Visión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_media_url", label: "Multimedia Botón Visión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_media_mode", label: "Modo multimedia Botón Visión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_icon_url", label: "Ícono Botón Visión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_icon_position", label: "Posición Ícono Botón Visión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_text_color", label: "Color Texto Botón Visión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_custom_hex", label: "Color Personalizado HEX Botón Visión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  {
    key: "about_vision_cta_action_type",
    label: "Acción Botón Visión",
    type: "select",
    section: "Inicio",
    group: "Nosotros Página Misión Visión",
    options: [
      { value: "link", label: "Abrir Enlace / Ruta Interna" },
      { value: "whatsapp", label: "Abrir Chat de WhatsApp" },
      { value: "cotizador", label: "Abrir Cotizador Interactivo" },
    ],
  },
  { key: "about_vision_cta_whatsapp_message", label: "Mensaje WhatsApp Botón Visión", type: "textarea", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_whatsapp_image_url", label: "Imagen Específica WhatsApp Botón Visión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
  {
    key: "about_vision_cta_whatsapp_image_logic",
    label: "Lógica Imagen/Logo WhatsApp Botón Visión",
    type: "select",
    section: "Inicio",
    group: "Nosotros Página Misión Visión",
    options: [
      { value: "auto", label: "Automático (Reglas CEO: Logo si es video, Imagen si existe)" },
      { value: "none", label: "Solo texto (mensaje limpio, sin enlace ni imagen)" },
      { value: "logo", label: "Forzar Enviar Logo de la Empresa" },
      { value: "product_image", label: "Enviar Imagen de la Sección / Producto" },
    ],
  },

  { key: "about_values_title", label: "Título Sección Valores", type: "text", help: "Default: Valores", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_values_text", label: "Texto / Descripción Valores", type: "textarea", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_values_items", label: "Lista de Valores (Drag & Drop)", type: "hero_stats", help: "Define cada valor con título, descripción e icono/multimedia.", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_values_image_url", label: "Multimedia Fondo / Ilustración Valores", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },

  { key: "about_kiara_title", label: "Título Sección Kiara", type: "text", help: "Default: Kiara, nuestra directora de operaciones 🐾", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_kiara_subtitle", label: "Etiqueta / Bajada Kiara", type: "text", help: "Default: La verdadera jefa", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_kiara_text", label: "Historia / Descripción de Kiara", type: "textarea", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_kiara_image_url", label: "Foto / GIF / Video de Kiara", type: "media", help: "Reemplaza la foto estática kiara.jpg", section: "Inicio", group: "Nosotros Página Misión Visión" },

  { key: "about_workshop_title", label: "Título Sección Taller", type: "text", help: "Default: Equipo profesional en Bogotá", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_workshop_text", label: "Texto Sección Taller", type: "textarea", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_workshop_items", label: "Equipamiento del Taller (Drag & Drop)", type: "hero_stats", help: "Lista de máquinas y capacidades del taller.", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_workshop_image_url", label: "Foto / GIF / Video del Taller", type: "media", help: "Reemplaza el degradado por multimedia del taller o logo", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_workshop_address", label: "Ubicación / Dirección del Taller", type: "text", help: "Default: Bogotá, Colombia · Atención por cita previa.", section: "Inicio", group: "Nosotros Página Misión Visión" },

  { key: "whatsapp_default_message", label: "Mensaje WhatsApp Global Por Defecto", type: "textarea", help: "Mensaje enviado si un botón de WhatsApp no especifica mensaje personalizado.", section: "Tienda", group: "Configuración Mensajes WhatsApp" },

  // Cabecera de la Tienda (/tienda)
  { key: "store_chip", label: "Etiqueta / Chip de la Tienda", type: "text", help: "Ej: Tienda", section: "Tienda", group: "Cabecera de la Tienda" },
  { key: "store_title", label: "Título de la Tienda", type: "text", help: "Ej: Todo para tu taller 3D", section: "Tienda", group: "Cabecera de la Tienda" },
  { key: "store_subtitle", label: "Descripción de la Tienda", type: "textarea", help: "Ej: Marcas líderes con soporte y asesoría en Bogotá.", section: "Tienda", group: "Cabecera de la Tienda" },
];

function LottiePreview({ url }: { url: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) setData(json);
      })
      .catch(() => {
        if (isMounted) setData(null);
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!data) return null;
  return <Lottie src={data} autoplay loop className="h-5 w-5" />;
}

function SortableHeroStatCard({
  item,
  index,
  palette,
  onUpdate,
  onRemove,
}: {
  item: HeroStatItem;
  index: number;
  palette: Array<{ id: string; name: string; hex: string }>;
  onUpdate: (patch: Partial<HeroStatItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  let resolvedBg = "";
  if (item.color_id === "custom") {
    resolvedBg = item.custom_hex || "";
  } else if (item.color_id) {
    const found = palette.find((p) => p.id === item.color_id);
    if (found) resolvedBg = found.hex;
  }

  const type = item.type || (item.bgImageUrl || item.media_url ? (/\.(mp4|webm|quicktime)($|\?)/i.test(item.bgImageUrl || item.media_url || "") ? "videoFill" : "imageFill") : "solid");
  const bgUrl = item.bgImageUrl || item.media_url || "";
  const roundedClass = item.rounded || "rounded-2xl";
  const overlayOp = (item.overlayOpacity ?? 45) / 100;
  const iconPos = item.iconPosition || "none";

  let previewStyle: React.CSSProperties = {};
  if (type === "gradient") {
    previewStyle.background = `linear-gradient(${item.gradientAngle ?? 135}deg, ${item.gradientFrom || "#f97316"}, ${item.gradientTo || "#db2777"})`;
  } else if (type === "solid") {
    if (resolvedBg) {
      previewStyle.borderColor = `${resolvedBg}40`;
      previewStyle.backgroundColor = `${resolvedBg}15`;
    }
  }

  const iconMedia = bgUrl && iconPos !== "none" && (
    <span className="shrink-0 inline-flex items-center justify-center">
      {item.animation_type === "lottie" ? (
        <LottiePreview url={bgUrl} />
      ) : item.animation_type === "video" || /\.(mp4|webm|quicktime)($|\?)/i.test(bgUrl) ? (
        <video src={bgUrl} autoPlay loop muted playsInline className="h-4 w-4 rounded-full object-cover" />
      ) : (
        <img src={bgUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
      )}
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
            title="Arrastrar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Elemento {index + 1}
          </span>
        </div>

        {/* Live Preview Card */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={previewStyle}
            className={`relative overflow-hidden isolate border border-border px-4 py-2 text-center shadow-2xs min-w-[120px] min-h-[50px] flex flex-col items-center justify-center ${roundedClass} ${
              item.animation_style && item.animation_style !== "none" ? `theme-anim-${item.animation_style}` : ""
            }`}
          >
            {type === "videoFill" && bgUrl && (
              <video src={bgUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover -z-20" />
            )}
            {type === "imageFill" && bgUrl && (
              <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover -z-20" />
            )}
            {(type === "videoFill" || type === "imageFill" || type === "gradient") && (
              <div className="absolute inset-0 bg-black -z-10" style={{ opacity: overlayOp }} />
            )}

            <div className={`relative z-10 flex items-center justify-center gap-1.5 font-black text-sm ${type !== "solid" ? "text-white drop-shadow-md" : ""}`} style={type === "solid" ? { color: resolvedBg || "var(--brand-wine)" } : undefined}>
              {iconPos === "left" && iconMedia}
              {item.k || "50×50"}
              {iconPos === "right" && iconMedia}
            </div>
            <div className={`relative z-10 text-[10px] truncate max-w-[120px] ${type !== "solid" ? "text-white/90 drop-shadow-xs" : "text-muted-foreground"}`}>
              {item.v || "cm mínimo"}
            </div>
          </motion.div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            title="Eliminar elemento"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs font-semibold">Valor / Título Destacado (k)</Label>
          <Input
            value={item.k}
            onChange={(e) => onUpdate({ k: e.target.value })}
            placeholder="Ej: 50×50"
            className="mt-1 text-xs"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold">Descripción Corta (v)</Label>
          <Input
            value={item.v}
            onChange={(e) => onUpdate({ v: e.target.value })}
            placeholder="Ej: cm mínimo"
            className="mt-1 text-xs"
          />
        </div>

        <div className="sm:col-span-2 rounded-xl border border-dashed p-4 space-y-3 bg-muted/30">
          <p className="text-xs font-bold uppercase tracking-wider mb-2">🎯 Acción Clickeable: {item.k || 'Sin texto'}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold">Acción</Label>
              <Select
                value={item.action_type || "none"}
                onValueChange={(val: any) => onUpdate({ action_type: val })}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin Acción (Texto Estático)</SelectItem>
                  <SelectItem value="link">Abrir Enlace / URL</SelectItem>
                  <SelectItem value="whatsapp">Abrir Chat de WhatsApp</SelectItem>
                  <SelectItem value="cotizador">Abrir Cotizador Interactivo (/cotizador)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {item.action_type === "cotizador" && (
              <div className="sm:col-span-2 rounded-lg bg-background/50 border border-border/60 p-2.5 text-xs text-muted-foreground">
                Esta estadística redirige directamente a la experiencia del Cotizador 3D en <code className="font-mono text-primary font-bold">/cotizador</code>.
              </div>
            )}

            {item.action_type && item.action_type !== "none" && item.action_type !== "cotizador" && (
              <div>
                <Label className="text-xs font-semibold">
                  {item.action_type === "link" ? "URL o Ruta de Destino" : "Número de WhatsApp (Opcional)"}
                </Label>
                <Input
                  value={item.action_value || ""}
                  onChange={(e) => onUpdate({ action_value: e.target.value })}
                  placeholder={item.action_type === "link" ? "/servicios o https://..." : "573156724474"}
                  className="mt-1 text-xs"
                />
              </div>
            )}

            {item.action_type === "whatsapp" && (
              <>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold">Mensaje WhatsApp Personalizado</Label>
                  <Textarea
                    rows={2}
                    value={item.whatsapp_message || ""}
                    onChange={(e) => onUpdate({ whatsapp_message: e.target.value })}
                    placeholder={`Hola Will Design 3D, me interesa la consulta sobre: ${item.k || ""} (${item.v || ""}).`}
                    className="text-xs resize-y"
                  />
                  <p className="text-[11px] text-muted-foreground">La imagen subida se adjunta automáticamente al final del mensaje.</p>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Lógica de Logo / Imagen / Video</Label>
                  <Select
                    value={item.whatsapp_image_logic || "auto"}
                    onValueChange={(val: any) => onUpdate({ whatsapp_image_logic: val })}
                  >
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático (Reglas CEO: Logo si es video, Imagen si existe)</SelectItem>
                      <SelectItem value="none">Solo texto (mensaje limpio, sin enlace ni imagen)</SelectItem>
                      <SelectItem value="logo">Forzar Enviar Logo de la Empresa</SelectItem>
                      <SelectItem value="product_image">Enviar Imagen de la Sección / Producto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Live WhatsApp Message Preview Box */}
                <div className="sm:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1 text-xs">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    💬 Así se verá en WhatsApp:
                  </span>
                  <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px]">
                    {getWhatsAppPayloadForButton(
                      { whatsapp_message: item.whatsapp_message, whatsapp_image_logic: item.whatsapp_image_logic },
                      bgUrl,
                      null,
                      `Hola Will Design 3D, me interesa la consulta sobre: ${item.k || ""} (${item.v || ""}).`
                    ).formattedText || `Hola Will Design 3D, me interesa la consulta sobre: ${item.k || ""} (${item.v || ""}).`}
                  </p>
                  <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>📎 Adjunto: {shortMediaName(
                      getWhatsAppPayloadForButton(
                        { whatsapp_message: item.whatsapp_message, whatsapp_image_logic: item.whatsapp_image_logic },
                        bgUrl
                      ).mediaToSend
                    )}</span>
                    {getWhatsAppPayloadForButton(
                      { whatsapp_message: item.whatsapp_message, whatsapp_image_logic: item.whatsapp_image_logic },
                      bgUrl
                    ).mediaToSend.includes("logo") || getWhatsAppPayloadForButton(
                      { whatsapp_message: item.whatsapp_message, whatsapp_image_logic: item.whatsapp_image_logic },
                      bgUrl
                    ).mediaToSend.startsWith("/") ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        logo
                      </span>
                    ) : null}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold">Tipo de Fondo / Estilo Visual</Label>
          <Select
            value={type}
            onValueChange={(val: any) => onUpdate({ type: val })}
          >
            <SelectTrigger className="mt-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Fondo Sólido / Paleta del Tema</SelectItem>
              <SelectItem value="gradient">Degradé / Gradiente Personalizado</SelectItem>
              <SelectItem value="imageFill">Imagen Completa (Fondo Vivo)</SelectItem>
              <SelectItem value="videoFill">Video Loop Completo (Fondo Vivo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold">Bordes Redondeados</Label>
          <Select
            value={roundedClass}
            onValueChange={(val: any) => onUpdate({ rounded: val })}
          >
            <SelectTrigger className="mt-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rounded-xl">Redondeado XL (rounded-xl)</SelectItem>
              <SelectItem value="rounded-2xl">Redondeado 2XL (rounded-2xl)</SelectItem>
              <SelectItem value="rounded-3xl">Redondeado 3XL (rounded-3xl)</SelectItem>
              <SelectItem value="rounded-full">Píldora Completa (rounded-full)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === "solid" && (
          <div>
            <Label className="text-xs font-semibold">Color Acento (Paleta del Tema / HEX)</Label>
            <Select
              value={item.color_id || ""}
              onValueChange={(val) => onUpdate({ color_id: val })}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue placeholder="Color del Tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Por Defecto (Burgundy)</SelectItem>
                {palette.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name} ({col.hex})
                  </SelectItem>
                ))}
                <SelectItem value="custom">Color Personalizado (HEX Libre)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {type === "solid" && item.color_id === "custom" && (
          <div>
            <Label className="text-xs font-semibold">HEX Libre</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={item.custom_hex?.startsWith("#") ? item.custom_hex : "#f97316"}
                onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded-lg border border-input p-0"
              />
              <Input
                type="text"
                value={item.custom_hex || ""}
                onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                placeholder="#FF0000"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>
        )}

        {type === "gradient" && (
          <>
            <div>
              <Label className="text-xs font-semibold">Color Inicial (Gradient From)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={item.gradientFrom?.startsWith("#") ? item.gradientFrom : "#f97316"}
                  onChange={(e) => onUpdate({ gradientFrom: e.target.value })}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-input p-0"
                />
                <Input
                  type="text"
                  value={item.gradientFrom || "#f97316"}
                  onChange={(e) => onUpdate({ gradientFrom: e.target.value })}
                  placeholder="#f97316"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Color Final (Gradient To)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={item.gradientTo?.startsWith("#") ? item.gradientTo : "#db2777"}
                  onChange={(e) => onUpdate({ gradientTo: e.target.value })}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-input p-0"
                />
                <Input
                  type="text"
                  value={item.gradientTo || "#db2777"}
                  onChange={(e) => onUpdate({ gradientTo: e.target.value })}
                  placeholder="#db2777"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold">Ángulo del Gradiente: {item.gradientAngle ?? 135}°</Label>
              <input
                type="range"
                min={0}
                max={360}
                value={item.gradientAngle ?? 135}
                onChange={(e) => onUpdate({ gradientAngle: Number(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary mt-2"
              />
            </div>
          </>
        )}
      </div>

      {/* Media Drag & Drop Zone for ImageFill / VideoFill / Icon Media */}
      {(type === "imageFill" || type === "videoFill" || item.iconPosition !== "none") && (
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5 text-primary" />
            Multimedia / Fondo Vivo ({type === "videoFill" ? "Video MP4/WebM" : "Imagen/GIF"})
          </Label>
          <MediaDropZone
            value={bgUrl}
            onChange={(url, detectedType) =>
              onUpdate({
                bgImageUrl: url,
                media_url: url,
                type: detectedType || type,
              })
            }
          />
        </div>
      )}

      {/* Overlay & Icon Position Settings */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Accesibilidad & Posición de Ícono
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-semibold">Posición del Ícono / Miniatura</Label>
            <Select
              value={iconPos}
              onValueChange={(val: any) => onUpdate({ iconPosition: val })}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin Ícono (Solo Fondo 100% Vivo)</SelectItem>
                <SelectItem value="left">A la Izquierda del Texto</SelectItem>
                <SelectItem value="right">A la Derecha del Texto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Efecto Resplandor / Glow</Label>
            <Select
              value={item.animation_style || "none"}
              onValueChange={(val) => onUpdate({ animation_style: val })}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin Resplandor</SelectItem>
                <SelectItem value="neon_glow">Neón Cyberpunk ⚡</SelectItem>
                <SelectItem value="cyber_pulse">Pulso Dinámico 💫</SelectItem>
                <SelectItem value="shimmer">Brillo Shimmer ✨</SelectItem>
                <SelectItem value="festive_sparkle">Destello Festivo 🌟</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(type === "imageFill" || type === "videoFill" || type === "gradient") && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <Label className="text-xs font-semibold">Oscurecimiento Overlay (Legibilidad WCAG):</Label>
              <span className="font-mono text-primary font-bold">{item.overlayOpacity ?? 45}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={75}
              value={item.overlayOpacity ?? 45}
              onChange={(e) => onUpdate({ overlayOpacity: Number(e.target.value) })}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SortablePortfolioCard({
  photo,
  index,
  total,
  onUpdateLink,
  onToggleVisible,
  onRemove,
}: {
  photo: PortfolioPhoto;
  index: number;
  total: number;
  onUpdateLink: (url: string) => void;
  onToggleVisible: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs ${
        isDragging ? "z-10 shadow-xl" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1.5 text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted"
        title="Arrastrar para reordenar elemento del portafolio"
      >
        <GripVertical className="h-5 w-5 text-primary" />
      </button>

      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
        #{index + 1}
      </span>

      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
        <ProductMedia
          src={photo.url}
          thumb={true}
          className={`h-full w-full object-cover ${photo.is_visible !== false ? "" : "opacity-40"}`}
        />
        {isVideoUrl(photo.url) && (
          <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-md bg-black/70 px-1 py-0.5 text-[10px] font-bold text-white">
            <Film className="h-3 w-3" />
          </span>
        )}
        {photo.is_visible === false && (
          <span className="absolute top-1 left-1 rounded-md bg-foreground/80 px-1 py-0.5 text-[9px] font-bold text-background">
            Oculto
          </span>
        )}
      </div>

      <div className="w-full flex-1 space-y-1">
        <Label className="text-xs text-muted-foreground">
          Enlace de acción o destino (opcional)
        </Label>
        <Input
          type="text"
          placeholder="Ej: /tienda/lampara-luna o https://..."
          className="h-9 text-xs"
          value={photo.link_url ?? ""}
          onChange={(e) => onUpdateLink(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onToggleVisible}
          title={photo.is_visible !== false ? "Ocultar elemento" : "Mostrar elemento"}
        >
          {photo.is_visible !== false ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
          title="Eliminar elemento"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

function PortfolioGalleryEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const photos = parsePhotos(value);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = photos.findIndex((p) => p.id === active.id);
    const newIdx = photos.findIndex((p) => p.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      onChange(JSON.stringify(arrayMove(photos, oldIdx, newIdx)));
    }
  }

  function handleUpdateLink(index: number, link: string) {
    const next = photos.map((p, i) => (i === index ? { ...p, link_url: link ? link : undefined } : p));
    onChange(JSON.stringify(next));
  }

  function handleToggleVisible(index: number) {
    const next = photos.map((p, i) => (i === index ? { ...p, is_visible: !p.is_visible } : p));
    onChange(JSON.stringify(next));
  }

  function handleRemove(index: number) {
    const next = photos.filter((_, i) => i !== index);
    onChange(JSON.stringify(next));
  }

  return (
    <div className="space-y-3">
      <MediaDropZone
        value=""
        onChange={(url) => {
          if (url) {
            const newItem: PortfolioPhoto = { id: crypto.randomUUID(), url, is_visible: true };
            onChange(JSON.stringify([...photos, newItem]));
          }
        }}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {photos.map((photo, idx) => (
              <SortablePortfolioCard
                key={photo.id}
                photo={photo}
                index={idx}
                total={photos.length}
                onUpdateLink={(link) => handleUpdateLink(idx, link)}
                onToggleVisible={() => handleToggleVisible(idx)}
                onRemove={() => handleRemove(idx)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {photos.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No hay elementos subidos en el portafolio manual. Arrastra archivos arriba o haz clic para subir.
        </div>
      )}
    </div>
  );
}

function HeroStatsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (newValue: string) => void;
}) {
  const { content } = useSiteContent();
  const activeTheme = getActiveTheme(content);
  const palette = activeTheme.colors.palette || [];
  const items = parseHeroStats({ hero_stats: value });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleUpdateItem(id: string, patch: Partial<HeroStatItem>) {
    const updated = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
    onChange(JSON.stringify(updated));
  }

  function handleRemoveItem(id: string) {
    const updated = items.filter((it) => it.id !== id);
    onChange(JSON.stringify(updated));
  }

  function handleAddItem() {
    const newItem: HeroStatItem = {
      id: `stat_${Date.now()}`,
      k: "Nuevo Valor",
      v: "Descripción",
      action_type: "none",
    };
    onChange(JSON.stringify([...items, newItem]));
    toast.success("Nuevo elemento añadido");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((it) => it.id === active.id);
    const newIndex = items.findIndex((it) => it.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(JSON.stringify(arrayMove(items, oldIndex, newIndex)));
    }
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <SortableHeroStatCard
                key={it.id}
                item={it}
                index={idx}
                palette={palette}
                onUpdate={(patch) => handleUpdateItem(it.id, patch)}
                onRemove={() => handleRemoveItem(it.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="mt-2 text-xs font-bold">
        <Plus className="mr-1.5 h-3.5 w-3.5" /> + Añadir elemento
      </Button>
    </div>
  );
}

function CTAButtonGroup({
  prefix,
  values,
  setValues,
  uploadingKey,
  uploadImage,
  onDuplicate,
  onDelete,
}: {
  prefix: "hero_cta_" | "hero_secondary_cta_" | "about_cta_" | "about_mission_cta_" | "about_vision_cta_";
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  uploadingKey: string | null;
  uploadImage: (key: string, file: File) => Promise<void>;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const textKey = `${prefix}text`;
  const urlKey = `${prefix}url`;
  const mediaKey = `${prefix}media_url`;
  const mediaModeKey = `${prefix}media_mode`;
  const iconUrlKey = `${prefix}icon_url`;
  const iconPosKey = `${prefix}icon_position`;
  const textColorKey = `${prefix}text_color`;
  const customHexKey = `${prefix}custom_hex`;
  const actionTypeKey = `${prefix}action_type`;
  const messageKey = `${prefix}whatsapp_message`;
  const logicKey = `${prefix}whatsapp_image_logic`;
  const waImageKey = `${prefix}whatsapp_image_url`;

  const ctaText = values[textKey] || "";
  const actionType = values[actionTypeKey] || (prefix.includes("cta_") && !prefix.includes("secondary") ? "cotizador" : "link");
  const whatsappMsg = values[messageKey] || "";
  const whatsappLogic = values[logicKey] || "auto";
  const whatsappImageUrl = values[waImageKey] || "";
  const mediaUrl = values[mediaKey] || "";
  const mediaMode = (values[mediaModeKey] as any) || "fill";
  const iconUrl = values[iconUrlKey] || "";
  const iconPos = (values[iconPosKey] as any) || "none";
  const textColor = values[textColorKey] || "";
  const customHex = values[customHexKey] || "";

  const globalDefaultMsg = values["whatsapp_default_message"] || "";

  const payload = getWhatsAppPayloadForButton(
    {
      whatsapp_message: whatsappMsg,
      whatsapp_image_logic: whatsappLogic,
      whatsapp_image_url: whatsappImageUrl,
    },
    mediaUrl || values["hero_image_url"] || "",
    values["site_logo_url"],
    "Hola Will, me interesa cotizar...",
    globalDefaultMsg
  );

  const isVid = /\.(mp4|webm|quicktime)($|\?)/i.test(mediaUrl);
  const isGif = /\.gif($|\?)/i.test(mediaUrl);
  const isLottie = /\.json($|\?)/i.test(mediaUrl);
  const animType = isVid ? "video" : isGif ? "gif" : isLottie ? "lottie" : mediaUrl ? "image" : "none";

  function handleDuplicateInternal() {
    if (onDuplicate) {
      onDuplicate();
      return;
    }
    if (prefix === "hero_cta_") {
      setValues((v) => ({
        ...v,
        hero_secondary_cta_text: v.hero_cta_text ? `${v.hero_cta_text} (Copia)` : "Botón Secundario",
        hero_secondary_cta_url: v.hero_cta_url || "",
        hero_secondary_cta_action_type: v.hero_cta_action_type || "link",
        hero_secondary_cta_media_url: v.hero_cta_media_url || "",
        hero_secondary_cta_media_mode: v.hero_cta_media_mode || "fill",
        hero_secondary_cta_icon_url: v.hero_cta_icon_url || "",
        hero_secondary_cta_icon_position: v.hero_cta_icon_position || "none",
        hero_secondary_cta_text_color: v.hero_cta_text_color || "",
        hero_secondary_cta_custom_hex: v.hero_cta_custom_hex || "",
        hero_secondary_cta_whatsapp_message: v.hero_cta_whatsapp_message || "",
        hero_secondary_cta_whatsapp_image_url: v.hero_cta_whatsapp_image_url || "",
        hero_secondary_cta_whatsapp_image_logic: v.hero_cta_whatsapp_image_logic || "auto",
      }));
      toast.success("Botón duplicado como botón secundario en Hero");
    } else {
      toast.info("Configuración del botón clonada");
    }
  }

  function handleDeleteInternal() {
    if (onDelete) {
      onDelete();
      return;
    }
    setValues((v) => {
      const copy = { ...v };
      delete copy[textKey];
      delete copy[urlKey];
      delete copy[mediaKey];
      delete copy[mediaModeKey];
      delete copy[iconUrlKey];
      delete copy[iconPosKey];
      delete copy[textColorKey];
      delete copy[customHexKey];
      delete copy[actionTypeKey];
      delete copy[messageKey];
      delete copy[logicKey];
      delete copy[waImageKey];
      return copy;
    });
    toast.success("Botón limpiado/eliminado");
  }

  return (
    <div className="rounded-2xl border border-dashed border-border p-5 space-y-6 bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            Botón: {ctaText || "Sin texto definido"}
          </p>
        </div>

        {/* Acciones de gestión de botón: Duplicar y Eliminar/Limpiar */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDuplicateInternal}
            className="h-8 text-xs font-semibold gap-1.5"
            title="Duplicar configuración de este botón"
          >
            <Copy className="h-3.5 w-3.5 text-primary" />
            Duplicar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDeleteInternal}
            className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1.5"
            title="Eliminar o limpiar este botón"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {prefix === "hero_secondary_cta_" ? "Eliminar" : "Limpiar"}
          </Button>

          {/* Live UnifiedButton Preview */}
          <div className="shrink-0 flex items-center gap-2 border-l border-border pl-3 ml-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Vista previa:</span>
            <UnifiedButton
              button={{
                id: prefix,
                text: ctaText || "Vista Previa",
                action_type: actionType === "cotizador" ? "link" : (actionType as any),
                action_value: values[urlKey] || "/cotizador",
                whatsapp_message: whatsappMsg,
                text_color: textColor || undefined,
                custom_hex: customHex || (prefix.includes("mission")
                  ? "var(--brand-orange)"
                  : prefix.includes("vision")
                  ? "var(--brand-teal)"
                  : prefix.includes("secondary")
                  ? "var(--brand-wine)"
                  : "var(--brand-orange)"),
                media_url: mediaMode === "fill" ? mediaUrl : undefined,
                media_mode: mediaMode,
                icon_url: iconUrl || (mediaMode === "icon" ? mediaUrl : undefined),
                icon_position: iconPos !== "none" ? iconPos : (mediaMode === "icon" ? "left" : "none"),
                animation_type: animType as any,
                variant: "default",
                width: "auto",
                position: "left",
                include_image_link: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN A: DISEÑO Y ANIMACIÓN DEL BOTÓN EN TIENDA */}
      <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
            Sección A: Diseño y Animación del Botón en Tienda
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-semibold">Texto visible del Botón</Label>
            <Input
              value={ctaText}
              onChange={(e) => setValues((v) => ({ ...v, [textKey]: e.target.value }))}
              placeholder="Ej: Cotizar Proyecto o Comprar Ahora"
              className="mt-1 text-xs"
            />
          </div>

          {/* Color del texto con código HEX */}
          <div>
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Color del Texto (Código HEX)</span>
              {textColor && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: textColor }} />
                  {textColor}
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={textColor && /^#[0-9A-Fa-f]{6}$/.test(textColor) ? textColor : "#ffffff"}
                onChange={(e) => setValues((v) => ({ ...v, [textColorKey]: e.target.value }))}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
                title="Elegir color visualmente"
              />
              <Input
                value={textColor}
                onChange={(e) => setValues((v) => ({ ...v, [textColorKey]: e.target.value }))}
                placeholder="Ej: #ffffff, #000000, #fbbf24"
                className="text-xs font-mono uppercase"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Escribe el código HEX (#ffffff) o elígelo en la paleta.</p>
          </div>

          {/* Personalización visual 1: Relleno / Fondo Animado (Fill) con Drag & Drop */}
          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                1. Fondo Animado / Relleno Vivo (Llenar Botón Completo)
              </Label>
              <Select
                value={mediaMode}
                onValueChange={(val) => setValues((v) => ({ ...v, [mediaModeKey]: val }))}
              >
                <SelectTrigger className="h-7 text-[11px] w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fill">Llenar botón</SelectItem>
                  <SelectItem value="none">Sin fondo animado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Soporta video MP4/WebM en bucle, GIF o imagen para cubrir el fondo completo del botón con contraste garantizado.
            </p>
            {mediaMode === "fill" && (
              <MediaDropZone
                value={mediaUrl}
                onChange={(url) => setValues((v) => ({ ...v, [mediaKey]: url }))}
              />
            )}
          </div>

          {/* Personalización visual 2: Ícono / Logo Circular con Drag & Drop */}
          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                2. Ícono o Logo Circular dentro del Botón
              </Label>
              <Select
                value={iconPos}
                onValueChange={(val) => setValues((v) => ({ ...v, [iconPosKey]: val }))}
              >
                <SelectTrigger className="h-7 text-[11px] w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin ícono</SelectItem>
                  <SelectItem value="left">A la izquierda</SelectItem>
                  <SelectItem value="right">A la derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Muestra un circulito / logo / ícono junto al texto del botón. Puedes usarlo solo o combinado con el fondo animado.
            </p>
            {iconPos !== "none" && (
              <MediaDropZone
                value={iconUrl}
                onChange={(url) => setValues((v) => ({ ...v, [iconUrlKey]: url }))}
              />
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN B: ACCIÓN AL PULSAR */}
      <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-primary">
            Sección B: Acción al Pulsar (Comportamiento del Botón)
          </h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold">¿Qué acción debe ejecutar este botón?</Label>
            <Select
              value={actionType}
              onValueChange={(val) => setValues((v) => ({ ...v, [actionTypeKey]: val }))}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Abrir Enlace Personalizado o Ruta Interna (/tienda, /servicios, https://...)</SelectItem>
                <SelectItem value="whatsapp">Abrir Chat de WhatsApp con Mensaje Personalizado</SelectItem>
                <SelectItem value="cotizador">Abrir Cotizador Interactivo (/cotizador)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType === "link" && (
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold">Enlace o Ruta de Destino</Label>
              <Input
                value={values[urlKey] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [urlKey]: e.target.value }))}
                placeholder="Ej: /tienda, /servicios, o https://..."
                className="mt-1 text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Usa una ruta interna que empiece por <code className="text-xs font-mono">/</code> o una URL externa completa con <code className="text-xs font-mono">https://</code>.
              </p>
            </div>
          )}

          {actionType === "cotizador" && (
            <div className="sm:col-span-2 rounded-lg bg-background/50 border border-border/60 p-3 text-xs text-muted-foreground">
              Este botón redirige a los clientes directamente a la experiencia interactiva del Cotizador 3D en <code className="font-mono text-primary font-bold">/cotizador</code>.
            </div>
          )}
        </div>

        {/* Sub-configuración condicional de WhatsApp */}
        {actionType === "whatsapp" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 space-y-4 mt-3">
            <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <h5 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Parámetros de WhatsApp
              </h5>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Número de WhatsApp (Opcional, vacío = WhatsApp de la marca)</Label>
                <Input
                  value={values[urlKey] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [urlKey]: e.target.value }))}
                  placeholder="573156724474 (solo números con código de país)"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Texto o Plantilla del Mensaje de WhatsApp</Label>
                <Textarea
                  rows={2}
                  value={whatsappMsg}
                  onChange={(e) => setValues((v) => ({ ...v, [messageKey]: e.target.value }))}
                  placeholder="Hola Will, me interesa cotizar..."
                  className="text-xs resize-y"
                />
                <p className="text-[11px] text-muted-foreground">
                  Al subir una imagen abajo, se adjunta automáticamente al mensaje de WhatsApp sin tener que escribir comandos.
                </p>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Imagen Específica que Acompaña el Enlace en WhatsApp
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Drag & Drop o Explorar Dispositivo
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Esta es la foto que recibirá el asesor en el chat de WhatsApp. Es completamente independiente del video o GIF decorativo del botón de la tienda.
                </p>
                <MediaDropZone
                  value={values[waImageKey] || ""}
                  onChange={(url) => setValues((v) => ({ ...v, [waImageKey]: url }))}
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Lógica de Respaldo de Imagen (si no subes imagen propia)</Label>
                <Select
                  value={whatsappLogic}
                  onValueChange={(val) => setValues((v) => ({ ...v, [logicKey]: val }))}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático (Reglas CEO: Logo si es video, Imagen si existe)</SelectItem>
                    <SelectItem value="none">Solo texto (mensaje limpio, sin enlace ni imagen)</SelectItem>
                      <SelectItem value="logo">Forzar Enviar Logo de la Empresa</SelectItem>
                    <SelectItem value="product_image">Enviar Imagen de la Sección / Producto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Live WhatsApp Message Preview Box */}
              <div className="sm:col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-1 text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  💬 Previsualización del enlace/mensaje que se enviará:
                </span>
                <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] bg-background/50 p-2 rounded-lg border border-emerald-500/20">
                  {payload.formattedText || "Hola Will, me interesa cotizar..."}
                </p>
                <p className="text-[10px] text-emerald-700/90 dark:text-emerald-300/90 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>📎 Adjunto a enviar: <strong>{shortMediaName(payload.mediaToSend)}</strong></span>
                  {values[waImageKey] ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">
                      Imagen específica configurada ✓
                    </span>
                  ) : payload.mediaToSend.includes("logo") || payload.mediaToSend.startsWith("/") ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                      Logo de la marca
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContenidoAdmin() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("site_content").select("key,value");
    const map: Record<string, string> = {};
    (data as Row[] | null)?.forEach((r) => (map[r.key] = r.value));
    for (const f of FIELDS) if (!(f.key in map)) map[f.key] = "";

    // Migración inicial de hero_stats si no existe en BD
    if (!map.hero_stats) {
      const parsedLegacy = parseHeroStats(map);
      map.hero_stats = JSON.stringify(parsedLegacy);
    }

    setValues(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const lastSaved = useRef<Record<string, string> | null>(null);

  async function save(fields: FieldDef[], snapshot: Record<string, string>) {
    if (!fields.length) return;
    setSaving(true);
    try {
      const rows = fields.map((f) => ({
        key: f.key,
        value: snapshot[f.key] ?? "",
        section: f.section,
      }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      lastSaved.current = { ...lastSaved.current, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
      setHasUnsaved(false);
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
    } catch (e) {
      toast.error("No pudimos guardar los cambios", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // Debounced Auto-Save
  useEffect(() => {
    if (loading) return;
    if (!lastSaved.current) {
      lastSaved.current = values;
      return;
    }
    const changed = FIELDS.filter((f) => (values[f.key] ?? "") !== (lastSaved.current?.[f.key] ?? ""));
    if (!changed.length) {
      setHasUnsaved(false);
      return;
    }
    setHasUnsaved(true);
    const timer = setTimeout(() => save(changed, values), 800);
    return () => clearTimeout(timer);
  }, [values, loading]);

  // Guardado inmediato en cambio de pestaña o app (visibilitychange / beforeunload)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        const currentValues = valuesRef.current;
        if (!lastSaved.current) return;
        const changed = FIELDS.filter((f) => (currentValues[f.key] ?? "") !== (lastSaved.current?.[f.key] ?? ""));
        if (changed.length) {
          save(changed, currentValues);
        }
      }
    }

    function handleBeforeUnload() {
      const currentValues = valuesRef.current;
      if (!lastSaved.current) return;
      const changed = FIELDS.filter((f) => (currentValues[f.key] ?? "") !== (lastSaved.current?.[f.key] ?? ""));
      if (changed.length) {
        save(changed, currentValues);
      }
    }

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  async function uploadToStorage(key: string, file: File, bucket = "site-media") {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error(`El archivo ${file.name} supera el límite máximo de 50MB.`);
    }
    const path = `content/${key}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (up.error) throw up.error;
    const signed = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signed.error) throw signed.error;
    return signed.data.signedUrl;
  }

  async function uploadImage(key: string, file: File) {
    setUploadingKey(key);
    try {
      const url = await uploadToStorage(key, file);
      setValues((v) => ({ ...v, [key]: url }));
      toast.success("Imagen subida con éxito");
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setUploadingKey(null);
    }
  }

  function isFlagOn(key: string) {
    const v = (values[key] ?? "").trim().toLowerCase();
    if (!v) return true;
    return !["false", "0", "no", "off"].includes(v);
  }

  function renderField(f: FieldDef) {
    if (f.key === "hero_cta_text") {
      return (
        <CTAButtonGroup
          key="hero_cta_group"
          prefix="hero_cta_"
          values={values}
          setValues={setValues}
          uploadingKey={uploadingKey}
          uploadImage={uploadImage}
        />
      );
    }
    if (f.key.startsWith("hero_cta_") && f.key !== "hero_cta_text") {
      return null;
    }

    if (f.key === "hero_secondary_cta_text") {
      const hasSecondary = Boolean(values.hero_secondary_cta_text || values.hero_secondary_cta_url);
      if (!hasSecondary) {
        return (
          <div key="hero_secondary_cta_add" className="rounded-xl border border-dashed border-border p-4 bg-muted/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Segundo Botón de Hero (Opcional)</p>
              <p className="text-[11px] text-muted-foreground">Actualmente desactivado o sin texto. Puedes añadir un segundo botón para la cabecera.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setValues((v) => ({
                  ...v,
                  hero_secondary_cta_text: "Ver Tienda",
                  hero_secondary_cta_url: "/tienda",
                  hero_secondary_cta_action_type: "link",
                }));
              }}
              className="text-xs font-semibold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              + Añadir 2do Botón en Hero
            </Button>
          </div>
        );
      }
      return (
        <CTAButtonGroup
          key="hero_secondary_cta_group"
          prefix="hero_secondary_cta_"
          values={values}
          setValues={setValues}
          uploadingKey={uploadingKey}
          uploadImage={uploadImage}
          onDelete={() => {
            setValues((v) => {
              const copy = { ...v };
              delete copy.hero_secondary_cta_text;
              delete copy.hero_secondary_cta_url;
              delete copy.hero_secondary_cta_media_url;
              delete copy.hero_secondary_cta_media_mode;
              delete copy.hero_secondary_cta_icon_url;
              delete copy.hero_secondary_cta_icon_position;
              delete copy.hero_secondary_cta_text_color;
              delete copy.hero_secondary_cta_custom_hex;
              delete copy.hero_secondary_cta_action_type;
              delete copy.hero_secondary_cta_whatsapp_message;
              delete copy.hero_secondary_cta_whatsapp_image_url;
              delete copy.hero_secondary_cta_whatsapp_image_logic;
              return copy;
            });
            toast.success("Segundo botón de Hero eliminado");
          }}
        />
      );
    }
    if (f.key.startsWith("hero_secondary_cta_") && f.key !== "hero_secondary_cta_text") {
      return null;
    }

    if (f.key === "about_cta_text") {
      return (
        <CTAButtonGroup
          key="about_cta_group"
          prefix="about_cta_"
          values={values}
          setValues={setValues}
          uploadingKey={uploadingKey}
          uploadImage={uploadImage}
        />
      );
    }
    if (f.key.startsWith("about_cta_") && f.key !== "about_cta_text") {
      return null;
    }

    if (f.key === "about_mission_cta_text") {
      return (
        <CTAButtonGroup
          key="about_mission_cta_group"
          prefix="about_mission_cta_"
          values={values}
          setValues={setValues}
          uploadingKey={uploadingKey}
          uploadImage={uploadImage}
        />
      );
    }
    if (f.key.startsWith("about_mission_cta_") && f.key !== "about_mission_cta_text") {
      return null;
    }

    if (f.key === "about_vision_cta_text") {
      return (
        <CTAButtonGroup
          key="about_vision_cta_group"
          prefix="about_vision_cta_"
          values={values}
          setValues={setValues}
          uploadingKey={uploadingKey}
          uploadImage={uploadImage}
        />
      );
    }
    if (f.key.startsWith("about_vision_cta_") && f.key !== "about_vision_cta_text") {
      return null;
    }

    if (f.type === "media" || f.type === "image") {
      return (
        <div key={f.key} className="space-y-2">
          <Label className="text-sm font-bold">{f.label}</Label>
          {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          <MediaDropZone
            value={values[f.key] ?? ""}
            onChange={(url) => setValues((v) => ({ ...v, [f.key]: url }))}
          />
        </div>
      );
    }
    if (f.type === "hero_stats") {
      return (
        <div key={f.key} className="space-y-2">
          <Label className="text-sm font-bold">{f.label}</Label>
          {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          <HeroStatsEditor
            value={values[f.key] ?? ""}
            onChange={(next) => setValues((v) => ({ ...v, [f.key]: next }))}
          />
        </div>
      );
    }
    if (f.type === "images") {
      return (
        <div key={f.key} className="space-y-2">
          <Label className="text-sm font-bold">{f.label}</Label>
          {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          <PortfolioGalleryEditor
            value={values[f.key] ?? ""}
            onChange={(next) => setValues((v) => ({ ...v, [f.key]: next }))}
          />
        </div>
      );
    }
    if (f.type === "order") {
      return (
        <div key={f.key} className="space-y-2">
          <Label className="text-sm font-bold">{f.label}</Label>
          {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          <HomeSectionsOrder
            value={parseHomeOrder(values[f.key])}
            onChange={(next) => setValues((v) => ({ ...v, [f.key]: JSON.stringify(next) }))}
          />
        </div>
      );
    }
    if (f.type === "switch") {
      return (
        <div
          key={f.key}
          className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4 bg-card"
        >
          <div className="space-y-1">
            <Label htmlFor={f.key} className="text-sm font-bold">
              {f.label}
            </Label>
            {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          </div>
          <Switch
            id={f.key}
            checked={isFlagOn(f.key)}
            onCheckedChange={(on) =>
              setValues((v) => ({ ...v, [f.key]: on ? "true" : "false" }))
            }
          />
        </div>
      );
    }

    return (
      <div key={f.key} className="space-y-2">
        <Label htmlFor={f.key} className="text-sm font-bold">
          {f.label}
        </Label>
        {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}

        {(f.type === "text" || f.type === "textarea") && (
          <>
            <Textarea
              id={f.key}
              rows={f.type === "text" ? 1 : 3}
              value={values[f.key] ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const next =
                  f.key === "elfsight_instagram_id" ? sanitizeWidgetId(raw) : raw;
                setValues((v) => ({ ...v, [f.key]: next }));
              }}
              className="resize-y"
            />
          </>
        )}

        {f.type === "select" && f.options && (
          <Select
            value={values[f.key] ?? ""}
            onValueChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
          >
            <SelectTrigger id={f.key} className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {f.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando contenido del sitio…
      </div>
    );
  }

  const groups = Array.from(new Set(FIELDS.map((f) => f.group)));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Barra de Estado Flotante de Auto-Guardado Siempre Visible */}
      <div className="sticky top-16 z-20 -mx-1 mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" /> Contenido del Sitio
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Personaliza fácilmente el inicio, la sección Nosotros y los textos de tu tienda.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {saving ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
            </span>
          ) : hasUnsaved ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Cambios pendientes
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const changed = FIELDS.filter((f) => (values[f.key] ?? "") !== (lastSaved.current?.[f.key] ?? ""));
                  if (changed.length) save(changed, values);
                }}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Save className="h-3.5 w-3.5" /> Guardar ahora
              </Button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Guardado
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
            {groups
              .map((group) => {
                const groupFields = FIELDS.filter((f) => f.group === group);
                return (
                  <Card key={group} className="border-border shadow-xs">
                    <CardHeader className="pb-3 border-b border-border/60">
                      <CardTitle className="text-base font-bold">{group}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">{groupFields.map(renderField)}</CardContent>
                  </Card>
                );
              })}
      </div>
    </div>
  );
}
