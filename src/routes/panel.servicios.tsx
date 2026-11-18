import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wrench,
  Printer,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Film,
  Image as ImageIcon,
  Calculator,
  Save,
  X,
  GripVertical,
  Eye,
  EyeOff,
  FileUp,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { findLinkedQuoterService } from "@/lib/quoter-ui";
import { quoterServicesQuery } from "@/lib/quoter";
import { ProductButtonsEditor } from "@/components/ProductButtonsEditor";
import { MediaDropZone } from "@/components/MediaDropZone";
import { parseProductButtons, type ProductButton } from "@/lib/product-buttons";
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

export const Route = createFileRoute("/panel/servicios")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Servicios web · Panel Will Design 3D" },
    { name: "description", content: "Administración de servicios y sus cotizadores en Will Design 3D." },
    { property: "og:title", content: "Servicios web · Panel Will Design 3D" },
    { property: "og:description", content: "Presentación y contacto de los servicios del taller." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ServiciosPanel,
});

export type SiteServiceItem = {
  id: string;
  slug: string;
  title: string;
  lead: string;
  icon: string;
  color: string;
  image_url: string | null;
  media_type: "image" | "gif" | "video";
  contact_mode?: string;
  quoter_service_id: string | null;
  whatsapp_template: string | null;
  requires_file: boolean;
  bullets: string[];
  kiara_tip: string;
  custom_buttons: ProductButton[];
  is_active: boolean;
  sort_order: number;
};

