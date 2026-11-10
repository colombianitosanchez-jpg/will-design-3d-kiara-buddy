import { createFileRoute, Link } from "@tanstack/react-router";
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
  Layers,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sanitizeWidgetId, parsePhotos, type PortfolioPhoto } from "@/components/InstagramFeed";
import { HomeSectionsOrder } from "@/components/HomeSectionsOrder";
import { parseHomeOrder } from "@/lib/home-sections";
import { getHomeEditorGroups } from "@/lib/home-editor-groups";
import { ProductMedia, isVideoUrl } from "@/components/ProductMedia";
import { useSiteContent } from "@/hooks/use-site-content";
import { getActiveTheme } from "@/lib/theme";
import { getWhatsAppPayloadForButton, WHATSAPP_REF_ALIASES } from "@/lib/whatsapp-buttons";
import { UnifiedButton, getIconShapeStyle } from "@/components/UnifiedButton";
import {
  type ButtonIconShape,
  BUTTON_ICON_SHAPES,
  ICON_SHAPE_LABELS,
} from "@/lib/product-buttons";
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
  head: () => ({
    meta: [
      { title: "Contenido del sitio · Will Design 3D" },
      { name: "description", content: "Gestión privada del contenido y el orden de las secciones de Will Design 3D." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Contenido del sitio · Will Design 3D" },
      { property: "og:description", content: "Edición del inicio, Nosotros y textos de la tienda de Will Design 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContenidoAdmin,
});

export const SITE_INTERNAL_PAGES = [
  { label: "📐 Cotizador 3D Interactivo", path: "/cotizador" },
  { label: "🛍️ Tienda y Catálogo de Productos", path: "/tienda" },
  { label: "⚙️ Servicios de Impresión y Diseño", path: "/servicios" },
  { label: "🖼️ Portafolio y Galería de Trabajos", path: "/galeria" },
  { label: "👥 Sobre Nosotros (Historia y Equipo)", path: "/nosotros" },
  { label: "📞 Contacto Directo", path: "/contacto" },
  { label: "🛒 Carrito de Compras", path: "/carrito" },
  { label: "🏠 Página de Inicio", path: "/" },
] as const;

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

export { parseHeroStats, type HeroStatItem } from "@/lib/hero-stats";
import { parseHeroStats, parseStatItems, statShareKey, contrastText, accentPalette, type HeroStatItem, type StatCollectionKey } from "@/lib/hero-stats";
import { parseHeroButtons, type HeroButtonItem } from "@/lib/hero-buttons";

export function MediaDropZone({
  value,
  onChange,
  forWhatsapp = false,
}: {
  value?: string;
  onChange: (url: string, detectedType?: "imageFill" | "videoFill") => void;
  forWhatsapp?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    if (forWhatsapp) {
      try {
        const { compressForWhatsapp } = await import("@/lib/whatsapp-image");
        file = await compressForWhatsapp(file);
      } catch (e) {
        toast.error("Foto no válida para WhatsApp", { description: (e as Error).message });
        return;
      }
    }
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
                e.preventDefault();
                e.stopPropagation();
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
                onChange("");
              }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer z-10 transition-transform hover:scale-110 active:scale-95"
              title="Eliminar archivo multimedia"
              aria-label="Eliminar archivo multimedia"
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
              ref={fileInputRef}
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

  // Botón Principal Hero y Gestión de Botones Múltiples Ilimitados
  { key: "hero_buttons", label: "Botones del Hero", type: "text", help: "JSON con la lista completa de botones ilimitados del Hero", section: "Inicio", group: "Hero Principal" },
  { key: "hero_buttons_order", label: "Orden de Botones del Hero", type: "text", help: "Orden de renderizado: primary,secondary o secondary,primary", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_text", label: "Texto Botón Principal Hero", type: "text", help: "Ej: Cotizar Proyecto", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_url", label: "Enlace/Ruta Botón Principal Hero", type: "text", help: "Ej: /cotizador o https://...", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_media_url", label: "Multimedia/Imagen Botón Principal Hero", type: "media", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_media_mode", label: "Modo multimedia Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_icon_url", label: "Ícono Botón Principal Hero", type: "media", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_icon_position", label: "Posición Ícono Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_text_color", label: "Color Texto Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_custom_hex", label: "Color Personalizado HEX Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_opacity", label: "Opacidad Botón Principal Hero", type: "text", help: "Valor porcentual entre 10 y 100", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_shade", label: "Sombreado Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_media_fit", label: "Ajuste fondo animado Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_icon_shape", label: "Forma ícono Botón Principal Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_cta_width", label: "Cobertura / Ancho Botón Principal Hero", type: "text", help: "'auto' o 'full'", section: "Inicio", group: "Hero Principal" },
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
  { key: "hero_secondary_cta_opacity", label: "Opacidad Botón Secundario Hero", type: "text", help: "Valor porcentual entre 10 y 100", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_shade", label: "Sombreado Botón Secundario Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_media_fit", label: "Ajuste fondo animado Botón Secundario Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_icon_shape", label: "Forma ícono Botón Secundario Hero", type: "text", section: "Inicio", group: "Hero Principal" },
  { key: "hero_secondary_cta_width", label: "Cobertura / Ancho Botón Secundario Hero", type: "text", help: "'auto' o 'full'", section: "Inicio", group: "Hero Principal" },
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
  const [LottieComp, setLottieComp] = useState<any>(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    Promise.all([
      fetch(url).then((res) => res.json()),
      import("lottie-react").then((m: any) => m.Lottie || m.default),
    ])
      .then(([json, Comp]) => {
        if (isMounted) {
          setData(json);
          setLottieComp(() => Comp);
        }
      })
      .catch(() => {
        if (isMounted) {
          setData(null);
          setLottieComp(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!data || !LottieComp) return null;
  const Component = LottieComp;
  return <Component animationData={data} loop={true} className="h-5 w-5" />;
}

function HeroStatOrderRow({
  item,
  index,
  onRemove,
}: {
  item: HeroStatItem;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `stat_order_${item.id}`,
  });
  const label = [item.k, item.v].filter(Boolean).join(" — ") || `Elemento #${index + 1}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl border bg-card p-3 transition shadow-2xs ${
        isDragging
          ? "z-20 border-primary bg-primary/10 shadow-xl ring-2 ring-primary"
          : "border-border hover:border-border/80"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar ${label}`}
        className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="h-5 w-5 text-primary" />
      </button>

      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
        #{index + 1}
      </span>

      <span className="text-sm font-bold flex-1 text-foreground flex items-center gap-2 truncate">
        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate">{label}</span>
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
        title="Eliminar elemento"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function SortableHeroStatCard({
  item,
  index,
  palette,
  onUpdate,
  onDuplicate,
  onRemove,
  collectionKey,
}: {
  item: HeroStatItem;
  index: number;
  palette: Array<{ id: string; name: string; hex: string }>;
  onUpdate: (patch: Partial<HeroStatItem>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  collectionKey: StatCollectionKey;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { content } = useSiteContent();

  const textColor = item.text_color || "";
  const customHex = item.custom_hex || "";
  const mediaMode = item.media_mode || (item.media_url || item.bgImageUrl ? "fill" : "none");
  const mediaUrl = item.media_url || item.bgImageUrl || "";
  const mediaFit = item.media_fit || "cover";
  const iconPos = item.icon_position || item.iconPosition || "none";
  const iconUrl = item.icon_url || "";
  const iconShape = item.icon_shape || "circle";
  const statWidth = item.width || "auto";
  const shadeNum = item.shade !== undefined ? Math.max(0, Math.min(100, item.shade)) : undefined;

  let resolvedBg = customHex;
  if (!resolvedBg && item.color_id && item.color_id !== "custom" && item.color_id !== "default") {
    const found = palette.find((p) => p.id === item.color_id);
    if (found) resolvedBg = found.hex;
  }

  const effectiveBgColor = resolvedBg || "var(--brand-wine)";

  const isVid = /\.(mp4|webm|quicktime)($|\?)/i.test(mediaUrl);
  const isGif = /\.gif($|\?)/i.test(mediaUrl);
  const isLottie = /\.json($|\?)/i.test(mediaUrl);

  const isIconVid = /\.(mp4|webm|quicktime)($|\?)/i.test(iconUrl);
  const isIconLottie = /\.json($|\?)/i.test(iconUrl);

  const iconShapeConfig = getIconShapeStyle(iconShape);

  const effectiveShade = shadeNum ?? (mediaMode === "fill" && mediaUrl ? 45 : 0);

  const iconMedia = iconUrl && iconPos !== "none" && (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 h-4 w-4 overflow-hidden ${iconShapeConfig.className}`}
      style={iconShapeConfig.style}
    >
      {isIconLottie ? (
        <LottiePreview url={iconUrl} />
      ) : isIconVid ? (
        <video src={iconUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
      ) : (
        <img src={iconUrl} alt="" className="h-full w-full object-cover" />
      )}
    </span>
  );

  const isFillMedia = mediaMode === "fill" && Boolean(mediaUrl);

  const previewContainerStyle: React.CSSProperties = resolvedBg
    ? { backgroundColor: resolvedBg, borderColor: resolvedBg }
    : { borderColor: "var(--border)" };
  const previewText = textColor || (isFillMedia ? "#ffffff" : resolvedBg ? contrastText(resolvedBg) : effectiveBgColor);

  const payload = getWhatsAppPayloadForButton(
    {
      whatsapp_message: item.whatsapp_message,
      whatsapp_image_url: item.whatsapp_image_url,
      whatsapp_image_key: statShareKey(collectionKey, index),
    },
    mediaUrl || content?.hero_image_url || "",
    content?.site_logo_url,
    `Hola Will Design 3D, me interesa la consulta sobre: ${item.k || ""} (${item.v || ""}).`,
    content?.whatsapp_default_message || ""
  );

  const actionType = item.action_type || "none";
  const actionValue = item.action_value || "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-dashed border-border p-5 space-y-6 bg-muted/20"
    >
      {/* A. Encabezado de la tarjeta */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
            title="Arrastrar para reordenar estadística"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            #{index + 1} - {item.k || "Sin título"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            className="h-8 text-xs font-semibold gap-1.5"
            title="Duplicar esta estadística"
          >
            <Copy className="h-3.5 w-3.5 text-primary" />
            Duplicar
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1.5"
            title="Eliminar esta estadística"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>

          {/* Vista previa en vivo idéntica a la web */}
          <div className="shrink-0 flex items-center gap-2 border-l border-border pl-3 ml-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Vista previa:</span>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={previewContainerStyle}
              className={`relative overflow-hidden isolate border px-3.5 py-2 text-center shadow-2xs min-w-[120px] min-h-[50px] flex flex-col items-center justify-center rounded-2xl ${
                item.animation_style && item.animation_style !== "none" ? `theme-anim-${item.animation_style}` : ""
              } ${statWidth === "full" ? "w-full" : ""}`}
            >
              {/* Fondo animado / relleno vivo */}
              {isFillMedia && (
                <>
                  {isLottie ? (
                    <div className="absolute inset-0 -z-20 flex items-center justify-center overflow-hidden">
                      <LottiePreview url={mediaUrl} />
                    </div>
                  ) : isVid ? (
                    <video
                      src={mediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className={`absolute inset-0 h-full w-full object-center -z-20 ${
                        mediaFit === "contain" ? "object-contain" : mediaFit === "fill" ? "object-fill" : "object-cover"
                      }`}
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt=""
                      className={`absolute inset-0 h-full w-full object-center -z-20 ${
                        mediaFit === "contain" ? "object-contain" : mediaFit === "fill" ? "object-fill" : "object-cover"
                      }`}
                    />
                  )}
                </>
              )}

              {/* Sombreado / Contraste Overlay */}
              {effectiveShade > 0 && (
                <div
                  className="absolute inset-0 bg-black -z-10"
                  style={{ opacity: effectiveShade / 100 }}
                />
              )}

              {/* Texto / Valor Destacado */}
              <div
                className={`relative z-10 flex items-center justify-center gap-1.5 font-black text-sm ${
                  isFillMedia ? "drop-shadow-md" : ""
                }`}
                style={{ color: textColor || previewText }}
              >
                {iconPos === "left" && iconMedia}
                <span>{item.k || "50×50"}</span>
                {iconPos === "right" && iconMedia}
              </div>

              {/* Descripción Corta */}
              <div
                className={`relative z-10 text-[10px] truncate max-w-[120px] ${
                  isFillMedia ? "drop-shadow-xs" : ""
                }`}
                style={{ color: textColor || previewText, opacity: 0.85 }}
              >
                {item.v || "cm mínimo"}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* B. Textos Principales */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs font-semibold">Valor / Título Destacado (k)</Label>
          <Input
            value={item.k || ""}
            onChange={(e) => onUpdate({ k: e.target.value })}
            placeholder="Ej: 50×50"
            className="mt-1 text-xs"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold">Descripción Corta (v)</Label>
          <Input
            value={item.v || ""}
            onChange={(e) => onUpdate({ v: e.target.value })}
            placeholder="Ej: cm mínimo"
            className="mt-1 text-xs"
          />
        </div>
      </div>

      {/* C. Sección A: Diseño y Animación */}
      <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
            Sección A: Diseño y Animación
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Color del Texto */}
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
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
                title="Elegir color visualmente"
              />
              <Input
                value={textColor}
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                placeholder="Ej: #ffffff, #000000, #fbbf24"
                className="text-xs font-mono uppercase"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Vacío = texto blanco con sombra sobre fondos vivos o color de marca sobre sólidos.</p>
          </div>

          {/* Color de fondo */}
          <div>
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Color de fondo del Botón / Estadística</span>
              {customHex && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: customHex }} />
                  {customHex}
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : "#f97316"}
                onChange={(e) =>
                  onUpdate({
                    custom_hex: e.target.value,
                    color_id: "custom",
                    type: "solid",
                    animation_style: "none",
                    gradientFrom: undefined,
                    gradientTo: undefined,
                  })
                }
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
                title="Elegir color de fondo"
              />
              <Input
                value={customHex}
                onChange={(e) =>
                  onUpdate({
                    custom_hex: e.target.value,
                    color_id: "custom",
                    type: "solid",
                    animation_style: "none",
                    gradientFrom: undefined,
                    gradientTo: undefined,
                  })
                }
                placeholder="Ej: #f97316 (vacío = paleta del tema)"
                className="text-xs font-mono uppercase"
              />
            </div>
            {/* Paleta del tema rápida */}
            {palette.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-semibold">Paleta del tema:</span>
                {accentPalette(palette).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        custom_hex: p.hex,
                        color_id: p.id,
                        type: "solid",
                        animation_style: "none",
                        gradientFrom: undefined,
                        gradientTo: undefined,
                      })
                    }
                    className="h-5 px-1.5 rounded text-[10px] font-bold border border-border flex items-center gap-1 hover:opacity-80 transition"
                    style={{ backgroundColor: `${p.hex}25`, color: p.hex }}
                    title={p.name}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.hex }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sombreado / Contraste */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Sombreado / Contraste (shade)</Label>
              <span className="text-xs font-mono font-bold text-primary">{shadeNum === undefined ? "Auto" : `${shadeNum}%`}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={shadeNum ?? (mediaUrl && mediaMode === "fill" ? 45 : 0)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdate({ shade: val, overlayOpacity: val });
                }}
                className="w-full accent-primary cursor-pointer"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => onUpdate({ shade: undefined, overlayOpacity: undefined })}
              >
                Auto
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Capa oscura entre el fondo y el texto. 0% = sin sombreado.</p>
          </div>

          {/* Cobertura / Ancho */}
          <div>
            <Label className="text-xs font-semibold">Cobertura / Ancho</Label>
            <Select
              value={statWidth}
              onValueChange={(val: "auto" | "full") => onUpdate({ width: val })}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Ancho automático (ajustado al contenido)</SelectItem>
                <SelectItem value="full">Ancho completo 100% (bloque total)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-0.5">Controla si la estadística se expande a todo lo ancho o según su texto.</p>
          </div>

          {/* Fondo Animado / Relleno Vivo */}
          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Fondo Animado / Relleno Vivo
              </Label>
              <Select
                value={mediaMode}
                onValueChange={(val: "fill" | "none") => onUpdate({ media_mode: val })}
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
              Soporta video MP4/WebM en bucle, GIF o imagen para cubrir el fondo completo con contraste garantizado.
            </p>
            {mediaMode === "fill" && (
              <>
                <MediaDropZone
                  value={mediaUrl}
                  onChange={(url, detectedType) => {
                    const nextType = detectedType || (url ? (/\.(mp4|webm|quicktime)($|\?)/i.test(url) ? "videoFill" : "imageFill") : "solid");
                    onUpdate({
                      media_url: url,
                      bgImageUrl: url,
                      type: nextType,
                      ...(url ? {} : { shade: undefined }),
                    });
                  }}
                />
                <div>
                  <Label className="text-xs font-semibold">Espacio que cubre el fondo animado</Label>
                  <Select
                    value={mediaFit}
                    onValueChange={(val: "cover" | "contain" | "fill") => onUpdate({ media_fit: val })}
                  >
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cubrir todo el botón (recorta bordes)</SelectItem>
                      <SelectItem value="contain">Ajustar al centro (se ve completa)</SelectItem>
                      <SelectItem value="fill">Estirar para llenar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Ícono / Miniatura dentro de la tarjeta */}
          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                Ícono o Miniatura dentro de la Tarjeta
              </Label>
              <Select
                value={iconPos}
                onValueChange={(val: "none" | "left" | "right") => onUpdate({ icon_position: val, iconPosition: val })}
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
              Muestra una figura geométrica con imagen/ícono junto al texto. Puedes usarlo solo o combinado con el fondo animado.
            </p>
            {iconPos !== "none" && (
              <>
                <MediaDropZone
                  value={iconUrl}
                  onChange={(url) => onUpdate({ icon_url: url, ...(url ? {} : { bgImageUrl: item.media_url ? item.media_url : "" }) })}
                />
                <div>
                  <Label className="text-xs font-semibold">Forma del ícono</Label>
                  <Select
                    value={iconShape}
                    onValueChange={(val: ButtonIconShape) => onUpdate({ icon_shape: val })}
                  >
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUTTON_ICON_SHAPES.map((shape) => (
                        <SelectItem key={shape} value={shape}>
                          {ICON_SHAPE_LABELS[shape]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* D. Sección B: Acción al Pulsar (Comportamiento) */}
      <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-primary">
            Sección B: Acción al Pulsar (Comportamiento)
          </h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold">¿Qué acción debe ejecutar este elemento?</Label>
            <Select
              value={(() => {
                if (actionType === "none") return "none";
                if (actionType === "whatsapp") return "whatsapp";
                if (actionType === "cotizador" || actionValue === "/cotizador") return "/cotizador";
                const matchedInternal = SITE_INTERNAL_PAGES.find((p) => p.path === actionValue);
                if (matchedInternal) return matchedInternal.path;
                return "custom_link";
              })()}
              onValueChange={(val) => {
                if (val === "none") {
                  onUpdate({ action_type: "none", action_value: "" });
                } else if (val === "whatsapp") {
                  onUpdate({ action_type: "whatsapp" });
                } else if (val === "custom_link") {
                  const isKnownInternal = SITE_INTERNAL_PAGES.some((p) => p.path === actionValue);
                  onUpdate({
                    action_type: "link",
                    action_value: isKnownInternal ? "" : actionValue,
                  });
                } else {
                  // Es una de las páginas oficiales internas
                  onUpdate({
                    action_type: val === "/cotizador" ? "cotizador" : "link",
                    action_value: val,
                  });
                }
              }}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue placeholder="Selecciona una acción o página de destino" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Páginas Oficiales del Sitio
                </div>
                {SITE_INTERNAL_PAGES.map((page) => (
                  <SelectItem key={page.path} value={page.path}>
                    {page.label} ({page.path})
                  </SelectItem>
                ))}
                <div className="px-2 py-1 mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border/50">
                  Otras Acciones
                </div>
                <SelectItem value="none">Sin Acción (Texto Estático / Informativo)</SelectItem>
                <SelectItem value="whatsapp">💬 Abrir Chat de WhatsApp con Mensaje Personalizado</SelectItem>
                <SelectItem value="custom_link">🔗 Enlace Personalizado o URL Externa (https://...)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType !== "none" && actionType !== "whatsapp" && (() => {
            const matchedPage = SITE_INTERNAL_PAGES.find(
              (p) => p.path === actionValue || (actionType === "cotizador" && p.path === "/cotizador")
            );

            if (matchedPage) {
              return (
                <div className="sm:col-span-2 rounded-lg bg-background/50 border border-border/60 p-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
                  <div>
                    <span>Redirección interna configurada a: </span>
                    <span className="font-semibold text-foreground">{matchedPage.label}</span>{" "}
                    <code className="font-mono text-primary font-bold">({matchedPage.path})</code>
                  </div>
                </div>
              );
            }

            return (
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Enlace o URL de Destino Personalizada</Label>
                <Input
                  value={actionValue}
                  onChange={(e) => onUpdate({ action_value: e.target.value, action_type: "link" })}
                  placeholder="Ej: https://instagram.com/willdesign3d o /promociones"
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ingresa una URL externa completa con <code className="text-xs font-mono">https://</code> o una ruta interna personalizada.
                </p>
              </div>
            );
          })()}
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
                  value={actionValue}
                  onChange={(e) => onUpdate({ action_value: e.target.value })}
                  placeholder="573156724474 (solo números con código de país)"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Texto o Plantilla del Mensaje de WhatsApp</Label>
                <Textarea
                  rows={2}
                  value={item.whatsapp_message || ""}
                  onChange={(e) => onUpdate({ whatsapp_message: e.target.value })}
                  placeholder={`Hola Will Design 3D, me interesa la consulta sobre: ${item.k || ""} (${item.v || ""}).`}
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
                  Sube una foto JPG, PNG o WEBP de cualquier tamaño: se comprime automáticamente a &lt;280KB.
                </p>
                <MediaDropZone
                  forWhatsapp
                  value={item.whatsapp_image_url || ""}
                  onChange={(url) => onUpdate({ whatsapp_image_url: url })}
                />
              </div>

              {/* Estado del Modo de Mensaje según si hay o no imagen configurada */}
              <div className="sm:col-span-2">
                {item.whatsapp_image_url ? (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Previsualización activa: Se incluirá enlace corto con tu foto
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Al enviar el mensaje por WhatsApp, se adjuntará el enlace corto Open Graph <code className="text-[10px] font-mono font-bold">/r/{`s${index + 1}`}</code> para mostrar la tarjeta con la foto.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Mensaje limpio: Se enviará solo texto plano
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Como no has configurado ninguna foto arriba, WhatsApp enviará exclusivamente el texto del mensaje sin enlaces ni tarjetas.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live WhatsApp Message Preview Box */}
              <div className="sm:col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-1 text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  💬 Así se verá en WhatsApp:
                </span>
                <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] bg-background/50 p-2 rounded-lg border border-emerald-500/20">
                  {payload.formattedText || `Hola Will Design 3D, me interesa la consulta sobre: ${item.k || ""} (${item.v || ""}).`}
                </p>
                <p className="text-[10px] text-emerald-700/90 dark:text-emerald-300/90 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                  {payload.mediaToSend ? (
                    <>
                      <span>📎 Adjunto a enviar: <strong>{shortMediaName(payload.mediaToSend)}</strong></span>
                      <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">
                        Enlace ultra corto /r activo ✓
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      📄 Solo texto plano (sin adjunto ni enlace)
                    </span>
                  )}
                </p>
              </div>
            </div>
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
  collectionKey,
  title,
}: {
  value: string;
  onChange: (newValue: string) => void;
  collectionKey: StatCollectionKey;
  title: string;
}) {
  const { content } = useSiteContent();
  const activeTheme = getActiveTheme(content);
  const palette = activeTheme.colors.palette || [];
  const items = parseStatItems(value);

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

  function handleDuplicateItem(id: string) {
    const itemIndex = items.findIndex((it) => it.id === id);
    if (itemIndex === -1) return;
    const target = items[itemIndex];
    const cloned: HeroStatItem = {
      ...target,
      id: `${collectionKey}_${crypto.randomUUID()}`,
      k: target.k ? `${target.k} (Copia)` : "Nuevo Valor",
    };
    const next = [...items];
    next.splice(itemIndex + 1, 0, cloned);
    onChange(JSON.stringify(next));
    toast.success("Estadística duplicada con éxito");
  }

  function handleAddItem() {
    const newItem: HeroStatItem = {
      id: `${collectionKey}_${crypto.randomUUID()}`,
      k: "Nuevo Valor",
      v: "Descripción",
      action_type: "none",
    };
    onChange(JSON.stringify([...items, newItem]));
    toast.success("Nuevo elemento añadido");
  }

  function handlePositionChange(from: number, to: number) {
    onChange(JSON.stringify(arrayMove(items, from, to)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace(/^stat_order_/, "");
    const overId = String(over.id).replace(/^stat_order_/, "");
    const oldIndex = items.findIndex((it) => it.id === activeId);
    const newIndex = items.findIndex((it) => it.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      handlePositionChange(oldIndex, newIndex);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sistema de Orden de Estadísticas y Botones de Acción (Idéntico a Orden de Secciones) */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div>
          <Label className="text-sm font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Orden · {title}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map((it) => `stat_order_${it.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2.5">
              {items.map((it, idx) => (
                <HeroStatOrderRow
                  key={`stat_order_${it.id}`}
                  item={it}
                  index={idx}
                  onRemove={() => handleRemoveItem(it.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      {/* Editor Detallado de Estadísticas del Hero y Botones de Acción */}
      <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <Label className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              {title}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edita métricas, añade enlaces clickeables, íconos y personaliza el aspecto visual.
            </p>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="text-xs font-bold gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> + Añadir elemento
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <SortableHeroStatCard
                  key={it.id}
                  item={it}
                  index={idx}
                  palette={palette}
                  collectionKey={collectionKey}
                  onUpdate={(patch) => handleUpdateItem(it.id, patch)}
                  onDuplicate={() => handleDuplicateItem(it.id)}
                  onRemove={() => handleRemoveItem(it.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
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
  const opacityVal = values[`${prefix}opacity`] ? parseInt(values[`${prefix}opacity`], 10) : 100;
  const opacityNum = isNaN(opacityVal) ? 100 : Math.max(10, Math.min(100, opacityVal));
  const buttonWidth = (values[`${prefix}width`] as "auto" | "full") || "auto";
  const shadeRaw = values[`${prefix}shade`] ?? "";
  const shadeNum = shadeRaw === "" || isNaN(Number(shadeRaw)) ? undefined : Math.max(0, Math.min(100, Number(shadeRaw)));
  const mediaFit = (values[`${prefix}media_fit`] as "cover" | "contain" | "fill") || "cover";
  const iconShape = (values[`${prefix}icon_shape`] as ButtonIconShape) || "circle";

  const globalDefaultMsg = values["whatsapp_default_message"] || "";

  const payload = getWhatsAppPayloadForButton(
    {
      whatsapp_message: whatsappMsg,
      whatsapp_image_logic: whatsappLogic,
      whatsapp_image_url: whatsappImageUrl,
      whatsapp_image_key: waImageKey,
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
        hero_secondary_cta_opacity: v.hero_cta_opacity || "100",
        hero_secondary_cta_shade: v.hero_cta_shade || "",
        hero_secondary_cta_media_fit: v.hero_cta_media_fit || "cover",
        hero_secondary_cta_icon_shape: v.hero_cta_icon_shape || "circle",
        hero_secondary_cta_width: v.hero_cta_width || "auto",
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
      delete copy[`${prefix}opacity`];
      delete copy[`${prefix}shade`];
      delete copy[`${prefix}media_fit`];
      delete copy[`${prefix}icon_shape`];
      delete copy[`${prefix}width`];
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
                width: buttonWidth,
                position: "left",
                opacity: opacityNum,
                shade: shadeNum,
                media_fit: mediaFit,
                icon_shape: iconShape,
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

          {/* Color de fondo del Botón */}
          <div>
            <Label className="text-xs font-semibold">Color de fondo del Botón</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : "#f97316"}
                onChange={(e) => setValues((v) => ({ ...v, [customHexKey]: e.target.value }))}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
                title="Elegir color de fondo"
              />
              <Input
                value={customHex}
                onChange={(e) => setValues((v) => ({ ...v, [customHexKey]: e.target.value }))}
                placeholder="Ej: #f97316 (vacío = color de marca)"
                className="text-xs font-mono uppercase"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Se usa cuando no hay fondo vivo (imagen/animación).</p>
          </div>

          {/* Sombreado / Contraste */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Sombreado / Contraste</Label>
              <span className="text-xs font-mono font-bold text-primary">{shadeNum === undefined ? "Auto" : `${shadeNum}%`}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={shadeNum ?? (mediaUrl && mediaMode === "fill" ? 50 : 0)}
                onChange={(e) => setValues((v) => ({ ...v, [`${prefix}shade`]: e.target.value }))}
                className="w-full accent-primary cursor-pointer"
              />
              <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setValues((v) => ({ ...v, [`${prefix}shade`]: "" }))}>
                Auto
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Capa oscura entre el fondo y el texto. 0% = sin sombreado. Funciona con color sólido y con fondo animado.</p>
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
              <>
                <MediaDropZone
                  value={mediaUrl}
                  onChange={(url) => setValues((v) => ({ ...v, [mediaKey]: url }))}
                />
                <div>
                  <Label className="text-xs font-semibold">Espacio que cubre el fondo animado</Label>
                  <Select value={mediaFit} onValueChange={(val) => setValues((v) => ({ ...v, [`${prefix}media_fit`]: val }))}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cubrir todo el botón (recorta bordes)</SelectItem>
                      <SelectItem value="contain">Ajustar al centro (se ve completa)</SelectItem>
                      <SelectItem value="fill">Estirar para llenar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Cobertura / Ancho */}
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold">Cobertura / Ancho del botón</Label>
            <Select
              value={buttonWidth}
              onValueChange={(val) => setValues((v) => ({ ...v, [`${prefix}width`]: val }))}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Ancho automático (ajustado al texto)</SelectItem>
                <SelectItem value="full">Ancho completo 100% (bloque total)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-0.5">Controla si el botón se expande a todo lo ancho o según su texto.</p>
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
              <>
                <MediaDropZone
                  value={iconUrl}
                  onChange={(url) => setValues((v) => ({ ...v, [iconUrlKey]: url }))}
                />
                <div>
                  <Label className="text-xs font-semibold">Forma del ícono</Label>
                  <Select value={iconShape} onValueChange={(val) => setValues((v) => ({ ...v, [`${prefix}icon_shape`]: val }))}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUTTON_ICON_SHAPES.map((shape) => (
                        <SelectItem key={shape} value={shape}>
                          {ICON_SHAPE_LABELS[shape]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
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
              value={(() => {
                if (actionType === "whatsapp") return "whatsapp";
                const currentUrl = values[urlKey] ?? "";
                if (actionType === "cotizador" || currentUrl === "/cotizador") return "/cotizador";
                const matchedInternal = SITE_INTERNAL_PAGES.find((p) => p.path === currentUrl);
                if (matchedInternal) return matchedInternal.path;
                return "custom_link";
              })()}
              onValueChange={(val) => {
                if (val === "whatsapp") {
                  setValues((v) => ({
                    ...v,
                    [actionTypeKey]: "whatsapp",
                  }));
                } else if (val === "custom_link") {
                  setValues((v) => {
                    const currentUrl = v[urlKey] ?? "";
                    const isKnownInternal = SITE_INTERNAL_PAGES.some((p) => p.path === currentUrl);
                    return {
                      ...v,
                      [actionTypeKey]: "link",
                      [urlKey]: isKnownInternal ? "" : currentUrl,
                    };
                  });
                } else {
                  // Es una de las páginas internas de SITE_INTERNAL_PAGES
                  setValues((v) => ({
                    ...v,
                    [actionTypeKey]: val === "/cotizador" ? "cotizador" : "link",
                    [urlKey]: val,
                  }));
                }
              }}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue placeholder="Selecciona una acción o página de destino" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Páginas Oficiales del Sitio
                </div>
                {SITE_INTERNAL_PAGES.map((page) => (
                  <SelectItem key={page.path} value={page.path}>
                    {page.label} ({page.path})
                  </SelectItem>
                ))}
                <div className="px-2 py-1 mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border/50">
                  Otras Acciones
                </div>
                <SelectItem value="whatsapp">💬 Abrir Chat de WhatsApp con Mensaje Personalizado</SelectItem>
                <SelectItem value="custom_link">🔗 Enlace Personalizado o URL Externa (https://...)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType !== "whatsapp" && (() => {
            const currentUrl = values[urlKey] ?? "";
            const matchedPage = SITE_INTERNAL_PAGES.find(
              (p) => p.path === currentUrl || (actionType === "cotizador" && p.path === "/cotizador")
            );

            if (matchedPage) {
              return (
                <div className="sm:col-span-2 rounded-lg bg-background/50 border border-border/60 p-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
                  <div>
                    <span>Redirección interna configurada a: </span>
                    <span className="font-semibold text-foreground">{matchedPage.label}</span>{" "}
                    <code className="font-mono text-primary font-bold">({matchedPage.path})</code>
                  </div>
                </div>
              );
            }

            return (
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Enlace o URL de Destino Personalizada</Label>
                <Input
                  value={values[urlKey] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [urlKey]: e.target.value, [actionTypeKey]: "link" }))}
                  placeholder="Ej: https://instagram.com/willdesign3d o /promociones"
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ingresa una URL externa completa con <code className="text-xs font-mono">https://</code> o una ruta interna personalizada.
                </p>
              </div>
            );
          })()}
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
                  Sube una foto JPG, PNG o WEBP de cualquier tamaño: se reduce sola para que WhatsApp la muestre. Para verla grande en celular usa una foto horizontal. Videos y GIFs no sirven. Si dejas este campo vacío, el cliente enviará solo texto limpio.
                </p>
                <MediaDropZone
                  forWhatsapp
                  value={values[waImageKey] || ""}
                  onChange={(url) => setValues((v) => ({ ...v, [waImageKey]: url }))}
                />
              </div>

              {/* Estado del Modo de Mensaje según si hay o no imagen configurada */}
              <div className="sm:col-span-2">
                {values[waImageKey] ? (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Previsualización activa: Se incluirá enlace corto con tu foto
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Al enviar el mensaje por WhatsApp, se adjuntará el enlace corto Open Graph <code className="text-[10px] font-mono font-bold">/r/{WHATSAPP_REF_ALIASES[waImageKey] || waImageKey}</code> para mostrar la tarjeta con la foto.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Mensaje limpio: Se enviará solo texto plano
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Como no has configurado ninguna foto arriba, WhatsApp enviará exclusivamente el texto del mensaje sin enlaces ni tarjetas.
                      </p>
                    </div>
                  </div>
                )}
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
                  {payload.mediaToSend ? (
                    <>
                      <span>📎 Adjunto a enviar: <strong>{shortMediaName(payload.mediaToSend)}</strong></span>
                      <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">
                        Enlace ultra corto /r activo ✓
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      📄 Solo texto plano (sin adjunto ni enlace)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function HeroButtonOrderRow({
  button,
  index,
  onRemove,
}: {
  button: HeroButtonItem;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `order_${button.id}`,
  });
  const label = button.text?.trim() || `Botón #${index + 1}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl border bg-card p-3 transition shadow-2xs ${
        isDragging
          ? "z-20 border-primary bg-primary/10 shadow-xl ring-2 ring-primary"
          : "border-border hover:border-border/80"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar ${label}`}
        className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition"
        title="Arrastrar para reordenar botón"
      >
        <GripVertical className="h-5 w-5 text-primary" />
      </button>

      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
        #{index + 1}
      </span>

      <span className="text-sm font-bold flex-1 text-foreground flex items-center gap-2 truncate">
        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate">{label}</span>
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
        title="Eliminar este botón"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function SortableHeroButtonItemCard({
  button,
  index,
  palette,
  onUpdate,
  onDuplicate,
  onRemove,
}: {
  button: HeroButtonItem;
  index: number;
  palette: Array<{ id: string; name: string; hex: string }>;
  onUpdate: (patch: Partial<HeroButtonItem>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: button.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { content } = useSiteContent();

  const textColor = button.text_color || "";
  const customHex = button.custom_hex || "";
  const shadeNum = button.shade !== undefined ? Math.max(0, Math.min(100, button.shade)) : undefined;
  const buttonWidth = button.width || "auto";
  const mediaMode = button.media_mode || "fill";
  const mediaUrl = button.media_url || "";
  const mediaFit = button.media_fit || "cover";
  const iconPos = button.icon_position || "none";
  const iconUrl = button.icon_url || "";
  const iconShape = button.icon_shape || "circle";
  const actionType = button.action_type || "link";
  const actionValue = button.action_value || "";
  const whatsappNumber = button.whatsapp_number || "";
  const whatsappMsg = button.whatsapp_message || "";
  const whatsappImageUrl = button.whatsapp_image_url || "";

  const isVid = /\.(mp4|webm|quicktime)($|\?)/i.test(mediaUrl);
  const isGif = /\.gif($|\?)/i.test(mediaUrl);
  const isLottie = /\.json($|\?)/i.test(mediaUrl);
  const animType = isVid ? "video" : isGif ? "gif" : isLottie ? "lottie" : mediaUrl ? "image" : "none";

  const shortKey = index === 0 ? "hero" : `h${index + 1}`;

  const payload = getWhatsAppPayloadForButton(
    {
      whatsapp_message: whatsappMsg,
      whatsapp_image_logic: button.whatsapp_image_logic || "auto",
      whatsapp_image_url: whatsappImageUrl,
      whatsapp_image_key: shortKey,
    },
    mediaUrl || content?.hero_image_url || "",
    content?.site_logo_url,
    "Hola Will Design 3D, me interesa cotizar del Hero",
    content?.whatsapp_default_message || ""
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-dashed border-border p-5 space-y-6 bg-muted/20"
    >
      {/* Encabezado con Drag handle, #Index, Duplicar, Eliminar y Vista Previa */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Arrastrar botón #${index + 1}`}
            className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition"
            title="Arrastrar para reordenar botón del Hero"
          >
            <GripVertical className="h-5 w-5 text-primary" />
          </button>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
            #{index + 1}
          </span>
          <span className="text-sm font-bold text-foreground">
            {button.text || "Sin texto"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            className="h-8 text-xs font-semibold gap-1.5"
            title="Duplicar este botón"
          >
            <Copy className="h-3.5 w-3.5 text-primary" />
            Duplicar
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1.5"
            title="Eliminar este botón"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>

          {/* Vista previa en vivo idéntica a la tienda */}
          <div className="shrink-0 flex items-center gap-2 border-l border-border pl-3 ml-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Vista previa:</span>
            <UnifiedButton
              button={{
                id: button.id,
                text: button.text || "Vista Previa",
                action_type: actionType === "cotizador" ? "link" : (actionType as any),
                action_value: actionValue || "/cotizador",
                whatsapp_message: whatsappMsg,
                text_color: textColor || undefined,
                custom_hex: customHex || (index === 0 ? "var(--brand-orange)" : "var(--brand-wine)"),
                media_url: mediaMode === "fill" ? mediaUrl : undefined,
                media_mode: mediaMode,
                icon_url: iconUrl || (mediaMode === "icon" ? mediaUrl : undefined),
                icon_position: iconPos !== "none" ? iconPos : (mediaMode === "icon" ? "left" : "none"),
                animation_type: animType as any,
                variant: index === 0 ? "default" : "secondary",
                width: buttonWidth,
                position: "left",
                opacity: 100,
                shade: shadeNum,
                media_fit: mediaFit,
                icon_shape: iconShape,
                include_image_link: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* Texto visible del botón */}
      <div>
        <Label className="text-xs font-semibold">Texto visible del Botón</Label>
        <Input
          value={button.text || ""}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Ej: Cotizar Proyecto o Ver Tienda"
          className="mt-1 text-xs"
        />
      </div>

      {/* SECCIÓN A: DISEÑO Y ANIMACIÓN */}
      <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
            Sección A: Diseño y Animación
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Color del texto */}
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
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
                title="Elegir color visualmente"
              />
              <Input
                value={textColor}
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                placeholder="Ej: #ffffff, #000000, #fbbf24"
                className="text-xs font-mono uppercase"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Vacío = contraste automático según fondo o fondo vivo.</p>
          </div>

          {/* Color de fondo */}
          <div>
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Color de fondo del Botón</span>
              {customHex && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: customHex }} />
                  {customHex}
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : "#f97316"}
                onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 shrink-0"
                title="Elegir color de fondo"
              />
              <Input
                value={customHex}
                onChange={(e) => onUpdate({ custom_hex: e.target.value })}
                placeholder="Ej: #f97316 (vacío = color de marca)"
                className="text-xs font-mono uppercase"
              />
            </div>
            {/* Paleta del tema rápida */}
            {palette.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-semibold">Paleta del tema:</span>
                {accentPalette(palette).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onUpdate({ custom_hex: p.hex })}
                    className="h-5 px-1.5 rounded text-[10px] font-bold border border-border flex items-center gap-1 hover:opacity-80 transition"
                    style={{ backgroundColor: `${p.hex}25`, color: p.hex }}
                    title={p.name}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.hex }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sombreado / Contraste */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Sombreado / Contraste (shade)</Label>
              <span className="text-xs font-mono font-bold text-primary">{shadeNum === undefined ? "Auto" : `${shadeNum}%`}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={shadeNum ?? (mediaUrl && mediaMode === "fill" ? 45 : 0)}
                onChange={(e) => onUpdate({ shade: Number(e.target.value) })}
                className="w-full accent-primary cursor-pointer"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => onUpdate({ shade: undefined })}
              >
                Auto
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Capa oscura entre el fondo y el texto. 0% = sin sombreado.</p>
          </div>

          {/* Cobertura / Ancho */}
          <div>
            <Label className="text-xs font-semibold">Cobertura / Ancho del botón</Label>
            <Select
              value={buttonWidth}
              onValueChange={(val: "auto" | "full") => onUpdate({ width: val })}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Ancho automático (ajustado al texto)</SelectItem>
                <SelectItem value="full">Ancho completo 100% (bloque total)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-0.5">Controla si el botón se expande a todo lo ancho o según su texto.</p>
          </div>

          {/* Fondo animado / relleno vivo */}
          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Fondo Animado / Relleno Vivo (Llenar Botón Completo)
              </Label>
              <Select
                value={mediaMode}
                onValueChange={(val: "fill" | "none") => onUpdate({ media_mode: val })}
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
              Soporta video MP4/WebM en bucle, GIF o imagen para cubrir el fondo completo con contraste garantizado.
            </p>
            {mediaMode === "fill" && (
              <>
                <MediaDropZone
                  value={mediaUrl}
                  onChange={(url) => onUpdate({ media_url: url })}
                />
                <div>
                  <Label className="text-xs font-semibold">Espacio que cubre el fondo animado</Label>
                  <Select
                    value={mediaFit}
                    onValueChange={(val: "cover" | "contain" | "fill") => onUpdate({ media_fit: val })}
                  >
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cubrir todo el botón (recorta bordes)</SelectItem>
                      <SelectItem value="contain">Ajustar al centro (se ve completa)</SelectItem>
                      <SelectItem value="fill">Estirar para llenar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Ícono dentro del botón */}
          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                Ícono o Miniatura dentro del Botón
              </Label>
              <Select
                value={iconPos}
                onValueChange={(val: "none" | "left" | "right") => onUpdate({ icon_position: val })}
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
              Muestra una figura geométrica con imagen/ícono junto al texto.
            </p>
            {iconPos !== "none" && (
              <>
                <MediaDropZone
                  value={iconUrl}
                  onChange={(url) => onUpdate({ icon_url: url })}
                />
                <div>
                  <Label className="text-xs font-semibold">Forma del ícono</Label>
                  <Select
                    value={iconShape}
                    onValueChange={(val: ButtonIconShape) => onUpdate({ icon_shape: val })}
                  >
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUTTON_ICON_SHAPES.map((shape) => (
                        <SelectItem key={shape} value={shape}>
                          {ICON_SHAPE_LABELS[shape]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
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
              value={(() => {
                if (actionType === "whatsapp") return "whatsapp";
                if (actionType === "cotizador" || actionValue === "/cotizador") return "/cotizador";
                const matchedInternal = SITE_INTERNAL_PAGES.find((p) => p.path === actionValue);
                if (matchedInternal) return matchedInternal.path;
                return "custom_link";
              })()}
              onValueChange={(val) => {
                if (val === "whatsapp") {
                  onUpdate({ action_type: "whatsapp" });
                } else if (val === "custom_link") {
                  const isKnownInternal = SITE_INTERNAL_PAGES.some((p) => p.path === actionValue);
                  onUpdate({
                    action_type: "link",
                    action_value: isKnownInternal ? "" : actionValue,
                  });
                } else {
                  onUpdate({
                    action_type: val === "/cotizador" ? "cotizador" : "link",
                    action_value: val,
                  });
                }
              }}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue placeholder="Selecciona una acción o página de destino" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Páginas Oficiales del Sitio
                </div>
                {SITE_INTERNAL_PAGES.map((page) => (
                  <SelectItem key={page.path} value={page.path}>
                    {page.label} ({page.path})
                  </SelectItem>
                ))}
                <div className="px-2 py-1 mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border/50">
                  Otras Acciones
                </div>
                <SelectItem value="whatsapp">💬 Abrir Chat de WhatsApp con Mensaje Personalizado</SelectItem>
                <SelectItem value="custom_link">🔗 Enlace Personalizado o URL Externa (https://...)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType !== "whatsapp" && (() => {
            const matchedPage = SITE_INTERNAL_PAGES.find(
              (p) => p.path === actionValue || (actionType === "cotizador" && p.path === "/cotizador")
            );

            if (matchedPage) {
              return (
                <div className="sm:col-span-2 rounded-lg bg-background/50 border border-border/60 p-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
                  <div>
                    <span>Redirección interna configurada a: </span>
                    <span className="font-semibold text-foreground">{matchedPage.label}</span>{" "}
                    <code className="font-mono text-primary font-bold">({matchedPage.path})</code>
                  </div>
                </div>
              );
            }

            return (
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Enlace o URL de Destino Personalizada</Label>
                <Input
                  value={actionValue}
                  onChange={(e) => onUpdate({ action_value: e.target.value, action_type: "link" })}
                  placeholder="Ej: https://instagram.com/willdesign3d o /promociones"
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ingresa una URL externa completa con <code className="text-xs font-mono">https://</code> o una ruta interna personalizada.
                </p>
              </div>
            );
          })()}
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
                  value={whatsappNumber}
                  onChange={(e) => onUpdate({ whatsapp_number: e.target.value })}
                  placeholder="573156724474 (solo números con código de país)"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Texto o Plantilla del Mensaje de WhatsApp</Label>
                <Textarea
                  rows={2}
                  value={whatsappMsg}
                  onChange={(e) => onUpdate({ whatsapp_message: e.target.value })}
                  placeholder="Hola Will Design 3D, me interesa cotizar..."
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
                  Sube una foto JPG, PNG o WEBP de cualquier tamaño: se comprime automáticamente a &lt;280KB.
                </p>
                <MediaDropZone
                  forWhatsapp
                  value={whatsappImageUrl}
                  onChange={(url) => onUpdate({ whatsapp_image_url: url })}
                />
              </div>

              {/* Estado del Modo de Mensaje según si hay o no imagen configurada */}
              <div className="sm:col-span-2">
                {whatsappImageUrl ? (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Previsualización activa: Se incluirá enlace corto con tu foto
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Al enviar el mensaje por WhatsApp, se adjuntará el enlace corto Open Graph <code className="text-[10px] font-mono font-bold">/r/{shortKey}</code> para mostrar la tarjeta con la foto.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Mensaje limpio: Se enviará solo texto plano
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Como no has configurado ninguna foto arriba, WhatsApp enviará exclusivamente el texto del mensaje sin enlaces ni tarjetas.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live WhatsApp Message Preview Box */}
              <div className="sm:col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-1 text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  💬 Previsualización del enlace/mensaje que se enviará:
                </span>
                <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] bg-background/50 p-2 rounded-lg border border-emerald-500/20">
                  {payload.formattedText || "Hola Will Design 3D, me interesa cotizar..."}
                </p>
                <p className="text-[10px] text-emerald-700/90 dark:text-emerald-300/90 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                  {payload.mediaToSend ? (
                    <>
                      <span>📎 Adjunto a enviar: <strong>{shortMediaName(payload.mediaToSend)}</strong></span>
                      <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">
                        Enlace ultra corto /r activo ✓
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      📄 Solo texto plano (sin adjunto ni enlace)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroButtonsEditor({
  values,
  setValues,
}: {
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const { content } = useSiteContent();
  const activeTheme = getActiveTheme(content);
  const palette = activeTheme.colors.palette || [];

  const buttons = parseHeroButtons(values);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function syncLegacyKeys(updatedList: HeroButtonItem[]): Record<string, string> {
    const normalizedList = updatedList.map((b) => ({
      ...b,
      media_fit: b.media_fit || "cover",
    }));

    const patch: Record<string, string> = {
      hero_buttons: JSON.stringify(normalizedList),
      hero_buttons_order: "primary,secondary",
    };

    const b1 = normalizedList[0];
    if (b1) {
      patch.hero_cta_text = b1.text || "";
      patch.hero_cta_url = b1.action_value || "";
      patch.hero_cta_action_type = b1.action_type || "cotizador";
      patch.hero_cta_whatsapp_message = b1.whatsapp_message || "";
      patch.hero_cta_whatsapp_image_url = b1.whatsapp_image_url || "";
      patch.hero_cta_whatsapp_image_logic = b1.whatsapp_image_logic || "auto";
      patch.hero_cta_text_color = b1.text_color || "";
      patch.hero_cta_custom_hex = b1.custom_hex || "";
      patch.hero_cta_shade = b1.shade !== undefined ? String(b1.shade) : "";
      patch.hero_cta_media_url = b1.media_url || "";
      patch.hero_cta_media_mode = b1.media_mode || "fill";
      patch.hero_cta_media_fit = b1.media_fit || "cover";
      patch.hero_cta_icon_url = b1.icon_url || "";
      patch.hero_cta_icon_position = b1.icon_position || "none";
      patch.hero_cta_icon_shape = b1.icon_shape || "circle";
      patch.hero_cta_width = b1.width || "auto";
    }

    const b2 = normalizedList[1];
    if (b2) {
      patch.hero_secondary_cta_text = b2.text || "";
      patch.hero_secondary_cta_url = b2.action_value || "";
      patch.hero_secondary_cta_action_type = b2.action_type || "link";
      patch.hero_secondary_cta_whatsapp_message = b2.whatsapp_message || "";
      patch.hero_secondary_cta_whatsapp_image_url = b2.whatsapp_image_url || "";
      patch.hero_secondary_cta_whatsapp_image_logic = b2.whatsapp_image_logic || "auto";
      patch.hero_secondary_cta_text_color = b2.text_color || "";
      patch.hero_secondary_cta_custom_hex = b2.custom_hex || "";
      patch.hero_secondary_cta_shade = b2.shade !== undefined ? String(b2.shade) : "";
      patch.hero_secondary_cta_media_url = b2.media_url || "";
      patch.hero_secondary_cta_media_mode = b2.media_mode || "fill";
      patch.hero_secondary_cta_media_fit = b2.media_fit || "cover";
      patch.hero_secondary_cta_icon_url = b2.icon_url || "";
      patch.hero_secondary_cta_icon_position = b2.icon_position || "none";
      patch.hero_secondary_cta_icon_shape = b2.icon_shape || "circle";
      patch.hero_secondary_cta_width = b2.width || "auto";
    } else {
      patch.hero_secondary_cta_text = "";
      patch.hero_secondary_cta_url = "";
    }

    return patch;
  }

  function handleUpdateButton(id: string, patch: Partial<HeroButtonItem>) {
    const updated = buttons.map((b) => (b.id === id ? { ...b, ...patch } : b));
    const sync = syncLegacyKeys(updated);
    setValues((v) => ({ ...v, ...sync }));
  }

  function handleDuplicateButton(id: string) {
    const idx = buttons.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const target = buttons[idx];
    const cloned: HeroButtonItem = {
      ...target,
      id: `hero_btn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: target.text ? `${target.text} (Copia)` : "Nuevo Botón",
    };
    const next = [...buttons];
    next.splice(idx + 1, 0, cloned);
    const sync = syncLegacyKeys(next);
    setValues((v) => ({ ...v, ...sync }));
    toast.success("Botón duplicado con éxito");
  }

  function handleRemoveButton(id: string) {
    if (buttons.length <= 1) {
      toast.error("Debe haber al menos un botón en el Hero");
      return;
    }
    const updated = buttons.filter((b) => b.id !== id);
    const sync = syncLegacyKeys(updated);
    setValues((v) => ({ ...v, ...sync }));
    toast.success("Botón eliminado del Hero");
  }

  function handleAddButton() {
    const newBtn: HeroButtonItem = {
      id: `hero_btn_${Date.now()}`,
      text: "Nuevo Botón",
      action_type: "link",
      action_value: "/cotizador",
      custom_hex: "var(--brand-orange)",
      shade: 0,
      width: "auto",
      media_mode: "fill",
      media_fit: "cover",
      icon_position: "none",
    };
    const updated = [...buttons, newBtn];
    const sync = syncLegacyKeys(updated);
    setValues((v) => ({ ...v, ...sync }));
    toast.success("Nuevo botón añadido al Hero");
  }

  function handlePositionChange(from: number, to: number) {
    const moved = arrayMove(buttons, from, to);
    const sync = syncLegacyKeys(moved);
    setValues((v) => ({ ...v, ...sync }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace(/^order_/, "");
    const overId = String(over.id).replace(/^order_/, "");
    const oldIndex = buttons.findIndex((b) => b.id === activeId);
    const newIndex = buttons.findIndex((b) => b.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      handlePositionChange(oldIndex, newIndex);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sistema de Orden de los Botones del Hero (Idéntico a Orden de Secciones) */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div>
          <Label className="text-sm font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Orden de los Botones del Hero
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Arrastra los botones para decidir qué aparece primero al entrar a la página.
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={buttons.map((b) => `order_${b.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2.5">
              {buttons.map((b, idx) => (
                <HeroButtonOrderRow
                  key={`order_${b.id}`}
                  button={b}
                  index={idx}
                  onRemove={() => handleRemoveButton(b.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      {/* Editor Completo y Detallado de Botones de Acción del Hero */}
      <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <Label className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Botones de Acción del Hero (Ilimitados con Drag & Drop)
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Añade, reordena y personaliza todos los botones que desees mostrar en la cabecera principal.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleAddButton}
            className="text-xs font-bold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            + Añadir Botón al Hero
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={buttons.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {buttons.map((b, idx) => (
                <SortableHeroButtonItemCard
                  key={b.id}
                  button={b}
                  index={idx}
                  palette={palette}
                  onUpdate={(patch) => handleUpdateButton(b.id, patch)}
                  onDuplicate={() => handleDuplicateButton(b.id)}
                  onRemove={() => handleRemoveButton(b.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
    if (f.key === "hero_buttons" || f.key === "hero_buttons_order" || f.key === "hero_cta_text") {
      if (f.key !== "hero_buttons") {
        return null;
      }
      return (
        <HeroButtonsEditor
          key="hero_buttons_editor"
          values={values}
          setValues={setValues}
        />
      );
    }
    if (f.key.startsWith("hero_cta_")) {
      return null;
    }
    if (f.key.startsWith("hero_secondary_cta_")) {
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
            collectionKey={f.key as StatCollectionKey}
            title={f.label}
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

  const groups = getHomeEditorGroups(values.home_sections_order, Array.from(new Set(FIELDS.map((f) => f.group))));

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
                    <CardContent className="space-y-6 pt-6">
                      {group === "Servicios" ? (
                        <Button asChild variant="outline"><Link to="/panel/servicios">Editar servicios</Link></Button>
                      ) : group === "Cotizador" ? (
                        <Button asChild variant="outline"><Link to="/panel/cotizador">Editar cotizador</Link></Button>
                      ) : groupFields.map(renderField)}
                    </CardContent>
                  </Card>
                );
              })}
      </div>
    </div>
  );
}
