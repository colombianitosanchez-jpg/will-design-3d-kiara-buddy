import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Upload,
  Check,
  Building2,
  Search,
  Paintbrush,
  Palette,
  Globe,
  Trash2,
  Plus,
  GripVertical,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PRESET_THEMES,
  THEME_RADIUS_TOKENS,
  THEME_BUTTON_STYLE_LABELS,
  AMBIENT_EFFECT_LABELS,
  resolveThemes,
  ensureThemePalette,
  normalizeTheme,
  clampAmbientIntensity,
  type SiteTheme,
  type ThemeAnimation,
  type ThemeBorderRadius,
  type ThemeButtonStyle,
  type AmbientEffectType,
  type ColorToken,
} from "@/lib/theme";
import { getCanonicalBaseUrl, resolvePageSeo, type GranularSeoPageKey } from "@/lib/seo";
import {
  ContactBlocksOrderEditor,
  ContactChannelsEditor,
  ContactSocialLinksEditor,
} from "@/components/panel/CompanyContactEditors";
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

export const Route = createFileRoute("/panel/marca")({
  ssr: false,
  component: MarcaAdmin,
});

type Row = { key: string; value: string };

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "switch" | "select";
  help?: string;
  tab: "identidad" | "seo" | "empresa" | "temas";
  group: string;
  customEditor?: boolean;
  legacyFallback?: boolean;
};

