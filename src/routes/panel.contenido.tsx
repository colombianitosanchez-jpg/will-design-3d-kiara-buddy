import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Check, Eye, EyeOff, Film, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PRESET_THEMES, resolveThemes, type SiteTheme, type ThemeAnimation } from "@/lib/theme";

export const Route = createFileRoute("/panel/contenido")({
  ssr: false,
  component: ContenidoAdmin,
});

type Row = { key: string; value: string };

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "images" | "switch" | "select" | "order";
  help?: string;
  section: string;
  group: string;
  options?: { value: string; label: string }[];
};

const FIELDS: FieldDef[] = [
  // -------------------------------------------------------------- SEO y redes
  { key: "seo_title", label: "Título SEO general", type: "text", help: "Título predeterminado del sitio. Máximo recomendado: 60 caracteres.", section: "Marca y SEO", group: "Metadatos generales" },
  { key: "seo_description", label: "Descripción SEO general", type: "textarea", help: "Descripción predeterminada para buscadores y redes. Máximo recomendado: 160 caracteres.", section: "Marca y SEO", group: "Metadatos generales" },
  { key: "seo_home_title", label: "Título SEO del inicio", type: "text", help: "Si está vacío, se usa el título SEO general.", section: "Marca y SEO", group: "Página de inicio" },
  { key: "seo_home_description", label: "Descripción SEO del inicio", type: "textarea", help: "Si está vacía, se usa la descripción SEO general.", section: "Marca y SEO", group: "Página de inicio" },
  { key: "seo_services_title", label: "Título SEO de servicios", type: "text", help: "Título para /servicios.", section: "Marca y SEO", group: "Página de servicios" },
  { key: "seo_services_description", label: "Descripción SEO de servicios", type: "textarea", help: "Descripción para /servicios.", section: "Marca y SEO", group: "Página de servicios" },
  { key: "seo_store_title", label: "Título SEO de la tienda", type: "text", help: "Título para /tienda.", section: "Marca y SEO", group: "Página de tienda" },
  { key: "seo_store_description", label: "Descripción SEO de la tienda", type: "textarea", help: "Descripción para /tienda.", section: "Marca y SEO", group: "Página de tienda" },
  { key: "seo_quoter_title", label: "Título SEO del cotizador", type: "text", help: "Título para /cotizador.", section: "Marca y SEO", group: "Página del cotizador" },
  { key: "seo_quoter_description", label: "Descripción SEO del cotizador", type: "textarea", help: "Descripción para /cotizador.", section: "Marca y SEO", group: "Página del cotizador" },
  // ---------------------------------------------------------------- Inicio
  { key: "hero_title", label: "Título del hero", type: "textarea", section: "Inicio", group: "Hero" },
  { key: "hero_subtitle", label: "Subtítulo del hero", type: "textarea", section: "Inicio", group: "Hero" },
  {
    key: "hero_image_url",
    label: "Imagen del hero",
    type: "image",
    help: "La multimedia principal se gestiona desde el módulo Carrusel. Esta imagen se usa como respaldo si no hay diapositivas activas.",
    section: "Inicio",
    group: "Hero",
  },
  { key: "hero_badge_title", label: "Etiqueta flotante (pieza destacada)", type: "text", help: "Ej: Escultura 1.8 m — PLA reforzado", section: "Inicio", group: "Hero" },
  { key: "hero_stat_1_k", label: "Estadística 1 · valor", type: "text", help: "Ej: 50×50", section: "Inicio", group: "Estadísticas" },
  { key: "hero_stat_1_v", label: "Estadística 1 · descripción", type: "text", help: "Ej: cm mínimo", section: "Inicio", group: "Estadísticas" },
  { key: "hero_stat_2_k", label: "Estadística 2 · valor", type: "text", section: "Inicio", group: "Estadísticas" },
  { key: "hero_stat_2_v", label: "Estadística 2 · descripción", type: "text", section: "Inicio", group: "Estadísticas" },
  { key: "hero_stat_3_k", label: "Estadística 3 · valor", type: "text", section: "Inicio", group: "Estadísticas" },
  { key: "hero_stat_3_v", label: "Estadística 3 · descripción", type: "text", section: "Inicio", group: "Estadísticas" },
  { key: "home_sections_order", label: "Orden de las secciones del inicio", type: "order", help: "Arrastra para decidir qué aparece primero al entrar a la página.", section: "Inicio", group: "Orden de la página" },
  { key: "show_manual_gallery", label: "Mostrar sección de Portafolio Manual (Piezas que hemos impreso)", type: "switch", help: "Se muestra si está activo y hay al menos una foto subida.", section: "Inicio", group: "Portafolio (Instagram)" },
  { key: "show_instagram_widget", label: "Mostrar sección de Instagram en vivo", type: "switch", help: "Se muestra si está activo y el ID del widget es válido.", section: "Inicio", group: "Portafolio (Instagram)" },
  { key: "portfolio_display_order", label: "Orden de visualización", type: "select", help: "Decide qué sección del portafolio aparece primero en la página.", section: "Inicio", group: "Portafolio (Instagram)", options: [
    { value: "manual_first", label: "Fotos manuales primero, luego Instagram" },
    { value: "instagram_first", label: "Instagram primero, luego fotos manuales" },
  ] },
  { key: "portfolio_images", label: "Fotos y videos de portafolio", type: "images", help: "Se muestran en la sección de portafolio del inicio y en /galeria. Puedes subir fotos y videos cortos (hasta 50MB), reordenar, cambiar visibilidad y definir enlaces de acción.", section: "Inicio", group: "Portafolio (Instagram)" },
  { key: "elfsight_instagram_id", label: "ID del widget de Instagram (Elfsight)", type: "text", help: "Puedes pegar el ID completo ('elfsight-app-abc123'); quitamos el prefijo automáticamente.", section: "Inicio", group: "Portafolio (Instagram)" },
  { key: "about_short", label: "Descripción corta 'Nosotros'", type: "textarea", section: "Inicio", group: "Página Nosotros" },

  // ------------------------------------------------------------ Cotizadores
  { key: "quoter_badge", label: "Etiqueta superior", type: "text", help: "Ej: Cotizador", section: "Cotizadores", group: "Encabezado del cotizador" },
  { key: "quoter_title", label: "Título del cotizador", type: "textarea", help: "Se muestra arriba del selector de servicio.", section: "Cotizadores", group: "Encabezado del cotizador" },
  { key: "quoter_subtitle", label: "Instrucciones para el cliente", type: "textarea", help: "Ej: Elige qué necesitas, mueve los deslizadores y verás el precio estimado al instante.", section: "Cotizadores", group: "Encabezado del cotizador" },
  { key: "quoter_service_label", label: "Texto del paso 'elegir servicio'", type: "text", help: "Ej: Selecciona el servicio", section: "Cotizadores", group: "Encabezado del cotizador" },
  { key: "quoter_disclaimer", label: "Aviso legal del precio estimado", type: "textarea", help: "Ej: El valor final se confirma tras revisar tu archivo.", section: "Cotizadores", group: "Encabezado del cotizador" },

  // --------------------------------------------------------------- Contacto
  { key: "contact_whatsapp", label: "WhatsApp (solo dígitos, con país)", type: "text", help: "Ej: 573156724474 — se usa en todos los enlaces wa.me.", section: "Contacto", group: "Canales" },
  { key: "contact_whatsapp_display", label: "WhatsApp (formato visible)", type: "text", help: "Ej: +57 315 672 4474", section: "Contacto", group: "Canales" },
  { key: "contact_email", label: "Correo de contacto", type: "text", section: "Contacto", group: "Canales" },
  { key: "contact_instagram_url", label: "URL de Instagram", type: "text", section: "Contacto", group: "Canales" },
  { key: "contact_instagram_handle", label: "Usuario de Instagram (visible)", type: "text", help: "Ej: @will_design2020", section: "Contacto", group: "Canales" },
  { key: "contact_location_text", label: "Ubicación (texto)", type: "text", help: "Ej: Bogotá, Colombia · atención por cita previa", section: "Contacto", group: "Ubicación" },
  { key: "contact_location_short", label: "Ubicación corta (footer)", type: "text", help: "Ej: Bogotá, Colombia", section: "Contacto", group: "Ubicación" },
  { key: "contact_map_embed_url", label: "URL del mapa (Google Maps embed)", type: "textarea", help: "Pega la URL del src del iframe de Google Maps.", section: "Contacto", group: "Ubicación" },
  { key: "whatsapp_quote_template", label: "Plantilla del mensaje de WhatsApp para Cotizaciones", type: "textarea", help: "Admite variables: {{servicio}}, {{cliente}}, {{email}}, {{telefono}}, {{resumen}}, {{total}}, {{notas}}, {{media_link}}", section: "Contacto", group: "Canales" },

  // ----------------------------------------------------------------- Kiara
  { key: "kiara_message", label: "Mensaje de Kiara (widget)", type: "textarea", section: "Kiara", group: "Asistente" },
  { key: "kiara_image_url", label: "Foto de Kiara", type: "image", help: "Se usa en widget y página Nosotros.", section: "Kiara", group: "Asistente" },

  // ------------------------------------------------------------ Favicon y Meta
  { key: "site_favicon_url", label: "Favicon de la pestaña (.ico, .png, .gif, .svg)", type: "image", help: "Ícono visible en la pestaña del navegador. Soporta GIFs e imágenes.", section: "Marca y SEO", group: "Favicon e Íconos de Buscadores" },
  { key: "site_meta_thumbnail_url", label: "Miniatura para Google y Redes Sociales", type: "image", help: "Imagen mostrada en resultados de Google y al compartir el enlace en WhatsApp/redes sociales.", section: "Marca y SEO", group: "Favicon e Íconos de Buscadores" },
];

