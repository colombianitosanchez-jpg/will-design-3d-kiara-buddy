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
  resolveThemes,
  ensureThemePalette,
  type SiteTheme,
  type ThemeAnimation,
  type ColorToken,
} from "@/lib/theme";
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

  // ----------------------------------------------------------------- Empresa
  { key: "site_area_served", label: "Área o Ciudad de Servicio (JSON-LD)", type: "text", help: "Ej: Bogotá, Colombia", tab: "empresa", group: "Ubicación y Cobertura" },
  { key: "contact_location_text", label: "Ubicación Completa (Texto)", type: "text", help: "Ej: Bogotá, Colombia · atención por cita previa", tab: "empresa", group: "Ubicación y Cobertura" },
  { key: "contact_location_short", label: "Ubicación Corta (Footer)", type: "text", help: "Ej: Bogotá, Colombia", tab: "empresa", group: "Ubicación y Cobertura" },
  { key: "contact_map_embed_url", label: "URL de Google Maps (Iframe embed)", type: "textarea", help: "URL src del iframe de Google Maps.", tab: "empresa", group: "Ubicación y Cobertura" },

  { key: "contact_whatsapp", label: "WhatsApp (solo números)", type: "text", help: "Ej: 573156724474", tab: "empresa", group: "Canales de Contacto" },
  { key: "contact_whatsapp_display", label: "WhatsApp Formateado", type: "text", help: "Ej: +57 315 672 4474", tab: "empresa", group: "Canales de Contacto" },
  { key: "contact_email", label: "Correo Electrónico de Contacto", type: "text", tab: "empresa", group: "Canales de Contacto" },
  { key: "contact_instagram_url", label: "URL Completa de Instagram", type: "text", help: "Ej: https://www.instagram.com/will_design2020/", tab: "empresa", group: "Canales de Contacto" },
  { key: "contact_instagram_handle", label: "Usuario de Instagram Visible", type: "text", help: "Ej: @will_design2020", tab: "empresa", group: "Canales de Contacto" },

  // ------------------------------------------------------------------- Temas
  { key: "custom_themes", label: "Temas Personalizados (JSON)", type: "textarea", tab: "temas", group: "Temas" },
  { key: "active_theme_id", label: "ID Tema Activo", type: "text", tab: "temas", group: "Temas" },
];

function SeoPreviewCard({ values }: { values: Record<string, string> }) {
  const [selectedPage, setSelectedPage] = useState<"home" | "store" | "services" | "gallery" | "about" | "contact">("home");

  const globalTitle = values.site_title || "Will Design 3D";
  const globalDesc = values.site_description || "";
  const globalImg = values.site_meta_thumbnail_url || values.site_logo_url || "";

  const pageMap = {
    home: {
      url: "https://willdesign3d.com/",
      title: values.hero_title || globalTitle,
      desc: values.hero_subtitle || globalDesc,
      img: values.hero_image_url || globalImg,
    },
    store: {
      url: "https://willdesign3d.com/tienda",
      title: `Tienda · ${globalTitle}`,
      desc: globalDesc,
      img: globalImg,
    },
    services: {
      url: "https://willdesign3d.com/servicios",
      title: values.services_section_title ? `${values.services_section_title} · ${globalTitle}` : `Servicios 3D · ${globalTitle}`,
      desc: values.services_section_subtitle || globalDesc,
      img: globalImg,
    },
    gallery: {
      url: "https://willdesign3d.com/galeria",
      title: `Galería de Proyectos · ${globalTitle}`,
      desc: globalDesc,
      img: globalImg,
    },
    about: {
      url: "https://willdesign3d.com/nosotros",
      title: `Nosotros · ${globalTitle}`,
      desc: values.about_short || globalDesc,
      img: globalImg,
    },
    contact: {
      url: "https://willdesign3d.com/contacto",
      title: `Contacto · ${globalTitle}`,
      desc: globalDesc,
      img: globalImg,
    },
  };

  const curr = pageMap[selectedPage];

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
          <Select value={selectedPage} onValueChange={(v: any) => setSelectedPage(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Página de Inicio (/)</SelectItem>
              <SelectItem value="store">Tienda (/tienda)</SelectItem>
              <SelectItem value="services">Servicios (/servicios)</SelectItem>
              <SelectItem value="gallery">Galería (/galeria)</SelectItem>
              <SelectItem value="about">Nosotros (/nosotros)</SelectItem>
              <SelectItem value="contact">Contacto (/contacto)</SelectItem>
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
                  WILLDESIGN3D.COM
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
    const baseColors = baseTheme ? ensureThemePalette(baseTheme.colors) : ensureThemePalette(PRESET_THEMES[0].colors);
    const newTheme: SiteTheme = {
      id: newId,
      name: baseTheme ? `${baseTheme.name} (Copia)` : "Nuevo Tema Custom",
      description: "Tema personalizado editable",
      isPreset: false,
      colors: baseColors,
      buttonStyle: baseTheme ? { ...baseTheme.buttonStyle } : { animation: "none" },
      customCss: baseTheme?.customCss || "",
    };
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

    const normalizedTheme: SiteTheme = {
      ...updated,
      colors: {
        ...updated.colors,
        brandOrange,
        brandTeal,
        brandWine,
        background,
      },
    };

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
            Elige la paleta y estilo de botones aplicados a todo el sitio web.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {themes.map((t) => {
              const isActive = t.id === activeThemeId;
              const palette = ensureThemePalette(t.colors).palette;
              return (
                <div
                  key={t.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                    isActive ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">{t.name}</h3>
                      {t.isPreset && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Prediseñado
                        </span>
                      )}
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
                      Duplicar
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Editando Tema: {editingTheme.name}</CardTitle>
              <CardDescription>
                Personaliza la paleta de colores dinámicos y los efectos visuales de los botones.
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
                Paleta de Colores Dinámica (Drag & Drop para reordenar)
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

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground my-2">
                Efectos de Botones
              </h4>
              <Select
                value={editingTheme.buttonStyle.animation || "none"}
                onValueChange={(val: ThemeAnimation) =>
                  handleSaveEditingTheme({
                    ...editingTheme,
                    buttonStyle: { ...editingTheme.buttonStyle, animation: val },
                  })
                }
              >
                <SelectTrigger className="mt-1 max-w-xs">
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
          const groups = Array.from(new Set(tabFields.map((f) => f.group)));
          return (
            <TabsContent key={tab} value={tab} className="mt-6 space-y-6">
              {tab === "seo" && <SeoPreviewCard values={values} />}
              {tab === "empresa" && (
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
              )}
              {groups.map((group) => (
                <Card key={group}>
                  <CardHeader>
                    <CardTitle className="text-base">{group}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {tabFields.filter((f) => f.group === group).map(renderField)}
                  </CardContent>
                </Card>
              ))}
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
