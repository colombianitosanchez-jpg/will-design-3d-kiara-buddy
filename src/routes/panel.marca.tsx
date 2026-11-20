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
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CompanyDataAccordion } from "@/components/panel/CompanyContactEditors";
import { SeoPreviewCard } from "@/components/panel/SeoPreviewCard";
import { ThemeManagerTab } from "@/components/panel/ThemeManagerTab";

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

  const valuesRef = useRef(values);
  valuesRef.current = values;

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

  async function saveThemeAppearance() {
    const themeFields = MARCA_FIELDS.filter((f) => f.tab === "temas");
    await save(themeFields, valuesRef.current);
    toast.success("Cambios de apariencia guardados");
  }

  async function uploadMediaFile(key: string, file: File): Promise<string | null> {
    setUploadingKey(key);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("El archivo supera 50MB");
      const path = `content/${key}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("site-media").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      toast.success("Archivo multimedia subido");
      return signed.data.signedUrl;
    } catch (e) {
      toast.error("Error al subir", { description: (e as Error).message });
      return null;
    } finally {
      setUploadingKey(null);
    }
  }

  async function uploadImage(key: string, file: File) {
    const signedUrl = await uploadMediaFile(key, file);
    if (signedUrl) {
      setValues((v) => ({ ...v, [key]: signedUrl }));
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

              {tab === "empresa" ? (
                <>
                  <CompanyDataAccordion
                    values={values}
                    onPatch={(patch) => setValues((v) => ({ ...v, ...patch }))}
                    locationFieldsContent={visibleFields.map(renderField)}
                  />

                  {legacyFields.length > 0 && (
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
                </>
              ) : (
                groups.map((group) => {
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
                })
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="temas" className="mt-6">
          <ThemeManagerTab
            values={values}
            onChange={(patch) => {
              setValues((v) => {
                const next = { ...v, ...patch };
                valuesRef.current = next;
                return next;
              });
            }}
            onUploadMedia={uploadMediaFile}
            uploadingKey={uploadingKey}
            onSaveAppearance={saveThemeAppearance}
            saving={saving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