const MARCA_FIELDS: FieldDef[] = [
  // ---------------------------------------------------------------- Identidad
  {
    key: "site_business_name",
    label: "Nombre Comercial Oficial",
    type: "text",
    help: "Nombre que se muestra en el header, footer y datos estructurados. Ej: Will Design 3D",
    tab: "identidad",
    group: "Logos y Nombre",
  },
  {
    key: "site_subtitle",
    label: "Subtítulo del Header",
    type: "text",
    help: "Texto pequeño al lado del logo en el header. Ej: Taller de Impresión 3D & Prototipado",
    tab: "identidad",
    group: "Logos y Nombre",
  },
  {
    key: "site_logo_url",
    label: "Logotipo Principal del Sitio",
    type: "image",
    help: "Imagen del logo oficial visible en header y footer.",
    tab: "identidad",
    group: "Logos y Nombre",
  },
  {
    key: "site_favicon_url",
    label: "Favicon de la Pestaña (.ico, .png, .svg)",
    type: "image",
    help: "Ícono visible en las pestañas de los navegadores.",
    tab: "identidad",
    group: "Logos y Nombre",
  },
  // --------------------------------------------------------------------- SEO
  {
    key: "site_canonical_domain",
    label: "Dominio Canónico Oficial",
    type: "text",
    help: "URL base para SEO y metadatos (ej: https://will-design-3d.lovable.app o tu dominio personalizado https://tudominio.com).",
    tab: "seo",
    group: "SEO Global",
  },
  {
    key: "site_title",
    label: "Título SEO Global del Sitio",
    type: "text",
    help: "Título principal por defecto cuando una página no define uno propio.",
    tab: "seo",
    group: "SEO Global Fallback",
  },
  {
    key: "site_description",
    label: "Descripción SEO Global (Fallback)",
    type: "textarea",
    help: "Si no llenas esto, se usará automáticamente el título y texto que configures en Contenido / Productos / Servicios.",
    tab: "seo",
    group: "SEO Global Fallback",
  },
  {
    key: "site_meta_thumbnail_url",
    label: "Miniatura Social Global (OG Image Fallback)",
    type: "image",
    help: "Imagen recomendada 1200×630 px para compartir en WhatsApp, Facebook y Twitter.",
    tab: "seo",
    group: "SEO Global Fallback",
  },
  {
    key: "site_indexable_global",
    label: "Permitir Indexación en Buscadores (robots)",
    type: "switch",
    help: "Activa o desactiva la indexación en motores de búsqueda.",
    tab: "seo",
    group: "SEO Global Fallback",
  },
  // --------------------------------------------------- SEO Granular por Página
  {
    key: "seo_home_title",
    label: "Título SEO — Inicio",
    type: "text",
    help: "Opcional. Si queda vacío, usa el título del Hero o el título global.",
    tab: "seo",
    group: "SEO por Página · Inicio (/)",
  },
  {
    key: "seo_home_description",
    label: "Descripción SEO — Inicio",
    type: "textarea",
    help: "Opcional. Si queda vacío, usa el subtítulo del Hero o la descripción global.",
    tab: "seo",
    group: "SEO por Página · Inicio (/)",
  },
  {
    key: "seo_home_image",
    label: "Imagen Social (OG) — Inicio",
    type: "image",
    help: "Opcional. Imagen estática (JPG/PNG, 1200×630 recomendado) para compartir en WhatsApp y redes.",
    tab: "seo",
    group: "SEO por Página · Inicio (/)",
  },
  {
    key: "seo_tienda_title",
    label: "Título SEO — Tienda",
    type: "text",
    help: "Opcional. Si queda vacío, genera 'Tienda · Título Global'.",
    tab: "seo",
    group: "SEO por Página · Tienda (/tienda)",
  },
  {
    key: "seo_tienda_description",
    label: "Descripción SEO — Tienda",
    type: "textarea",
    help: "Opcional. Si queda vacío, usa la descripción global.",
    tab: "seo",
    group: "SEO por Página · Tienda (/tienda)",
  },
  {
    key: "seo_tienda_image",
    label: "Imagen Social (OG) — Tienda",
    type: "image",
    help: "Opcional. Imagen estática (JPG/PNG) para compartir la tienda.",
    tab: "seo",
    group: "SEO por Página · Tienda (/tienda)",
  },
  {
    key: "seo_servicios_title",
    label: "Título SEO — Servicios",
    type: "text",
    help: "Opcional. Si queda vacío, usa el título de la sección de servicios o 'Servicios 3D'.",
    tab: "seo",
    group: "SEO por Página · Servicios (/servicios)",
  },
  {
    key: "seo_servicios_description",
    label: "Descripción SEO — Servicios",
    type: "textarea",
    help: "Opcional. Si queda vacío, usa el subtítulo o descripción de servicios.",
    tab: "seo",
    group: "SEO por Página · Servicios (/servicios)",
  },
  {
    key: "seo_servicios_image",
    label: "Imagen Social (OG) — Servicios",
    type: "image",
    help: "Opcional. Imagen estática (JPG/PNG) para compartir Servicios.",
    tab: "seo",
    group: "SEO por Página · Servicios (/servicios)",
  },
  {
    key: "seo_cotizador_title",
    label: "Título SEO — Cotizador",
    type: "text",
    help: "Opcional. Si queda vacío, genera 'Cotizador 3D · Título Global'.",
    tab: "seo",
    group: "SEO por Página · Cotizador (/cotizador)",
  },
  {
    key: "seo_cotizador_description",
    label: "Descripción SEO — Cotizador",
    type: "textarea",
    help: "Opcional. Si queda vacío, usa la descripción predeterminada del cotizador.",
    tab: "seo",
    group: "SEO por Página · Cotizador (/cotizador)",
  },
  {
    key: "seo_cotizador_image",
    label: "Imagen Social (OG) — Cotizador",
    type: "image",
    help: "Opcional. Imagen estática (JPG/PNG) para compartir el cotizador.",
    tab: "seo",
    group: "SEO por Página · Cotizador (/cotizador)",
  },
  {
    key: "seo_galeria_title",
    label: "Título SEO — Galería",
    type: "text",
    help: "Opcional. Si queda vacío, genera 'Galería de Proyectos · Título Global'.",
    tab: "seo",
    group: "SEO por Página · Galería (/galeria)",
  },
  {
    key: "seo_galeria_description",
    label: "Descripción SEO — Galería",
    type: "textarea",
    help: "Opcional. Si queda vacío, usa la descripción global.",
    tab: "seo",
    group: "SEO por Página · Galería (/galeria)",
  },
  {
    key: "seo_galeria_image",
    label: "Imagen Social (OG) — Galería",
    type: "image",
    help: "Opcional. Imagen estática (JPG/PNG) para compartir la galería.",
    tab: "seo",
    group: "SEO por Página · Galería (/galeria)",
  },
  {
    key: "seo_nosotros_title",
    label: "Título SEO — Nosotros",
    type: "text",
    help: "Opcional. Si queda vacío, genera 'Nosotros · Título Global'.",
    tab: "seo",
    group: "SEO por Página · Nosotros (/nosotros)",
  },
  {
    key: "seo_nosotros_description",
    label: "Descripción SEO — Nosotros",
    type: "textarea",
    help: "Opcional. Si queda vacío, usa la reseña corta de Nosotros o la descripción global.",
    tab: "seo",
    group: "SEO por Página · Nosotros (/nosotros)",
  },
  {
    key: "seo_nosotros_image",
    label: "Imagen Social (OG) — Nosotros",
    type: "image",
    help: "Opcional. Imagen estática (JPG/PNG) para compartir Nosotros.",
    tab: "seo",
    group: "SEO por Página · Nosotros (/nosotros)",
  },
  {
    key: "seo_contacto_title",
    label: "Título SEO — Contacto",
    type: "text",
    help: "Opcional. Si queda vacío, genera 'Contacto · Título Global'.",
    tab: "seo",
    group: "SEO por Página · Contacto (/contacto)",
  },
  {
    key: "seo_contacto_description",
    label: "Descripción SEO — Contacto",
    type: "textarea",
    help: "Opcional. Si queda vacío, usa la descripción global.",
    tab: "seo",
    group: "SEO por Página · Contacto (/contacto)",
  },
  {
    key: "seo_contacto_image",
    label: "Imagen Social (OG) — Contacto",
    type: "image",
    help: "Opcional. Imagen estática (JPG/PNG) para compartir Contacto.",
    tab: "seo",
    group: "SEO por Página · Contacto (/contacto)",
  },

  // ----------------------------------------------------------------- Empresa
  { key: "site_area_served", label: "Área o Ciudad de Servicio (JSON-LD)", type: "text", help: "Ej: Bogotá, Colombia", tab: "empresa", group: "Ubicación y Cobertura" },
  { key: "contact_location_text", label: "Ubicación Completa (Texto)", type: "text", help: "Ej: Bogotá, Colombia · atención por cita previa", tab: "empresa", group: "Ubicación y Cobertura" },
  { key: "contact_location_short", label: "Ubicación Corta (Footer)", type: "text", help: "Ej: Bogotá, Colombia", tab: "empresa", group: "Ubicación y Cobertura" },
  { key: "contact_map_embed_url", label: "URL de Google Maps (Iframe embed)", type: "textarea", help: "URL src del iframe de Google Maps.", tab: "empresa", group: "Ubicación y Cobertura" },

  { key: "contact_blocks_order", label: "Orden visual de bloques en /contacto (JSON)", type: "textarea", tab: "empresa", group: "Canales y Redes (Editor)", customEditor: true },
  { key: "contact_channels", label: "Canales directos dinámicos (JSON)", type: "textarea", tab: "empresa", group: "Canales y Redes (Editor)", customEditor: true },
  { key: "contact_social_links", label: "Redes sociales dinámicas (JSON)", type: "textarea", tab: "empresa", group: "Canales y Redes (Editor)", customEditor: true },

  { key: "contact_whatsapp", label: "WhatsApp (solo números)", type: "text", help: "Ej: 573156724474", tab: "empresa", group: "Canales de Contacto", legacyFallback: true },
  { key: "contact_whatsapp_display", label: "WhatsApp Formateado", type: "text", help: "Ej: +57 315 672 4474", tab: "empresa", group: "Canales de Contacto", legacyFallback: true },
  { key: "contact_email", label: "Correo Electrónico de Contacto", type: "text", tab: "empresa", group: "Canales de Contacto", legacyFallback: true },
  { key: "contact_instagram_url", label: "URL Completa de Instagram", type: "text", help: "Ej: https://www.instagram.com/will_design2020/", tab: "empresa", group: "Canales de Contacto", legacyFallback: true },
  { key: "contact_instagram_handle", label: "Usuario de Instagram Visible", type: "text", help: "Ej: @will_design2020", tab: "empresa", group: "Canales de Contacto", legacyFallback: true },

  // ------------------------------------------------------------------- Temas
  { key: "custom_themes", label: "Temas Personalizados (JSON)", type: "textarea", tab: "temas", group: "Temas" },
  { key: "active_theme_id", label: "ID Tema Activo", type: "text", tab: "temas", group: "Temas" },
];

