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
  ArrowUp,
  ArrowDown,
  Trash2,
  Layout,
  Plus,
  GripVertical,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Lottie } from "lottie-react";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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

export type HeroStatItem = {
  id: string;
  k: string;
  v: string;
  action_type?: "none" | "link" | "whatsapp";
  action_value?: string;
  whatsapp_message?: string;
  whatsapp_image_logic?: "auto" | "logo" | "product_image";
  color_id?: string;
  custom_hex?: string;
  media_url?: string;
  animation_type?: "none" | "image" | "video" | "gif" | "lottie";
  animation_style?: string;
  // FASE 3: Fondo vivo y estilos avanzados
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
    type: "image",
    help: "Se usa como respaldo si el Carrusel Hero no tiene diapositivas activas.",
    section: "Inicio",
    group: "Hero Principal",
  },
  { key: "hero_badge_title", label: "Etiqueta Flotante (Pieza destacada)", type: "text", help: "Ej: Escultura 1.8 m — PLA reforzado", section: "Inicio", group: "Hero Principal" },

  // Botón Principal Hero
  { key: "hero_cta_text", label: "Texto Botón Principal Hero", type: "text", help: "Ej: Cotizar Proyecto", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_url", label: "Enlace/Ruta Botón Principal Hero", type: "text", help: "Ej: /cotizador o https://...", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_media_url", label: "Multimedia/Imagen Botón Principal Hero", type: "image", section: "Inicio", group: "Hero Principal" },
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
    help: "Si dejas vacío, se usa mensaje por defecto de /panel/contenido -> Mensajes WhatsApp. Puedes usar {media} para incluir el enlace al logo/imagen.",
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
      { value: "logo", label: "Forzar Enviar Logo de la Empresa" },
      { value: "product_image", label: "Enviar Imagen de la Sección / Producto" },
    ],
  },

  // Botón Secundario Hero
  { key: "hero_secondary_cta_text", label: "Texto Botón Secundario Hero", type: "text", help: "Ej: Ver tienda", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_url", label: "Enlace/Ruta Botón Secundario Hero", type: "text", help: "Ej: /tienda o https://...", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_media_url", label: "Multimedia Botón Secundario Hero", type: "image", section: "Inicio", group: "Hero Principal" },
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
    key: "hero_secondary_cta_whatsapp_message",
    label: "Mensaje WhatsApp Botón Secundario",
    type: "textarea",
    help: "Si dejas vacío, se usa mensaje por defecto de /panel/contenido -> Mensajes WhatsApp. Puedes usar {media} para incluir el enlace al logo/imagen.",
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
      { value: "logo", label: "Forzar Enviar Logo de la Empresa" },
      { value: "product_image", label: "Enviar Imagen de la Sección / Producto" },
    ],
  },

  // Estadísticas del Hero (Convertidas en Botones de Acción con Drag & Drop)
  {
    key: "hero_stats",
    label: "Botones de Acción y Estadísticas del Hero",
    type: "hero_stats",
    help: "Reordena por Drag & Drop, asigna colores de la paleta del tema, animaciones (Lottie/Video/GIF) y acciones clickeables.",
    section: "Inicio",
    group: "Estadísticas del Hero",
  },

  // Sección Servicios: Movido a panel.servicios.tsx - fuente de verdad concentrada

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
  { key: "about_image_url", label: "Imagen Principal 'Nosotros'", type: "image", help: "Imagen destacada del taller o equipo.", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_stats", label: "Métricas y Logros Destacados 'Nosotros'", type: "hero_stats", help: "Añade logros y estadísticas para mostrar en la sección Nosotros.", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_text", label: "Texto del Botón 'Nosotros'", type: "text", help: "Ej: Conoce más sobre nosotros", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_url", label: "Enlace del Botón 'Nosotros'", type: "text", help: "Ej: /nosotros o https://...", section: "Inicio", group: "Sección Nosotros" },
  { key: "about_cta_media_url", label: "Multimedia Botón 'Nosotros'", type: "image", section: "Inicio", group: "Sección Nosotros" },
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
    help: "Si dejas vacío, se usa mensaje por defecto de /panel/contenido -> Mensajes WhatsApp. Puedes usar {media} para incluir el enlace al logo/imagen.",
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
  { key: "about_mission_cta_whatsapp_message", label: "Mensaje WhatsApp Botón Misión", type: "textarea", help: "Usa {media} para incluir enlace al logo o imagen.", section: "Inicio", group: "Nosotros Página Misión Visión" },

  { key: "about_vision_title", label: "Título Visión", type: "text", help: "Default: Visión", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_text", label: "Texto Visión", type: "textarea", help: "Default: Ser el referente colombiano en impresión 3D de gran formato...", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_image_url", label: "Multimedia / GIF / Video Visión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_text", label: "Texto Botón Visión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_url", label: "Enlace Botón Visión", type: "text", section: "Inicio", group: "Nosotros Página Misión Visión" },
  { key: "about_vision_cta_media_url", label: "Multimedia Botón Visión", type: "media", section: "Inicio", group: "Nosotros Página Misión Visión" },
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

  { key: "whatsapp_default_message", label: "Mensaje WhatsApp Global Por Defecto", type: "textarea", help: "Mensaje enviado si un botón de WhatsApp no especifica mensaje personalizado.", section: "Inicio", group: "Configuración Mensajes WhatsApp" },
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
            Botón Estadístico {index + 1}
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
            title="Eliminar botón estadístico"
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

        <div>
          <Label className="text-xs font-semibold">Acción Clickeable</Label>
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
            </SelectContent>
          </Select>
        </div>

        {item.action_type && item.action_type !== "none" && (
          <div>
            <Label className="text-xs font-semibold">
              {item.action_type === "link" ? "URL o Ruta de Destino" : "Número de WhatsApp (Opcional)"}
            </Label>
            <Input
              value={item.action_value || ""}
              onChange={(e) => onUpdate({ action_value: e.target.value })}
              placeholder={item.action_type === "link" ? "/cotizador o https://..." : "573156724474"}
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
              <p className="text-[11px] text-muted-foreground">
                💡 Si dejas vacío, se usa mensaje por defecto de /panel/contenido -&gt; Mensajes WhatsApp.
              </p>
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
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold mt-1">
                📎 Adjunto a enviar: {
                  getWhatsAppPayloadForButton(
                    { whatsapp_message: item.whatsapp_message, whatsapp_image_logic: item.whatsapp_image_logic },
                    bgUrl
                  ).mediaToSend
                }
              </p>
            </div>
          </>
        )}

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
        className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground shrink-0"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

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
    toast.success("Nuevo botón estadístico añadido");
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
        <Plus className="mr-1.5 h-3.5 w-3.5" /> + Añadir botón estadístico
      </Button>
    </div>
  );
}

