import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wrench,
  Printer,
  Sparkles,
  PencilRuler,
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
  ScanLine,
  ShoppingBag,
  GraduationCap,
  FileUp,
  MessageSquare,
} from "lucide-react";
import { quoterServicesQuery } from "@/lib/quoter";
import { ProductButtonsEditor } from "@/components/ProductButtonsEditor";
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

function ServiciosPanel() {
  const qc = useQueryClient();
  const { data: quoterSvcs } = useQuery(quoterServicesQuery(true));

  const [services, setServices] = useState<SiteServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
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
    const { data } = await supabase
      .from("site_content")
      .select("key, value")
      .in("key", ["services_section_title", "services_section_subtitle"]);

    if (data) {
      const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
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
      toast.error("Error al guardar encabezado: " + (e.message || ""));
    } finally {
      setSavingHeader(false);
    }
  }

  async function loadServices() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_services")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        console.warn("Could not fetch site_services directly:", error.message);
      }

      if (data && data.length > 0) {
        const formatted: SiteServiceItem[] = data.map((item: any) => ({
          id: item.id,
          slug: item.slug || `svc-${item.id}`,
          title: item.title || "Servicio sin título",
          lead: item.lead || "",
          icon: item.icon || "printer",
          color: item.color || "orange",
          image_url: item.image_url || null,
          media_type: (item.media_type as any) || "image",
          quoter_service_id: item.quoter_service_id || null,
          whatsapp_template: item.whatsapp_template || null,
          requires_file: Boolean(item.requires_file),
          bullets: Array.isArray(item.bullets) ? item.bullets : [],
          kiara_tip: item.kiara_tip || "",
          custom_buttons: parseProductButtons(item.custom_buttons),
          is_active: item.is_active ?? true,
          sort_order: item.sort_order ?? 0,
        }));
        setServices(formatted);
        setLoading(false);
        return;
      }

      // If database table is empty, seed defaults
      const seeded = await seedDefaultServices();
      setServices(seeded);
    } catch (e) {
      toast.error("Error al cargar los servicios");
    } finally {
      setLoading(false);
    }
  }

  async function seedDefaultServices(): Promise<SiteServiceItem[]> {
    const listToInsert = DEFAULT_SITE_SERVICES.map((s, idx) => ({
      ...s,
      bullets: s.bullets as any,
      custom_buttons: s.custom_buttons as any,
      sort_order: (idx + 1) * 10,
    }));

    const { data, error } = await supabase.from("site_services").insert(listToInsert).select();
    if (error || !data || data.length === 0) {
      return DEFAULT_SITE_SERVICES.map((s, idx) => ({
        ...s,
        id: `svc_temp_${idx}`,
        sort_order: (idx + 1) * 10,
      }));
    }

    return data.map((item: any) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      lead: item.lead,
      icon: item.icon,
      color: item.color,
      image_url: item.image_url,
      media_type: item.media_type as any,
      quoter_service_id: item.quoter_service_id,
      whatsapp_template: item.whatsapp_template,
      requires_file: Boolean(item.requires_file),
      bullets: Array.isArray(item.bullets) ? item.bullets : [],
      kiara_tip: item.kiara_tip || "",
      custom_buttons: parseProductButtons(item.custom_buttons),
      is_active: item.is_active,
      sort_order: item.sort_order,
    }));
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
      toast.error("Error al actualizar visibilidad");
      loadServices();
    } else {
      toast.success(nextActive ? "Servicio visible" : "Servicio oculto");
      qc.invalidateQueries({ queryKey: ["site-services"] });
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
        quoter_service_id: updated.quoter_service_id || null,
        whatsapp_template: updated.whatsapp_template || null,
        requires_file: updated.requires_file,
        bullets: updated.bullets as any,
        kiara_tip: updated.kiara_tip,
        custom_buttons: updated.custom_buttons as any,
        is_active: updated.is_active,
        sort_order: updated.sort_order,
      };

      if (updated.id && !updated.id.startsWith("svc_temp_")) {
        const { error } = await supabase.from("site_services").update(payload).eq("id", updated.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_services").insert([{ ...payload }]);
        if (error) throw error;
      }

      toast.success("Servicio guardado correctamente");
      setEditing(null);
      await loadServices();
      await qc.invalidateQueries({ queryKey: ["site-services"] });
    } catch (e: any) {
      toast.error("Error al guardar servicio: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este servicio?")) return;
    try {
      const { error } = await supabase.from("site_services").delete().eq("id", id);
      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Servicio eliminado");
      await qc.invalidateQueries({ queryKey: ["site-services"] });
    } catch (e: any) {
      toast.error("Error al eliminar servicio");
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

    const reordered = arrayMove(services, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sort_order: (index + 1) * 10,
    }));

    setServices(reordered);

    // Save order
    try {
      await Promise.all(
        reordered.map((s) =>
          supabase.from("site_services").update({ sort_order: s.sort_order }).eq("id", s.id)
        )
      );
      toast.success("Orden de servicios actualizado");
      qc.invalidateQueries({ queryKey: ["site-services"] });
    } catch {
      toast.error("Error al guardar el nuevo orden");
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
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Gestión de Servicios 3D</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea, edita, oculta u ordena servicios. Vincula cada servicio a su cotizador o configura mensajes de WhatsApp, archivos requeridos y botones personalizados.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 shadow"
        >
          <Plus className="h-4 w-4" /> Crear nuevo servicio
        </button>
      </div>

      {/* Encabezado Principal de la Sección Servicios (Fuente de Verdad Concentrada) */}
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
          <button
            type="button"
            onClick={handleSaveHeader}
            disabled={savingHeader}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-orange)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-xs"
          >
            {savingHeader ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar Encabezado
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold block text-muted-foreground">
              Título Sección Servicios
            </label>
            <input
              type="text"
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
              value={sectionSubtitle}
              onChange={(e) => setSectionSubtitle(e.target.value)}
              placeholder="Ej: Soluciones de impresión 3D, diseño y mantenimiento..."
              className={inputCls}
            />
          </div>
        </div>
      </div>

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: s.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignedQuoter = quoterServices.find((q) => q.id === s.quoter_service_id || q.slug === s.slug);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border ${
        s.is_active ? "border-border bg-card" : "border-dashed border-muted bg-muted/30 opacity-75"
      } p-4 shadow-sm`}
    >
      <div className="flex items-start gap-3 w-full sm:w-auto">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground p-1"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{s.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border border-border bg-muted">
              Pos: {s.sort_order}
            </span>
            {assignedQuoter ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-teal-deep)] bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200">
                <Calculator className="h-3 w-3" /> Cotizador: {assignedQuoter.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                <MessageSquare className="h-3 w-3" /> WhatsApp Directo
              </span>
            )}
            {s.requires_file && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200">
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
        <button
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
        </button>

        <button
          onClick={onEdit}
          className="rounded-lg bg-muted p-2 text-xs font-semibold hover:bg-muted/80"
          title="Editar servicio"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          onClick={onDelete}
          className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400"
          title="Eliminar servicio"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1 shrink-0"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <input
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe la viñeta o característica..."
        className={inputCls}
      />

      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-red-600 shrink-0"
        title="Eliminar viñeta"
      >
        <Trash2 className="h-4 w-4" />
      </button>
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
  const [form, setForm] = useState<SiteServiceItem>(service);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="my-8 w-full max-w-2xl rounded-3xl bg-background p-6 shadow-2xl space-y-4 border border-border"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xl font-black">
            {service.id ? "Editar Servicio 3D" : "Crear Nuevo Servicio 3D"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
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
              className={inputCls}
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
              value={form.quoter_service_id ? "yes" : "no"}
              onChange={(e) => {
                const needs = e.target.value === "yes";
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
            Posición / Orden
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              className={inputCls}
            />
          </label>
        </div>

        {form.quoter_service_id ? (
          <label className="text-xs font-semibold block">
            Cotizador Vinculado
            <select
              value={form.quoter_service_id}
              onChange={(e) => setForm({ ...form, quoter_service_id: e.target.value || null })}
              className={inputCls}
            >
              {quoterServices.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({q.slug})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="text-xs font-semibold block">
            Plantilla de Mensaje de WhatsApp Directo
            <textarea
              rows={2}
              value={form.whatsapp_template || ""}
              onChange={(e) => setForm({ ...form, whatsapp_template: e.target.value })}
              placeholder="Hola Will Design 3D! Quisiera consultar acerca del servicio..."
              className={inputCls}
            />
          </label>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold block">
            URL Multimedia (GIF / Video MP4 / Imagen)
            <input
              value={form.image_url || ""}
              onChange={(e) => setForm({ ...form, image_url: e.target.value || null })}
              placeholder="https://... .gif, .mp4 o imagen"
              className={inputCls}
            />
          </label>

          <label className="text-xs font-semibold block">
            Tipo de Multimedia
            <select
              value={form.media_type}
              onChange={(e) => setForm({ ...form, media_type: e.target.value as any })}
              className={inputCls}
            >
              <option value="image">Imagen estática</option>
              <option value="gif">GIF Animado</option>
              <option value="video">Vídeo Corto MP4/WebM</option>
            </select>
          </label>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Puntos destacados (Bullets)
            </h4>
            <button
              type="button"
              onClick={() => setForm({ ...form, bullets: [...form.bullets, "Nuevo punto destacado"] })}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold hover:bg-primary/20"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar punto
            </button>
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
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-[var(--brand-orange)] px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar servicio
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
