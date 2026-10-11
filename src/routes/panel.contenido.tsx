import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Save, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sanitizeWidgetId, parsePhotos, type PortfolioPhoto } from "@/components/InstagramFeed";

export const Route = createFileRoute("/panel/contenido")({
  ssr: false,
  component: ContenidoAdmin,
});

type Row = { key: string; value: string };

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "images" | "switch" | "select";
  help?: string;
  section: string;
  group: string;
  options?: { value: string; label: string }[];
};

const FIELDS: FieldDef[] = [
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
  { key: "show_manual_gallery", label: "Mostrar sección de Portafolio Manual (Piezas que hemos impreso)", type: "switch", help: "Se muestra si está activo y hay al menos una foto subida.", section: "Inicio", group: "Portafolio (Instagram)" },
  { key: "show_instagram_widget", label: "Mostrar sección de Instagram en vivo", type: "switch", help: "Se muestra si está activo y el ID del widget es válido.", section: "Inicio", group: "Portafolio (Instagram)" },
  { key: "portfolio_display_order", label: "Orden de visualización", type: "select", help: "Decide qué sección del portafolio aparece primero en la página.", section: "Inicio", group: "Portafolio (Instagram)", options: [
    { value: "manual_first", label: "Fotos manuales primero, luego Instagram" },
    { value: "instagram_first", label: "Instagram primero, luego fotos manuales" },
  ] },
  { key: "portfolio_images", label: "Fotos de portafolio", type: "images", help: "Se muestran en la sección de portafolio del inicio y en /galeria. Ya no se ocultan al usar el widget de Instagram.", section: "Inicio", group: "Portafolio (Instagram)" },
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

  // ----------------------------------------------------------------- Kiara
  { key: "kiara_message", label: "Mensaje de Kiara (widget)", type: "textarea", section: "Kiara", group: "Asistente" },
  { key: "kiara_image_url", label: "Foto de Kiara", type: "image", help: "Se usa en widget y página Nosotros.", section: "Kiara", group: "Asistente" },
];

const SECTIONS = Array.from(new Set(FIELDS.map((f) => f.section)));

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

  async function save() {
    setSaving(true);
    try {
      const rows = FIELDS.map((f) => ({
        key: f.key,
        value: values[f.key] ?? "",
        section: f.section,
      }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
      toast.success("Cambios guardados", {
        description: "La web pública se actualiza en unos segundos.",
      });
    } catch (e) {
      toast.error("No pudimos guardar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function uploadToStorage(key: string, file: File) {
    const path = `content/${key}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
    if (up.error) throw up.error;
    const signed = await supabase.storage
      .from("product-images")
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
        const url = await uploadToStorage(key, f);
        added.push({ id: crypto.randomUUID(), url, is_visible: true });
      }
      setValues((v) => ({
        ...v,
        [key]: JSON.stringify([...parseList(v[key]), ...added]),
      }));
      toast.success(`${added.length} foto(s) subidas`);
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
            <div className="flex flex-wrap gap-3">
              {parseList(values[f.key]).map((photo, idx) => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.url}
                    alt=""
                    className={`h-20 w-20 rounded-xl object-cover ${photo.is_visible ? "" : "opacity-50"}`}
                  />
                  {!photo.is_visible && (
                    <span className="absolute bottom-1 left-1 rounded-md bg-foreground/80 px-1.5 py-0.5 text-[10px] font-bold text-background">
                      Oculto
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => togglePhotoAt(f.key, idx)}
                    aria-label={photo.is_visible ? "Ocultar foto" : "Mostrar foto"}
                    title={photo.is_visible ? "Ocultar foto" : "Mostrar foto"}
                    className="absolute -left-2 -top-2 rounded-full border border-border bg-card p-1 shadow"
                  >
                    {photo.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImageAt(f.key, idx)}
                    aria-label="Quitar foto"
                    className="absolute -right-2 -top-2 rounded-full border border-border bg-card px-2 text-xs font-bold shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
              {parseList(values[f.key]).length === 0 && (
                <div className="grid h-20 w-20 place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
                  Vacío
                </div>
              )}
            </div>
            <Button asChild variant="outline" size="sm" type="button" className="mt-3">
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploadingKey === f.key ? "Subiendo…" : "Subir fotos"}
                <input
                  type="file"
                  accept="image/*"
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
            Edita todos los textos e imágenes públicos sin tocar código.
          </p>
        </div>
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
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