const DEFAULT_SITE_SERVICES: Omit<SiteServiceItem, "id">[] = [
  {
    slug: "impresion-3d",
    title: "Impresión 3D a Pedido",
    lead: "Producimos tus piezas en FDM y resina, con especialidad en gran formato (50×50 cm o más).",
    icon: "printer",
    color: "orange",
    image_url: null,
    media_type: "image",
    quoter_service_id: null,
    whatsapp_template: "Hola Will Design 3D! Me interesa solicitar información y cotización sobre el servicio: *Impresión 3D a Pedido*",
    requires_file: true,
    bullets: ["FDM: PLA, PETG, ABS, TPU", "Resina MSLA hasta 12K", "Gran formato 50x50 cm"],
    kiara_tip: "Si tu archivo aún no está optimizado, avísanos: revisamos huecos y grosores gratis.",
    custom_buttons: [],
    is_active: true,
    sort_order: 10,
  },
  {
    slug: "modelado-3d",
    title: "Diseño 3D Personalizado",
    lead: "Modelamos desde cero usando tus referencias, planos o fotografías. Ideal si no tienes archivo.",
    icon: "pencil-ruler",
    color: "teal",
    image_url: null,
    media_type: "image",
    quoter_service_id: null,
    whatsapp_template: "Hola Will Design 3D! Me interesa solicitar un diseño 3D personalizado desde cero.",
    requires_file: true,
    bullets: ["Ingeniería inversa", "Escultura orgánica", "Modelado CAD paramétrico"],
    kiara_tip: "Cuéntanos función y tamaño primero — un buen diseño ahorra horas de impresión.",
    custom_buttons: [],
    is_active: true,
    sort_order: 20,
  },
  {
    slug: "servicio-tecnico",
    title: "Mantenimiento y Reparación",
    lead: "Servicio técnico especializado para impresoras FDM y de resina de cualquier marca.",
    icon: "wrench",
    color: "wine",
    image_url: null,
    media_type: "image",
    quoter_service_id: null,
    whatsapp_template: "Hola Will Design 3D! Necesito servicio técnico o mantenimiento para mi impresora 3D.",
    requires_file: false,
    bullets: ["Diagnóstico y calibración", "Cambio de hotend y boquillas", "Soporte presencial en Bogotá"],
    kiara_tip: "Un mantenimiento cada 500 h de impresión evita el 80 % de las fallas comunes.",
    custom_buttons: [],
    is_active: true,
    sort_order: 30,
  },
  {
    slug: "escaneo-3d",
    title: "Escaneo 3D",
    lead: "Digitalizamos objetos, espacios y piezas reales para obtener modelos 3D listos para editar o imprimir.",
    icon: "scan-line",
    color: "teal",
    image_url: null,
    media_type: "image",
    quoter_service_id: null,
    whatsapp_template: "Hola Will Design 3D! Deseo cotizar el escaneo 3D de una pieza u objeto real.",
    requires_file: false,
    bullets: ["Escaneo de objetos pequeños con alta precisión", "Digitalización y limpieza de malla", "Entrega en STL/OBJ"],
    kiara_tip: "Si la pieza es brillante u oscura, la tratamos con spray mate para que el escáner la lea mejor.",
    custom_buttons: [],
    is_active: true,
    sort_order: 40,
  },
  {
    slug: "postprocesado",
    title: "Post-procesado y Acabados",
    lead: "Convertimos una pieza recién impresa en un producto terminado profesional.",
    icon: "sparkles",
    color: "orange",
    image_url: null,
    media_type: "image",
    quoter_service_id: null,
    whatsapp_template: "Hola Will Design 3D! Quisiera saber más sobre los acabados y post-procesado de piezas 3D.",
    requires_file: false,
    bullets: ["Lijado y masillado", "Pintura y primer", "Acabados metalizados y mate"],
    kiara_tip: "El acabado Premium multiplica el impacto visual — pídelo si vas a exhibir la pieza.",
    custom_buttons: [],
    is_active: true,
    sort_order: 50,
  },
  {
    slug: "cursos-3d-modelado",
    title: "Curso de Modelado 3D",
    lead: "Aprende a modelar tus propias piezas desde cero: de la idea al archivo listo para imprimir.",
    icon: "graduation-cap",
    color: "orange",
    image_url: null,
    media_type: "image",
    quoter_service_id: null,
    whatsapp_template: "Hola Will Design 3D! Me gustaría inscribirme o solicitar información sobre el Curso de Modelado 3D.",
    requires_file: false,
    bullets: ["Modelado CAD paramétrico", "Preparación de STL/OBJ", "Clases personalizadas presenciales o virtuales"],
    kiara_tip: "Aprender a modelar te da autonomía total sobre tus proyectos de impresión.",
    custom_buttons: [],
    is_active: true,
    sort_order: 60,
  },
  {
    slug: "cursos-3d-impresion",
    title: "Curso de Impresión 3D",
    lead: "Domina el laminado, materiales y parámetros para lograr impresiones limpias y consistentes.",
    icon: "graduation-cap",
    color: "teal",
    image_url: null,
    media_type: "image",
    quoter_service_id: null,
    whatsapp_template: "Hola Will Design 3D! Quisiera más detalles para realizar el Curso de Impresión 3D.",
    requires_file: false,
    bullets: ["Configuración en OrcaSlicer / Cura", "Manejo de FDM y Resina MSLA", "Solución de problemas comunes"],
    kiara_tip: "Entender la adherencia y la temperatura evita el 90 % de impresiones fallidas.",
    custom_buttons: [],
    is_active: true,
    sort_order: 70,
  },
  {
    slug: "cursos-3d-mantenimiento",
    title: "Curso de Mantenimiento de Impresoras",
    lead: "Calibración, limpieza y reparación: mantén tu impresora funcionando como el primer día.",
    icon: "graduation-cap",
    color: "wine",
    image_url: null,
    media_type: "image",
    quoter_service_id: null,
    whatsapp_template: "Hola Will Design 3D! Me interesa el Curso de Mantenimiento y Calibración de Impresoras 3D.",
    requires_file: false,
    bullets: ["Calibración de cama y PID", "Mantenimiento preventivo", "Cambio de componentes clave"],
    kiara_tip: "Aprender a ajustar tu propia máquina te ahorra costos de taller en el futuro.",
    custom_buttons: [],
    is_active: true,
    sort_order: 80,
  },
];

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function mapRowToSiteService(item: any): SiteServiceItem {
  return {
    id: item.id,
    slug: item.slug || `svc-${item.id}`,
    title: item.title || "Servicio sin título",
    lead: item.lead || "",
    icon: item.icon || "printer",
    color: item.color || "orange",
    image_url: item.image_url || null,
    media_type: (item.media_type as any) || "image",
    contact_mode: item.contact_mode || "auto",
    quoter_service_id: item.quoter_service_id || null,
    whatsapp_template: item.whatsapp_template || null,
    requires_file: Boolean(item.requires_file),
    bullets: Array.isArray(item.bullets) ? item.bullets : [],
    kiara_tip: item.kiara_tip || "",
    custom_buttons: parseProductButtons(item.custom_buttons),
    is_active: item.is_active ?? true,
    sort_order: item.sort_order ?? 0,
  };
}