function SeoPreviewCard({ values }: { values: Record<string, string> }) {
  const [selectedPage, setSelectedPage] = useState<GranularSeoPageKey>("home");

  const baseUrl = getCanonicalBaseUrl(values);
  const hostLabel = (() => {
    try {
      return new URL(baseUrl).hostname.toUpperCase();
    } catch {
      return baseUrl.replace(/^https?:\/\//i, "").split("/")[0]?.toUpperCase() || "WILL-DESIGN-3D.LOVABLE.APP";
    }
  })();

  const pathMap: Record<GranularSeoPageKey, string> = {
    home: "/",
    tienda: "/tienda",
    servicios: "/servicios",
    cotizador: "/cotizador",
    galeria: "/galeria",
    nosotros: "/nosotros",
    contacto: "/contacto",
  };

  const resolved = resolvePageSeo(selectedPage, values);
  const curr = {
    url: `${baseUrl}${pathMap[selectedPage]}`,
    title: resolved.title,
    desc: resolved.description,
    img: resolved.image,
  };

  return (
    <Card className="border-2 border-primary/30 bg-card mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Vista Previa SEO e Impacto Social
            </CardTitle>
            <CardDescription>
              Simulación de cómo ven Google, WhatsApp y Facebook tus enlaces al compartirlos.
            </CardDescription>
          </div>
          <Select value={selectedPage} onValueChange={(v) => setSelectedPage(v as GranularSeoPageKey)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Página de Inicio (/)</SelectItem>
              <SelectItem value="tienda">Tienda (/tienda)</SelectItem>
              <SelectItem value="servicios">Servicios (/servicios)</SelectItem>
              <SelectItem value="cotizador">Cotizador (/cotizador)</SelectItem>
              <SelectItem value="galeria">Galería (/galeria)</SelectItem>
              <SelectItem value="nosotros">Nosotros (/nosotros)</SelectItem>
              <SelectItem value="contacto">Contacto (/contacto)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Google Preview */}
          <div className="rounded-2xl border border-border bg-white p-4 text-black dark:bg-slate-900 dark:text-white">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Google Search Result
            </span>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-mono truncate">{curr.url}</div>
            <div className="text-base font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer line-clamp-1 mt-0.5">
              {curr.title || <span className="text-muted-foreground italic">Sin título configurado</span>}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
              {curr.desc || <span className="text-muted-foreground italic">Sin descripción configurada</span>}
            </div>
          </div>

          {/* Social Media Preview */}
          <div className="rounded-2xl border border-border bg-slate-50 dark:bg-slate-950 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              WhatsApp / Facebook / Twitter Card
            </span>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
                {curr.img ? (
                  <img src={curr.img} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                    Sin miniatura configurada
                  </div>
                )}
              </div>
              <div className="p-3">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">
                  {hostLabel}
                </span>
                <p className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">
                  {curr.title || <span className="text-muted-foreground italic">Sin título configurado</span>}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {curr.desc || <span className="text-muted-foreground italic">Sin descripción configurada</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CollapsibleSeoGroupCard({
  title,
  configuredCount,
  totalCount,
  children,
}: {
  title: string;
  configuredCount: number;
  totalCount: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-base font-bold text-foreground">{title}</span>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              configuredCount > 0
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {configuredCount > 0
              ? `${configuredCount}/${totalCount} personalizados`
              : "Automático (Fallback)"}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <CardContent className="space-y-6 border-t border-border pt-6">{children}</CardContent>}
    </Card>
  );
}

function SortableColorRow({
  token,
  onUpdate,
  onDelete,
}: {
  token: ColorToken;
  onUpdate: (id: string, patch: Partial<ColorToken>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: token.id,
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
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
        title="Arrastrar para reordenar color"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border shadow-inner">
        <input
          type="color"
          value={token.hex.startsWith("#") ? token.hex : "#000000"}
          onChange={(e) => onUpdate(token.id, { hex: e.target.value })}
          className="absolute -inset-2 h-14 w-14 cursor-pointer border-0"
        />
      </div>

      <div className="flex-1 min-w-[140px]">
        <Input
          type="text"
          value={token.name}
          onChange={(e) => onUpdate(token.id, { name: e.target.value })}
          placeholder="Nombre del color (Ej: Rojo Acento)"
          className="h-9 text-xs font-semibold"
        />
      </div>

      <div className="w-28 shrink-0">
        <Input
          type="text"
          value={token.hex}
          onChange={(e) => onUpdate(token.id, { hex: e.target.value })}
          placeholder="#FF0000"
          className="h-9 text-xs font-mono"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(token.id)}
        className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        title="Eliminar color de la paleta"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PaletteEditor({
  palette,
  onChange,
}: {
  palette: ColorToken[];
  onChange: (newPalette: ColorToken[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleAddColor() {
    const nextId = `color_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newColor: ColorToken = {
      id: nextId,
      name: `Color ${palette.length + 1}`,
      hex: "#3b82f6",
    };
    onChange([...palette, newColor]);
    toast.success("Nuevo color añadido a la paleta");
  }

  function handleUpdateColor(id: string, patch: Partial<ColorToken>) {
    onChange(palette.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function handleDeleteColor(id: string) {
    if (palette.length <= 1) {
      toast.error("El tema debe tener al menos un color en la paleta");
      return;
    }
    onChange(palette.filter((c) => c.id !== id));
    toast.success("Color eliminado");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = palette.findIndex((c) => c.id === active.id);
    const newIndex = palette.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(arrayMove(palette, oldIndex, newIndex));
    }
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={palette.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {palette.map((token) => (
              <SortableColorRow
                key={token.id}
                token={token}
                onUpdate={handleUpdateColor}
                onDelete={handleDeleteColor}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddColor}
        className="mt-2 text-xs font-bold"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar color a la paleta
      </Button>
    </div>
  );
}

function ThemeManagerTab({
  values,
  onChange,
}: {
  values: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
}) {
  const activeThemeId = values.active_theme_id || "default";
  const themes = resolveThemes(values.custom_themes);
  const [editingTheme, setEditingTheme] = useState<SiteTheme | null>(null);

  function selectTheme(id: string) {
    onChange({ active_theme_id: id });
    toast.success("Tema activado globalmente");
  }

  function handleCreateTheme(baseTheme?: SiteTheme) {
    const newId = `custom_${Date.now()}`;
    const baseNormalized = baseTheme ? normalizeTheme(baseTheme) : normalizeTheme(PRESET_THEMES[0]);
    const newTheme = normalizeTheme({
      id: newId,
      name: baseTheme ? `${baseTheme.name} (Copia)` : "Nuevo Tema Personalizado",
      description: baseTheme
        ? `Versión personalizada basada en ${baseTheme.name}`
        : "Tema personalizado editable con paleta, bordes y ambiente en vivo",
      isPreset: false,
      colors: ensureThemePalette(baseNormalized.colors),
      buttonStyle: { ...baseNormalized.buttonStyle },
      ambient: baseNormalized.ambient ? { ...baseNormalized.ambient } : { effect: "none", intensity: 55 },
      customCss: baseNormalized.customCss || "",
    });
    const customList = themes.filter((t) => !t.isPreset);
    const updatedCustom = [...customList, newTheme];
    onChange({
      custom_themes: JSON.stringify(updatedCustom),
      active_theme_id: newId,
    });
    setEditingTheme(newTheme);
    toast.success("Tema creado y activado");
  }

  function handleSaveEditingTheme(updated: SiteTheme) {
    // Sincronizar brandOrange, brandTeal, brandWine, background con la paleta para retrocompatibilidad
    const p = updated.colors.palette;
    const brandOrange = p.find((c) => c.id === "brandOrange")?.hex || p[0]?.hex || updated.colors.brandOrange;
    const brandTeal = p.find((c) => c.id === "brandTeal")?.hex || p[1]?.hex || updated.colors.brandTeal;
    const brandWine = p.find((c) => c.id === "brandWine")?.hex || p[2]?.hex || updated.colors.brandWine;
    const background = p.find((c) => c.id === "background")?.hex || p[3]?.hex || updated.colors.background;

    const normalizedTheme = normalizeTheme({
      ...updated,
      colors: {
        ...updated.colors,
        brandOrange,
        brandTeal,
        brandWine,
        background,
      },
    });

    const customList = themes.filter((t) => !t.isPreset);
    const nextCustom = customList.map((t) => (t.id === normalizedTheme.id ? normalizedTheme : t));
    if (!customList.some((t) => t.id === normalizedTheme.id)) {
      nextCustom.push(normalizedTheme);
    }
    onChange({ custom_themes: JSON.stringify(nextCustom) });
    setEditingTheme(normalizedTheme);
  }

  function handleDeleteTheme(id: string) {
    const nextCustom = themes.filter((t) => !t.isPreset && t.id !== id);
    const nextActive = activeThemeId === id ? "default" : activeThemeId;
    onChange({
      custom_themes: JSON.stringify(nextCustom),
      active_theme_id: nextActive,
    });
    if (editingTheme?.id === id) setEditingTheme(null);
    toast.success("Tema eliminado");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selector de Tema Visual Activo</CardTitle>
          <CardDescription>
            Elige la paleta, radio de bordes, estilo global de botones y efectos ambientales en vivo aplicados a todo el sitio web.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((rawTheme) => {
              const t = normalizeTheme(rawTheme);
              const isActive = t.id === activeThemeId;
              const palette = ensureThemePalette(t.colors).palette;
              const radiusLabel = THEME_RADIUS_TOKENS[t.buttonStyle.globalRadius ?? "default"].label;
              const btnStyleLabel = THEME_BUTTON_STYLE_LABELS[t.buttonStyle.visualStyle ?? "solid"];
              const ambientLabel = AMBIENT_EFFECT_LABELS[t.ambient?.effect ?? "none"];

              return (
                <div
                  key={t.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                    isActive ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm">{t.name}</h3>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        {t.isPreset ? "Oficial" : "Custom"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {palette.slice(0, 6).map((col) => (
                        <span
                          key={col.id}
                          className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                          style={{ background: col.hex }}
                          title={`${col.name}: ${col.hex}`}
                        />
                      ))}
                    </div>

                    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                      {radiusLabel} · {btnStyleLabel} · {ambientLabel}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {!isActive ? (
                      <Button size="sm" onClick={() => selectTheme(t.id)}>
                        Activar tema
                      </Button>
                    ) : (
                      <span className="text-xs font-bold text-primary">✓ Activo</span>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateTheme(t)}
                    >
                      {t.isPreset ? "Duplicar y personalizar" : "Duplicar"}
                    </Button>

                    {!t.isPreset && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setEditingTheme(t)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteTheme(t.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <Button variant="outline" onClick={() => handleCreateTheme()}>
              + Crear Nuevo Tema Personalizado
            </Button>
          </div>
        </CardContent>
      </Card>

      {editingTheme && !editingTheme.isPreset && (
        <Card className="border-2 border-primary/40">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Editando Tema: {editingTheme.name}</CardTitle>
              <CardDescription>
                Personaliza paleta de colores, radio global, estilo visual de botones y ambiente en vivo.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditingTheme(null)}>
              Cerrar editor
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold">Nombre del Tema</Label>
                <Input
                  value={editingTheme.name}
                  onChange={(e) =>
                    handleSaveEditingTheme({ ...editingTheme, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Descripción</Label>
                <Input
                  value={editingTheme.description}
                  onChange={(e) =>
                    handleSaveEditingTheme({ ...editingTheme, description: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Paleta de Colores Dinámica (Arrastra para reordenar)
              </h4>
              <PaletteEditor
                palette={ensureThemePalette(editingTheme.colors).palette}
                onChange={(newPalette) =>
                  handleSaveEditingTheme({
                    ...editingTheme,
                    colors: {
                      ...editingTheme.colors,
                      palette: newPalette,
                    },
                  })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bordes y Radio Global (--radius)
                </Label>
                <Select
                  value={editingTheme.buttonStyle.globalRadius || "default"}
                  onValueChange={(val: ThemeBorderRadius) =>
                    handleSaveEditingTheme({
                      ...editingTheme,
                      buttonStyle: { ...editingTheme.buttonStyle, globalRadius: val },
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(THEME_RADIUS_TOKENS) as ThemeBorderRadius[]).map((rk) => (
                      <SelectItem key={rk} value={rk}>
                        {THEME_RADIUS_TOKENS[rk].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estilo Visual de Botones
                </Label>
                <Select
                  value={editingTheme.buttonStyle.visualStyle || "solid"}
                  onValueChange={(val: ThemeButtonStyle) =>
                    handleSaveEditingTheme({
                      ...editingTheme,
                      buttonStyle: { ...editingTheme.buttonStyle, visualStyle: val },
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(THEME_BUTTON_STYLE_LABELS) as ThemeButtonStyle[]).map((sk) => (
                      <SelectItem key={sk} value={sk}>
                        {THEME_BUTTON_STYLE_LABELS[sk]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Animación de Botones
                </Label>
                <Select
                  value={editingTheme.buttonStyle.animation || "none"}
                  onValueChange={(val: ThemeAnimation) =>
                    handleSaveEditingTheme({
                      ...editingTheme,
                      buttonStyle: { ...editingTheme.buttonStyle, animation: val },
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin Animación</SelectItem>
                    <SelectItem value="neon_glow">Neón Cyberpunk ⚡</SelectItem>
                    <SelectItem value="cyber_pulse">Pulso Dinámico 💫</SelectItem>
                    <SelectItem value="shimmer">Brillo Shimmer ✨</SelectItem>
                    <SelectItem value="festive_sparkle">Destello Festivo 🌟</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Efecto Ambiental en Vivo
                </Label>
                <Select
                  value={editingTheme.ambient?.effect || "none"}
                  onValueChange={(val: AmbientEffectType) =>
                    handleSaveEditingTheme({
                      ...editingTheme,
                      ambient: {
                        effect: val,
                        intensity: clampAmbientIntensity(editingTheme.ambient?.intensity),
                      },
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AMBIENT_EFFECT_LABELS) as AmbientEffectType[]).map((ak) => (
                      <SelectItem key={ak} value={ak}>
                        {AMBIENT_EFFECT_LABELS[ak]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingTheme.ambient?.effect && editingTheme.ambient.effect !== "none" && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Intensidad del Efecto Ambiental</span>
                  <span className="font-mono text-primary">
                    {clampAmbientIntensity(editingTheme.ambient.intensity)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={clampAmbientIntensity(editingTheme.ambient.intensity)}
                  onChange={(e) =>
                    handleSaveEditingTheme({
                      ...editingTheme,
                      ambient: {
                        effect: editingTheme.ambient?.effect ?? "none",
                        intensity: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-2 w-full accent-primary cursor-pointer"
                />
              </div>
            )}

            {/* Vista Previa en Vivo del Tema */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Vista Previa en Vivo del Tema
              </div>
              <div
                className="border p-5 transition-all"
                style={{
                  background: editingTheme.colors.background,
                  color: editingTheme.colors.foreground || undefined,
                  borderRadius:
                    THEME_RADIUS_TOKENS[editingTheme.buttonStyle.globalRadius ?? "default"].cssRadius,
                  borderColor: editingTheme.colors.border || "var(--border)",
                }}
              >
                <p className="text-sm font-black">Tarjeta de ejemplo con tu radio y colores</p>
                <p className="mt-1 text-xs opacity-80">
                  Estilo de botones: {THEME_BUTTON_STYLE_LABELS[editingTheme.buttonStyle.visualStyle ?? "solid"]} ·{" "}
                  Ambiente: {AMBIENT_EFFECT_LABELS[editingTheme.ambient?.effect ?? "none"]}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn-primary unified-theme-btn px-5 py-2.5 text-xs"
                    style={{
                      background: editingTheme.colors.brandOrange,
                      borderRadius:
                        THEME_RADIUS_TOKENS[editingTheme.buttonStyle.globalRadius ?? "default"].buttonRadius,
                    }}
                  >
                    Botón Principal
                  </button>
                  <button
                    type="button"
                    className="btn-outline unified-theme-btn px-5 py-2.5 text-xs"
                    style={{
                      borderColor: editingTheme.colors.brandTeal,
                      color: editingTheme.colors.brandTeal,
                      borderRadius:
                        THEME_RADIUS_TOKENS[editingTheme.buttonStyle.globalRadius ?? "default"].buttonRadius,
                    }}
                  >
                    Botón Secundario
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MarcaAdmin() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("site_content").select("key,value");
    const map: Record<string, string> = {};
    (data as Row[] | null)?.forEach((r) => (map[r.key] = r.value));
    for (const f of MARCA_FIELDS) if (!(f.key in map)) map[f.key] = "";
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
    const changed = MARCA_FIELDS.filter((f) => (values[f.key] ?? "") !== (lastSaved.current?.[f.key] ?? ""));
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
        section: "Marca y SEO",
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

  async function uploadImage(key: string, file: File) {
    setUploadingKey(key);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("El archivo supera 50MB");
      const path = `content/${key}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("site-media").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      setValues((v) => ({ ...v, [key]: signed.data.signedUrl }));
      toast.success("Imagen subida");
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
    } finally {
      setUploadingKey(null);
    }
  }

  function renderField(f: FieldDef) {
    if (f.type === "switch") {
      const isTrue = (values[f.key] ?? "").toLowerCase() !== "false";
      return (
        <div key={f.key} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <Label className="text-sm font-bold">{f.label}</Label>
            {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          </div>
          <Switch
            checked={isTrue}
            onCheckedChange={(on) => setValues((v) => ({ ...v, [f.key]: on ? "true" : "false" }))}
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
          <Textarea
            id={f.key}
            rows={f.type === "text" ? 1 : 3}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className="resize-y"
          />
        )}

        {f.key === "contact_map_embed_url" && (
          <div className="space-y-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMapPreview((prev) => !prev)}
            >
              {showMapPreview ? (
                <>
                  <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Ocultar vista previa del mapa
                </>
              ) : (
                <>
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Vista previa del mapa
                </>
              )}
            </Button>

            {showMapPreview && (
              values[f.key]?.trim().startsWith("https://") ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <iframe
                    src={values[f.key].trim()}
                    title="Vista previa del mapa de contacto"
                    className="h-64 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ingresa una URL HTTPS válida de Google Maps embed para previsualizar el mapa.
                </p>
              )
            )}
          </div>
        )}

        {f.type === "image" && (
          <div className="flex flex-wrap items-center gap-4">
            {values[f.key] ? (
              <img src={values[f.key]} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-muted" />
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
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando marca y SEO…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-20 -mx-1 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" /> Marca, SEO y Apariencia
          </h1>
          <p className="text-sm text-muted-foreground">
            Configuración global de identidad, SEO, datos de empresa y temas visuales.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Guardando…" : "Guardado automático"}
        </span>
      </div>

      <Tabs defaultValue="identidad">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="identidad" className="flex items-center gap-2 py-2">
            <Building2 className="h-4 w-4" /> Identidad
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2 py-2">
            <Search className="h-4 w-4" /> SEO Global y Páginas
          </TabsTrigger>
          <TabsTrigger value="empresa" className="flex items-center gap-2 py-2">
            <Globe className="h-4 w-4" /> Datos de Empresa
          </TabsTrigger>
          <TabsTrigger value="temas" className="flex items-center gap-2 py-2">
            <Paintbrush className="h-4 w-4" /> Temas y Estilos
          </TabsTrigger>
        </TabsList>

        {(["identidad", "seo", "empresa"] as const).map((tab) => {
          const tabFields = MARCA_FIELDS.filter((f) => f.tab === tab);
          const visibleFields = tabFields.filter((f) => !f.customEditor && !f.legacyFallback);
          const legacyFields = tabFields.filter((f) => f.legacyFallback);
          const groups = Array.from(new Set(visibleFields.map((f) => f.group)));
          return (
            <TabsContent key={tab} value={tab} className="mt-6 space-y-6">
              {tab === "seo" && <SeoPreviewCard values={values} />}
              {tab === "empresa" && (
                <>
                  <Card className="border-2 border-primary/20 bg-card mb-4">
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" /> Fuente Única de Verdad — Datos de Contacto
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Los datos configurados aquí se usan globalmente en el sitio (Header, Footer, página de Contacto y JSON-LD). Para editar la narración o reseña "Nosotros", dirígete a{" "}
                        <a href="/panel/contenido" className="font-semibold text-primary underline">
                          /panel/contenido
                        </a>.
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <ContactBlocksOrderEditor
                    rawOrder={values.contact_blocks_order}
                    onChange={(serialized) =>
                      setValues((v) => ({ ...v, contact_blocks_order: serialized }))
                    }
                  />

                  <ContactChannelsEditor
                    values={values}
                    onPatch={(patch) => setValues((v) => ({ ...v, ...patch }))}
                  />

                  <ContactSocialLinksEditor
                    values={values}
                    onPatch={(patch) => setValues((v) => ({ ...v, ...patch }))}
                  />
                </>
              )}

              {groups.map((group) => {
                const groupFields = visibleFields.filter((f) => f.group === group);
                const isPageSeoGroup = group.startsWith("SEO por Página · ");
                if (isPageSeoGroup) {
                  const configuredCount = groupFields.filter((f) => Boolean(values[f.key]?.trim())).length;
                  return (
                    <CollapsibleSeoGroupCard
                      key={group}
                      title={group}
                      configuredCount={configuredCount}
                      totalCount={groupFields.length}
                    >
                      {groupFields.map(renderField)}
                    </CollapsibleSeoGroupCard>
                  );
                }
                return (
                  <Card key={group}>
                    <CardHeader>
                      <CardTitle className="text-base">{group}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {groupFields.map(renderField)}
                    </CardContent>
                  </Card>
                );
              })}

              {tab === "empresa" && legacyFields.length > 0 && (
                <details className="rounded-2xl border border-border bg-card">
                  <summary className="cursor-pointer list-none px-6 py-4 text-sm font-bold text-foreground flex items-center justify-between">
                    <span>Campos legados de respaldo (sincronizados automáticamente)</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </summary>
                  <div className="space-y-6 border-t border-border px-6 py-6">
                    {legacyFields.map(renderField)}
                  </div>
                </details>
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="temas" className="mt-6">
          <ThemeManagerTab values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