function ContenidoAdmin() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

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
  useEffect(() => {
    if (loading) return;
    if (!lastSaved.current) {
      lastSaved.current = values;
      return;
    }
    const changed = FIELDS.filter((f) => (values[f.key] ?? "") !== (lastSaved.current?.[f.key] ?? ""));
    if (!changed.length) return;
    const timer = setTimeout(() => save(changed, values), 800);
    return () => clearTimeout(timer);
  }, [values, loading]);

  async function save(fields: FieldDef[], snapshot: Record<string, string>) {
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
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
    } catch (e) {
      toast.error("No pudimos guardar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

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
      toast.success("Imagen subida");
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setUploadingKey(null);
    }
  }

  function parseList(raw: string | undefined): PortfolioPhoto[] {
    return parsePhotos(raw);
  }

  async function uploadImages(key: string, files: File[]) {
    setUploadingKey(key);
    try {
      const added: PortfolioPhoto[] = [];
      for (const f of files) {
        const url = await uploadToStorage(key, f, "site-media");
        added.push({ id: crypto.randomUUID(), url, is_visible: true });
      }
      setValues((v) => ({
        ...v,
        [key]: JSON.stringify([...parseList(v[key]), ...added]),
      }));
      toast.success(`${added.length} elemento(s) subido(s)`);
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setUploadingKey(null);
    }
  }

  function removeImageAt(key: string, index: number) {
    setValues((v) => {
      const list = parseList(v[key]).filter((_, i) => i !== index);
      return { ...v, [key]: list.length ? JSON.stringify(list) : "" };
    });
  }

  function movePhotoAt(key: string, index: number, dir: -1 | 1) {
    setValues((v) => {
      const list = parseList(v[key]);
      const target = index + dir;
      if (target < 0 || target >= list.length) return v;
      const next = [...list];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return { ...v, [key]: JSON.stringify(next) };
    });
  }

  function updatePhotoLinkAt(key: string, index: number, link_url: string) {
    setValues((v) => {
      const list = parseList(v[key]).map((p, i) =>
        i === index ? { ...p, link_url: link_url ? link_url : undefined } : p,
      );
      return { ...v, [key]: list.length ? JSON.stringify(list) : "" };
    });
  }

  function togglePhotoAt(key: string, index: number) {
    setValues((v) => {
      const list = parseList(v[key]).map((p, i) =>
        i === index ? { ...p, is_visible: !p.is_visible } : p,
      );
      return { ...v, [key]: list.length ? JSON.stringify(list) : "" };
    });
  }

  function isFlagOn(key: string) {
    const v = (values[key] ?? "").trim().toLowerCase();
    if (!v) return true;
    return !["false", "0", "no", "off"].includes(v);
  }

  function renderField(f: FieldDef) {
    if (f.type === "media") {
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
          className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4"
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
            {f.key.endsWith("_whatsapp_message") && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1 text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  💬 Así se verá en WhatsApp:
                </span>
                <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px]">
                  {getWhatsAppPayloadForButton(
                    {
                      whatsapp_message: values[f.key],
                      whatsapp_image_logic: values[f.key.replace("_whatsapp_message", "_whatsapp_image_logic")],
                    },
                    values[f.key.startsWith("hero_secondary") ? "hero_secondary_cta_media_url" : f.key.startsWith("hero_cta") ? "hero_cta_media_url" : "about_cta_media_url"] || values["hero_image_url"],
                    values["site_logo_url"],
                    "Hola Will, me interesa cotizar..."
                  ).formattedText || "Hola Will, me interesa cotizar..."}
                </p>
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold mt-1">
                  📎 Adjunto a enviar: {
                    getWhatsAppPayloadForButton(
                      {
                        whatsapp_message: values[f.key],
                        whatsapp_image_logic: values[f.key.replace("_whatsapp_message", "_whatsapp_image_logic")],
                      },
                      values[f.key.startsWith("hero_secondary") ? "hero_secondary_cta_media_url" : f.key.startsWith("hero_cta") ? "hero_cta_media_url" : "about_cta_media_url"] || values["hero_image_url"],
                      values["site_logo_url"]
                    ).mediaToSend
                  }
                </p>
              </div>
            )}
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

        {f.type === "image" && (
          <div className="flex flex-wrap items-center gap-4">
            {values[f.key] ? (
              <img src={values[f.key]} alt="" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-muted" />
            )}
            <Button asChild variant="outline" size="sm" type="button">
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploadingKey === f.key ? "Subiendo…" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(f.key, e.target.files[0])}
                />
              </label>
            </Button>
            {values[f.key] && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setValues((v) => ({ ...v, [f.key]: "" }))}
              >
                Quitar
              </Button>
            )}
          </div>
        )}

        {f.type === "images" && (
          <div>
            <div className="space-y-3">
              {parseList(values[f.key]).map((photo, idx, arr) => (
                <div
                  key={photo.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                    <ProductMedia
                      src={photo.url}
                      thumb={true}
                      className={`h-full w-full object-cover ${photo.is_visible ? "" : "opacity-40"}`}
                    />
                    {isVideoUrl(photo.url) && (
                      <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-md bg-black/70 px-1 py-0.5 text-[10px] font-bold text-white">
                        <Film className="h-3 w-3" />
                      </span>
                    )}
                    {!photo.is_visible && (
                      <span className="absolute top-1 left-1 rounded-md bg-foreground/80 px-1 py-0.5 text-[9px] font-bold text-background">
                        Oculto
                      </span>
                    )}
                  </div>

                  <div className="w-full flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Enlace de acción (opcional)
                    </Label>
                    <Input
                      type="text"
                      placeholder="Ej: /tienda/lampara-luna o https://..."
                      className="h-9 text-xs"
                      value={photo.link_url ?? ""}
                      onChange={(e) => updatePhotoLinkAt(f.key, idx, e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => togglePhotoAt(f.key, idx)}
                      aria-label={photo.is_visible ? "Ocultar elemento" : "Mostrar elemento"}
                      title={photo.is_visible ? "Ocultar elemento" : "Mostrar elemento"}
                    >
                      {photo.is_visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => movePhotoAt(f.key, idx, -1)}
                      disabled={idx === 0}
                      aria-label="Mover arriba"
                      title="Mover arriba"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => movePhotoAt(f.key, idx, 1)}
                      disabled={idx === arr.length - 1}
                      aria-label="Mover abajo"
                      title="Mover abajo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeImageAt(f.key, idx)}
                      aria-label="Eliminar elemento"
                      title="Eliminar elemento"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {parseList(values[f.key]).length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No hay fotos ni videos subidos en el portafolio.
                </div>
              )}
            </div>
            <Button asChild variant="outline" size="sm" type="button" className="mt-3">
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploadingKey === f.key ? "Subiendo…" : "Subir fotos o videos"}
                <input
                  type="file"
                  accept="image/*,video/*,video/mp4,video/webm,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) uploadImages(f.key, files);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando contenido de la página principal…
      </div>
    );
  }

  const groups = Array.from(new Set(FIELDS.map((f) => f.group)));

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-20 -mx-1 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" /> Home Builder & Contenido de la Página
          </h1>
          <p className="text-sm text-muted-foreground">
            Personaliza las secciones, el orden visual del inicio, textos y galería.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Guardando…" : "Guardado automático"}
        </span>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-base">{group}</CardTitle>
              <CardDescription>
                {FIELDS.filter((f) => f.group === group).length} campos editables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {FIELDS.filter((f) => f.group === group).map(renderField)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