function ServiciosPanel() {
  const qc = useQueryClient();
  const { data: quoterSvcs } = useQuery(quoterServicesQuery(true));

  const [services, setServices] = useState<SiteServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SiteServiceItem | null>(null);

  const [sectionTitle, setSectionTitle] = useState("Nuestros servicios");
  const [sectionSubtitle, setSectionSubtitle] = useState("");
  const [savingHeader, setSavingHeader] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function loadHeaderSettings() {
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value")
      .in("key", ["services_section_title", "services_section_subtitle"]);

    if (error) {
      toast.error(`Error al cargar encabezado: ${error.message}`);
      return;
    }

    if (data) {
      const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
      if (map.services_section_title !== undefined) setSectionTitle(map.services_section_title);
      if (map.services_section_subtitle !== undefined) setSectionSubtitle(map.services_section_subtitle);
    }
  }

  async function handleSaveHeader() {
    setSavingHeader(true);
    try {
      const rows = [
        { key: "services_section_title", value: sectionTitle, section: "Servicios" },
        { key: "services_section_subtitle", value: sectionSubtitle, section: "Servicios" },
      ];
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Título y subtítulo de la sección servicios guardados");
      qc.invalidateQueries({ queryKey: ["site_content"] });
    } catch (e: any) {
      toast.error("Error al guardar encabezado: " + (e?.message || "desconocido"));
    } finally {
      setSavingHeader(false);
    }
  }

  async function loadServices() {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("site_services")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        setLoadError(error.message);
        toast.error(`Error al consultar servicios: ${error.message}`);
        setServices([]);
        return;
      }

      setServices((data ?? []).map(mapRowToSiteService));
    } catch (e: any) {
      const msg = e?.message || "Error inesperado al cargar servicios";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedDefaults() {
    if (services.length || seeding) return;
    setSeeding(true);
    try {
      const listToInsert = DEFAULT_SITE_SERVICES.map((s, idx) => ({
        ...s,
        bullets: s.bullets as any,
        custom_buttons: s.custom_buttons as any,
        sort_order: (idx + 1) * 10,
      }));

      const { data, error } = await supabase.from("site_services").insert(listToInsert).select();
      if (error) throw error;
      const inserted = (data ?? []).map(mapRowToSiteService);
      setServices(inserted);
      toast.success(`Se sembraron ${inserted.length} servicios iniciales en la base de datos`);
      qc.invalidateQueries({ queryKey: ["site-services-public"] });
    } catch (e: any) {
      toast.error(`No se pudieron sembrar los servicios: ${e?.message || "Error de permisos o conexión"}`);
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    loadServices();
    loadHeaderSettings();
  }, []);

  async function handleToggleActive(svc: SiteServiceItem) {
    const nextActive = !svc.is_active;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, is_active: nextActive } : s)));
    const { error } = await supabase.from("site_services").update({ is_active: nextActive }).eq("id", svc.id);
    if (error) {
      toast.error(`Error al actualizar visibilidad: ${error.message}`);
      loadServices();
    } else {
      toast.success(nextActive ? "Servicio visible" : "Servicio oculto");
      qc.invalidateQueries({ queryKey: ["site-services-public"] });
    }
  }

  async function handleSaveService(updated: SiteServiceItem) {
    setSaving(true);
    try {
      const payload = {
        title: updated.title,
        slug: updated.slug || updated.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        lead: updated.lead,
        icon: updated.icon,
        color: updated.color,
        image_url: updated.image_url || null,
        media_type: updated.media_type,
        contact_mode: updated.contact_mode || "auto",
        quoter_service_id: updated.quoter_service_id || null,
        whatsapp_template: updated.whatsapp_template || null,
        requires_file: updated.requires_file,
        bullets: updated.bullets as any,
        kiara_tip: updated.kiara_tip,
        custom_buttons: updated.custom_buttons as any,
        is_active: updated.is_active,
        sort_order: updated.sort_order,
      };

      if (updated.id) {
        const { error } = await supabase.from("site_services").update(payload).eq("id", updated.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_services").insert([{ ...payload }]);
        if (error) throw error;
      }

      toast.success("Servicio guardado correctamente");
      setEditing(null);
      await loadServices();
      await qc.invalidateQueries({ queryKey: ["site-services-public"] });
    } catch (e: any) {
      toast.error("Error al guardar servicio: " + (e?.message || "desconocido"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("site_services").delete().eq("id", id);
      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Servicio eliminado");
      await qc.invalidateQueries({ queryKey: ["site-services-public"] });
    } catch (e: any) {
      toast.error(`Error al eliminar servicio: ${e?.message || "desconocido"}`);
    }
  }

  function handleCreateNew() {
    const newService: SiteServiceItem = {
      id: "",
      slug: `servicio-${Date.now()}`,
      title: "Nuevo Servicio",
      lead: "Descripción breve del nuevo servicio...",
      icon: "printer",
      color: "orange",
      image_url: null,
      media_type: "image",
      quoter_service_id: null,
      whatsapp_template: "Hola Will Design 3D! Quisiera cotizar el servicio: ",
      requires_file: false,
      bullets: ["Característica 1", "Característica 2"],
      kiara_tip: "Tip práctico para tus clientes sobre este servicio.",
      custom_buttons: [],
      is_active: true,
      sort_order: (services.length + 1) * 10,
    };
    setEditing(newService);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = services.findIndex((s) => s.id === active.id);
    const newIndex = services.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = services;
    const reordered = arrayMove(services, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sort_order: (index + 1) * 10,
    }));

    setServices(reordered);

    try {
      const results = await Promise.all(
        reordered.map((s) =>
          supabase.from("site_services").update({ sort_order: s.sort_order }).eq("id", s.id)
        )
      );
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
      toast.success("Orden de servicios actualizado");
      qc.invalidateQueries({ queryKey: ["site-services-public"] });
    } catch (e: any) {
      setServices(previous);
      toast.error(`Error al guardar el nuevo orden: ${e?.message || "desconocido"}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando servicios…
      </div>
    );
  }

  return (
    <div className="quoter-workspace p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Gestión de Servicios 3D</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea, edita, oculta u ordena servicios. Vincula cada servicio a su cotizador o configura mensajes de WhatsApp, archivos requeridos y botones personalizados.
          </p>
        </div>
        <Button variant="ghost"
          type="button"
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 shadow whitespace-nowrap"
        >
          <Plus className="h-4 w-4" /> Crear nuevo servicio
        </Button>
      </div>

      {/* Encabezado Principal de la Sección Servicios */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" /> Encabezado de la Sección Servicios
            </h2>
            <p className="text-xs text-muted-foreground">
              Define el título y subtítulo que se muestran en la sección de servicios del inicio y en /servicios.
            </p>
          </div>
          <Button variant="ghost"
            type="button"
            onClick={handleSaveHeader}
            disabled={savingHeader}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-xs whitespace-nowrap"
          >
            {savingHeader ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar Encabezado
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold block text-muted-foreground">
              Título Sección Servicios
            </label>
            <input
              type="text"
              aria-label="Título de la sección servicios"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="Ej: Nuestros servicios"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block text-muted-foreground">
              Subtítulo Sección Servicios
            </label>
            <input
              type="text"
              aria-label="Subtítulo de la sección servicios"
              value={sectionSubtitle}
              onChange={(e) => setSectionSubtitle(e.target.value)}
              placeholder="Ej: Soluciones de impresión 3D, diseño y mantenimiento..."
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No se pudieron cargar los servicios de la base de datos</p>
              <p className="text-xs text-red-700 mt-0.5 font-mono">{loadError}</p>
            </div>
          </div>
          <Button variant="ghost"
            type="button"
            onClick={loadServices}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-800 hover:bg-red-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {!loadError && services.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center space-y-4">
          <Printer className="mx-auto h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold">La tabla de servicios está vacía</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Puedes sembrar los 8 servicios predeterminados de Will Design 3D en tu base de datos o crear uno desde cero.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="ghost"
              type="button"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Sembrar servicios iniciales ({DEFAULT_SITE_SERVICES.length})
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Crear servicio vacío
            </Button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={services.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {services.map((s) => (
                <SortableServiceCard
                  key={s.id}
                  service={s}
                  quoterServices={quoterSvcs ?? []}
                  onEdit={() => setEditing(s)}
                  onToggleActive={() => handleToggleActive(s)}
                  onDelete={() => handleDelete(s.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editing && (
        <ServiceModal
          service={editing}
          quoterServices={quoterSvcs ?? []}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={handleSaveService}
        />
      )}
    </div>
  );
}

function SortableServiceCard({
  service: s,
  quoterServices,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  service: SiteServiceItem;
  quoterServices: any[];
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: s.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignedQuoter = s.contact_mode === "whatsapp" ? null : findLinkedQuoterService(s.slug, s.quoter_service_id, quoterServices);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border ${
        s.is_active ? "border-border bg-card" : "border-dashed border-muted bg-muted/30 opacity-75"
      } p-4 shadow-xs`}
    >
      <div className="flex items-start gap-3 w-full sm:w-auto">
        <Button variant="ghost"
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
          title="Arrastrar para reordenar"
          aria-label={`Reordenar ${s.title}`}
        >
          <GripVertical className="h-5 w-5" />
        </Button>

        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{s.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold border border-border bg-muted tabular-nums">
              Pos: {s.sort_order}
            </span>
            {assignedQuoter ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md border border-teal-200">
                <Calculator className="h-3 w-3" /> Cotizador: {assignedQuoter.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                <MessageSquare className="h-3 w-3" /> WhatsApp Directo
              </span>
            )}
            {s.requires_file && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200">
                <FileUp className="h-3 w-3" /> Requiere archivo
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">{s.lead}</p>

          {s.image_url && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {s.media_type === "video" ? (
                <Film className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="truncate max-w-xs">{s.image_url}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <Button variant="ghost"
          type="button"
          onClick={onToggleActive}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            s.is_active
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-muted text-muted-foreground"
          }`}
          title={s.is_active ? "Servicio Activo" : "Servicio Oculto"}
        >
          {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {s.is_active ? "Visible" : "Oculto"}
        </Button>

        <Button variant="ghost"
          type="button"
          onClick={onEdit}
          className="rounded-lg bg-muted p-2 text-xs font-semibold hover:bg-muted/80"
          title="Editar servicio"
          aria-label={`Editar ${s.title}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost"
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
              className="rounded-lg bg-destructive px-2.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-destructive/90"
            >
              Confirmar
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="ghost"
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-destructive hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400"
            title="Eliminar servicio"
            aria-label={`Eliminar ${s.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function BulletsListEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = Number(active.id.toString().replace("bullet-", ""));
    const newIndex = Number(over.id.toString().replace("bullet-", ""));
    if (isNaN(oldIndex) || isNaN(newIndex)) return;

    onChange(arrayMove(bullets, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={bullets.map((_, i) => `bullet-${i}`)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {bullets.map((b, i) => (
            <SortableBulletRow
              key={`bullet-${i}`}
              id={`bullet-${i}`}
              text={b}
              onChange={(val) => {
                const next = [...bullets];
                next[i] = val;
                onChange(next);
              }}
              onRemove={() => onChange(bullets.filter((_, idx) => idx !== i))}
            />
          ))}
          {bullets.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Sin puntos destacados.</p>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableBulletRow({
  id,
  text,
  onChange,
  onRemove,
}: {
  id: string;
  text: string;
  onChange: (val: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <Button variant="ghost"
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1 shrink-0"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </Button>

      <input
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe la viñeta o característica..."
        className={inputCls}
      />

      <Button variant="ghost"
        type="button"
        onClick={onRemove}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive shrink-0"
        title="Eliminar viñeta"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ServiceModal({
  service,
  quoterServices,
  saving,
  onClose,
  onSave,
}: {
  service: SiteServiceItem;
  quoterServices: any[];
  saving: boolean;
  onClose: () => void;
  onSave: (updated: SiteServiceItem) => void;
}) {
  const [form, setForm] = useState<SiteServiceItem>({ ...service, quoter_service_id: service.quoter_service_id || findLinkedQuoterService(service.slug, service.quoter_service_id, quoterServices)?.id || null });
  const [wantsQuoter, setWantsQuoter] = useState<boolean>(service.contact_mode !== "whatsapp" && Boolean(findLinkedQuoterService(service.slug, service.quoter_service_id, quoterServices)));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wantsQuoter && !form.quoter_service_id) { toast.error("Selecciona un cotizador para vincular el servicio"); return; }
    onSave({
      ...form,
      contact_mode: wantsQuoter ? "quoter" : "whatsapp",
      quoter_service_id: wantsQuoter ? form.quoter_service_id : null,
    });
  }

  const defaultWaMsg = `Hola Will Design 3D! Me interesa solicitar información y cotización sobre el servicio: *${form.title}*`;
  const effectiveWaPreview = (form.whatsapp_template || "").trim() || defaultWaMsg;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent aria-describedby={undefined} className="quoter-workspace max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="w-full min-w-0 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <DialogTitle className="pr-8 text-xl font-black">
            {service.id ? "Editar Servicio 3D" : "Crear Nuevo Servicio 3D"}
          </DialogTitle>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar modal" className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold block">
            Título del Servicio
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
            />
          </label>

          <label className="text-xs font-semibold block">
            Identificador (Slug)
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className={`font-mono text-xs ${inputCls}`}
            />
          </label>
        </div>

        <label className="text-xs font-semibold block">
          Descripción Principal (Lead)
          <textarea
            rows={2}
            value={form.lead}
            onChange={(e) => setForm({ ...form, lead: e.target.value })}
            className={inputCls}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold block">
            ¿Requiere Cotizador Dinámico?
            <select
              value={wantsQuoter ? "yes" : "no"}
              onChange={(e) => {
                const needs = e.target.value === "yes";
                setWantsQuoter(needs);
                setForm({
                  ...form,
                  quoter_service_id: needs ? (form.quoter_service_id || quoterServices[0]?.id || null) : null,
                });
              }}
              className={inputCls}
            >
              <option value="yes">Sí — Vincular con Cotizador</option>
              <option value="no">No — Botonera directa / Mensaje WhatsApp</option>
            </select>
          </label>

          <label className="text-xs font-semibold block">
            Color de acento e ícono
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                aria-label="Color de acento"
                className={inputCls}
              >
                <option value="orange">Naranja Marca</option>
                <option value="teal">Turquesa Marca</option>
                <option value="wine">Vino Marca</option>
              </select>
              <select
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                aria-label="Ícono del servicio"
                className={inputCls}
              >
                <option value="printer">Impresora</option>
                <option value="pencil-ruler">Diseño CAD</option>
                <option value="wrench">Servicio Técnico</option>
                <option value="scan-line">Escaneo 3D</option>
                <option value="sparkles">Acabados</option>
                <option value="graduation-cap">Cursos</option>
                <option value="boxes">Volumen</option>
                <option value="shopping-bag">Producto</option>
              </select>
            </div>
          </label>
        </div>

        {wantsQuoter ? (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 space-y-2">
            {quoterServices.length > 0 ? (
              <label className="text-xs font-semibold block">
                Cotizador Vinculado
                <select
                  value={form.quoter_service_id ?? ""}
                  onChange={(e) => setForm({ ...form, quoter_service_id: e.target.value || null })}
                  className={inputCls}
                >
                  <option value="">Selecciona un cotizador</option>
                  {quoterServices.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} ({q.slug})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-bold">Aún no hay servicios creados en el Cotizador.</p>
                <p>
                  Crea primero una calculadora en{" "}
                  <Link to="/panel/cotizador" className="underline font-bold">
                    Cotizador Unificado
                  </Link>{" "}
                  o selecciona “No — Mensaje WhatsApp” para usar contacto directo.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_8%,white)] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-primary flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Plantilla de Mensaje de WhatsApp Directo
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Modo directo activo
              </span>
            </div>
            <textarea
              aria-label="Mensaje de WhatsApp directo"
              rows={2}
              value={form.whatsapp_template || ""}
              onChange={(e) => setForm({ ...form, whatsapp_template: e.target.value })}
              placeholder={defaultWaMsg}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground block mb-0.5">Vista previa del mensaje que enviará el cliente:</span>
              “{effectiveWaPreview}”
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-border p-3 bg-muted/20">
          <input
            type="checkbox"
            id="requires_file"
            checked={form.requires_file}
            onChange={(e) => setForm({ ...form, requires_file: e.target.checked })}
            className="h-4 w-4 rounded accent-primary"
          />
          <label htmlFor="requires_file" className="text-xs font-semibold cursor-pointer">
            El servicio requiere o permite enviar archivos al cliente (archivos STL, planos, imágenes o bocetos).
          </label>
        </div>

        <div className="rounded-2xl border border-border bg-muted/15 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Multimedia de portada del servicio
            </span>
            <select
              value={form.media_type}
              onChange={(e) => setForm({ ...form, media_type: e.target.value as any })}
              aria-label="Tipo de multimedia"
              className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold"
            >
              <option value="image">Imagen estática</option>
              <option value="gif">GIF Animado</option>
              <option value="video">Vídeo Corto MP4/WebM</option>
            </select>
          </div>

          <MediaDropZone
            value={form.image_url || ""}
            onChange={(url, detected) =>
              setForm({
                ...form,
                image_url: url || null,
                media_type:
                  detected === "videoFill"
                    ? "video"
                    : form.media_type === "gif"
                      ? "gif"
                      : "image",
              })
            }
          />

          <label className="text-xs font-semibold block">
            O URL directa (GIF / Video MP4 / Imagen)
            <input
              value={form.image_url || ""}
              onChange={(e) => setForm({ ...form, image_url: e.target.value || null })}
              placeholder="https://... .gif, .mp4 o imagen"
              className={inputCls}
            />
          </label>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Puntos destacados (Bullets)
            </h4>
            <Button variant="ghost"
              type="button"
              onClick={() => setForm({ ...form, bullets: [...form.bullets, "Nuevo punto destacado"] })}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold hover:bg-primary/20"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar punto
            </Button>
          </div>

          <BulletsListEditor
            bullets={form.bullets}
            onChange={(newBullets) => setForm({ ...form, bullets: newBullets })}
          />
        </div>

        <label className="text-xs font-semibold block">
          Consejo de Kiara (KiaraTip)
          <input
            value={form.kiara_tip || ""}
            onChange={(e) => setForm({ ...form, kiara_tip: e.target.value })}
            placeholder="Tip práctico para tus clientes sobre este servicio..."
            className={inputCls}
          />
        </label>

        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Botones Personalizados del Servicio
          </h4>
          <ProductButtonsEditor
            buttons={form.custom_buttons || []}
            onChange={(btns) => setForm({ ...form, custom_buttons: btns })}
          />
        </div>

        <div className="mt-6 flex gap-3 pt-3 border-t border-border">
          <Button variant="ghost"
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar servicio
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-muted"
          >
            Cancelar
          </Button>
        </div>
      </form>
      </DialogContent>
    </Dialog>
  );
}