function ThemeManagerTab({
  values,
  onChange,
}: {
  values: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
}) {
  const activeThemeId = values.active_theme_id || "default";
  const themes = resolveThemes(values.custom_themes);
  const activeTheme = themes.find((t) => t.id === activeThemeId) || PRESET_THEMES[0];
  const [editingTheme, setEditingTheme] = useState<SiteTheme | null>(null);

  const targetEdit = editingTheme || activeTheme;

  function selectTheme(id: string) {
    onChange({ active_theme_id: id });
    toast.success("Tema activado globalmente");
  }

  function handleCreateTheme(baseTheme?: SiteTheme) {
    const newId = `custom_${Date.now()}`;
    const newTheme: SiteTheme = {
      id: newId,
      name: baseTheme ? `${baseTheme.name} (Copia)` : "Nuevo Tema Custom",
      description: "Tema personalizado editable",
      isPreset: false,
      colors: baseTheme ? { ...baseTheme.colors } : { ...PRESET_THEMES[0].colors },
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
    const customList = themes.filter((t) => !t.isPreset);
    const nextCustom = customList.map((t) => (t.id === updated.id ? updated : t));
    if (!customList.some((t) => t.id === updated.id)) {
      nextCustom.push(updated);
    }
    onChange({ custom_themes: JSON.stringify(nextCustom) });
    setEditingTheme(updated);
    toast.success("Guardado en configuración de temas");
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
          <CardTitle>Selector de Tema Activo</CardTitle>
          <CardDescription>
            Elige qué tema y estilo visual se aplica a toda la tienda y página principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {themes.map((t) => {
              const isActive = t.id === activeThemeId;
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
                    {/* Previsualizador de Muestra de Colores */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: t.colors.brandOrange }} title="Naranja / Primario" />
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: t.colors.brandTeal }} title="Teal / Secundario" />
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: t.colors.brandWine }} title="Burgundy / Acento" />
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: t.colors.background }} title="Fondo" />
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
                      title="Duplicar como plantilla editable"
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

      {/* Editor de Tema (si se seleccionó editar o crear) */}
      {editingTheme && !editingTheme.isPreset && (
        <Card className="border-2 border-primary/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Editando Tema: {editingTheme.name}</CardTitle>
              <CardDescription>
                Personaliza los colores exactos y los efectos visuales de los botones.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditingTheme(null)}>
              Cerrar editor
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground my-2">
                Paleta de Colores
              </h4>
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="text-xs font-semibold space-y-1 block">
                  Color Naranja / Principal
                  <Input
                    type="text"
                    value={editingTheme.colors.brandOrange}
                    onChange={(e) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, brandOrange: e.target.value, primary: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="text-xs font-semibold space-y-1 block">
                  Color Teal / Secundario
                  <Input
                    type="text"
                    value={editingTheme.colors.brandTeal}
                    onChange={(e) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, brandTeal: e.target.value, secondary: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="text-xs font-semibold space-y-1 block">
                  Color Burgundy / Acento
                  <Input
                    type="text"
                    value={editingTheme.colors.brandWine}
                    onChange={(e) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, brandWine: e.target.value, accent: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="text-xs font-semibold space-y-1 block">
                  Fondo de Página
                  <Input
                    type="text"
                    value={editingTheme.colors.background}
                    onChange={(e) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        colors: { ...editingTheme.colors, background: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground my-2">
                Efectos y Estilo de Botones
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">Animación por Defecto de Botones</Label>
                  <Select
                    value={editingTheme.buttonStyle.animation || "none"}
                    onValueChange={(val: ThemeAnimation) =>
                      handleSaveEditingTheme({
                        ...editingTheme,
                        buttonStyle: { ...editingTheme.buttonStyle, animation: val },
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
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
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">CSS Personalizado Adicional</Label>
              <Textarea
                rows={3}
                value={editingTheme.customCss || ""}
                onChange={(e) =>
                  handleSaveEditingTheme({ ...editingTheme, customCss: e.target.value })
                }
                placeholder=".btn-primary { border-radius: 4px; }"
                className="font-mono text-xs mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const SECTIONS = [...Array.from(new Set(FIELDS.map((f) => f.section))), "Temas y Estilos"];

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
    setValues(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Guardado automático: espera a que el usuario deje de escribir y guarda solo lo cambiado.
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
        )}

        {f.type === "select" && f.options && (
          <Select
            value={(values[f.key] ?? "") || f.options[0].value}
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-16 z-20 -mx-1 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-2xl font-black">Contenido del sitio</h1>
          <p className="text-sm text-muted-foreground">
            Cada cambio se guarda solo, sin tocar código.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Guardando…" : "Guardado automático"}
        </span>
      </div>

      <Tabs defaultValue={SECTIONS[0]}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s}
            </TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map((section) => {
          if (section === "Temas y Estilos") {
            return (
              <TabsContent key={section} value={section} className="mt-6 space-y-5">
                <ThemeManagerTab
                  values={values}
                  onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
                />
              </TabsContent>
            );
          }
          const groups = Array.from(
            new Set(FIELDS.filter((f) => f.section === section).map((f) => f.group)),
          );
          return (
            <TabsContent key={section} value={section} className="mt-6 space-y-5">
              {groups.map((group) => (
                <Card key={group}>
                  <CardHeader>
                    <CardTitle className="text-base">{group}</CardTitle>
                    <CardDescription>
                      {FIELDS.filter((f) => f.section === section && f.group === group).length} campos
                      editables
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {FIELDS.filter((f) => f.section === section && f.group === group).map(renderField)}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
