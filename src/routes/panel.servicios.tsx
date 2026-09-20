import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  siteServicesQuery,
  SITE_SERVICE_COLORS,
  SITE_SERVICE_ICONS,
  SITE_SERVICE_ICON_OPTIONS,
  slugify,
  type SiteService,
} from "@/lib/site-services";
import { HERO_MEDIA_BUCKET } from "@/lib/hero-carousel";

export const Route = createFileRoute("/panel/servicios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Servicios · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ServiciosAdmin,
});

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

const selectCls = inputCls;

function ServiciosAdmin() {
  const qc = useQueryClient();
  const { data: services, isLoading } = useQuery(siteServicesQuery(true));
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const reload = () => qc.invalidateQueries({ queryKey: ["site-services"] });

  async function addService() {
    const name = window.prompt("Nombre del nuevo servicio (ej: Alquiler de impresoras)");
    if (!name?.trim()) return;
    const { error } = await supabase.from("site_services").insert({
      slug: slugify(name) || `servicio-${Date.now()}`,
      title: name.trim(),
      sort_order: (services?.length ?? 0) + 1,
    });
    setMsg(error ? `Error: ${error.message}` : `“${name.trim()}” creado. Ábrelo para completarlo.`);
    reload();
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !services) return;
    const oldIndex = services.findIndex((s) => s.id === active.id);
    const newIndex = services.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(services, oldIndex, newIndex);
    qc.setQueryData(["site-services", true], reordered);
    setSavingOrder(true);
    try {
      await Promise.all(
        reordered.map((s, i) =>
          supabase.from("site_services").update({ sort_order: i }).eq("id", s.id),
        ),
      );
      toast.success("Orden guardado");
    } catch (err) {
      toast.error("No pudimos guardar el orden", { description: (err as Error).message });
    } finally {
      setSavingOrder(false);
      reload();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Servicios de la web</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Estos son los servicios que aparecen en la página pública /servicios. Arrastra las
            tarjetas para cambiar el orden; los cambios se ven de inmediato en la web.
          </p>
        </div>
        <button
          onClick={addService}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> Nuevo servicio
        </button>
      </div>

      {msg && <p className="mt-3 text-xs font-semibold text-muted-foreground">{msg}</p>}

      {isLoading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios…
        </div>
      )}

      {services && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
          {savingOrder ? "Guardando nuevo orden…" : "Usa el tirador de cada tarjeta para reordenar."}
        </p>
      )}

      {services && services.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={services.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-4 space-y-4">
              {services.map((s) => (
                <SortableServiceCard
                  key={s.id}
                  service={s}
                  open={openId === s.id}
                  onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                  onChanged={reload}
                  onMsg={setMsg}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {services && services.length === 0 && (
        <p className="mt-6 rounded-2xl bg-muted p-6 text-sm text-muted-foreground">
          Aún no hay servicios. Crea el primero con “Nuevo servicio”.
        </p>
      )}
    </>
  );
}

/** Tarjeta arrastrable de un servicio. */
function SortableServiceCard({
  service,
  open,
  onToggle,
  onChanged,
  onMsg,
}: {
  service: SiteService;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: service.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = SITE_SERVICE_ICONS[service.icon] ?? SITE_SERVICE_ICONS["boxes"];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-3xl border border-border bg-card ${isDragging ? "shadow-lg opacity-80" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 p-5">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded-lg p-2 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          title="Arrastrar para reordenar"
          aria-label={`Reordenar ${service.title}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button onClick={onToggle} className="flex flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Icon className="h-4 w-4 text-[var(--brand-orange)]" />
          <span className="text-lg font-black">{service.title}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">/{service.slug}</span>
          {!service.is_active && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              Oculto
            </span>
          )}
        </button>
        <ActiveToggle service={service} onChanged={onChanged} onMsg={onMsg} />
        <DeleteButton service={service} onChanged={onChanged} onMsg={onMsg} />
      </div>
      {open && <ServiceForm service={service} onChanged={onChanged} onMsg={onMsg} />}
    </div>
  );
}

function ActiveToggle({
  service,
  onChanged,
  onMsg,
}: {
  service: SiteService;
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  async function toggle() {
    const { error } = await supabase
      .from("site_services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);
    if (error) toast.error(error.message);
    onChanged();
  }
  return (
    <button
      onClick={toggle}
      className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
      title={service.is_active ? "Ocultar en la web" : "Mostrar en la web"}
      aria-label={service.is_active ? "Ocultar en la web" : "Mostrar en la web"}
    >
      {service.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  );
}

function DeleteButton({
  service,
  onChanged,
  onMsg,
}: {
  service: SiteService;
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  async function remove() {
    if (!window.confirm(`¿Eliminar “${service.title}” de la web?`)) return;
    const { error } = await supabase.from("site_services").delete().eq("id", service.id);
    onMsg(error ? `Error: ${error.message}` : "Servicio eliminado.");
    if (error) toast.error(error.message);
    onChanged();
  }
  return (
    <button
      onClick={remove}
      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-red-600"
      title="Eliminar servicio"
      aria-label={`Eliminar ${service.title}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function ServiceForm({
  service,
  onChanged,
  onMsg,
}: {
  service: SiteService;
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  const [title, setTitle] = useState(service.title);
  const [lead, setLead] = useState(service.lead);
  const [bulletsText, setBulletsText] = useState(service.bullets.join("\n"));
  const [color, setColor] = useState(service.color);
  const [icon, setIcon] = useState(service.icon);
  const [kiaraTip, setKiaraTip] = useState(service.kiara_tip);
  const [imageUrl, setImageUrl] = useState(service.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(service.title);
    setLead(service.lead);
    setBulletsText(service.bullets.join("\n"));
    setColor(service.color);
    setIcon(service.icon);
    setKiaraTip(service.kiara_tip);
    setImageUrl(service.image_url ?? "");
  }, [service]);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const path = `servicios/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from(HERO_MEDIA_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from(HERO_MEDIA_BUCKET).createSignedUrl(path, TEN_YEARS);
      if (signed.error) throw signed.error;
      setImageUrl(signed.data.signedUrl);
      toast.success("Imagen subida. Recuerda guardar los cambios.");
    } catch (err) {
      toast.error("No pudimos subir la imagen", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const bullets = bulletsText
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("site_services")
      .update({
        title: title.trim() || service.title,
        lead: lead.trim(),
        bullets,
        color,
        icon,
        kiara_tip: kiaraTip.trim(),
        image_url: imageUrl.trim() || null,
      })
      .eq("id", service.id);
    setSaving(false);
    if (error) {
      toast.error("No pudimos guardar", { description: error.message });
    } else {
      toast.success(`“${title.trim() || service.title}” guardado.`);
      onChanged();
    }
    onMsg(error ? `Error: ${error.message}` : "Cambios guardados.");
  }

  return (
    <div className="space-y-3 border-t border-border p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-muted-foreground">
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">
          Icono
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className={`mt-1 ${selectCls}`}>
            {SITE_SERVICE_ICON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs font-semibold text-muted-foreground">
        Descripción corta (lead)
        <textarea
          value={lead}
          onChange={(e) => setLead(e.target.value)}
          rows={2}
          className={`mt-1 ${inputCls}`}
        />
      </label>

      <label className="block text-xs font-semibold text-muted-foreground">
        Viñetas (una por línea)
        <textarea
          value={bulletsText}
          onChange={(e) => setBulletsText(e.target.value)}
          rows={4}
          className={`mt-1 ${inputCls}`}
          placeholder={"FDM: PLA, PETG, ABS\nResina hasta 12K\n…"}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-muted-foreground">
          Color de la tarjeta
          <select
            value={color}
            onChange={(e) => setColor(e.target.value as SiteService["color"])}
            className={`mt-1 ${selectCls}`}
          >
            {SITE_SERVICE_COLORS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">
          Tip de Kiara (aparece bajo la imagen)
          <input
            value={kiaraTip}
            onChange={(e) => setKiaraTip(e.target.value)}
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-dashed border-border p-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" /> Imagen de la tarjeta (opcional; si está vacía se
          muestra el degradado de color)
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL de la imagen"
            className={`flex-1 ${inputCls}`}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Subir imagen
          </button>
          {imageUrl && (
            <button
              onClick={() => setImageUrl("")}
              className="rounded-full px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
            >
              Quitar
            </button>
          )}
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Vista previa"
            className="mt-2 max-h-32 rounded-xl object-cover"
          />
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar cambios
      </button>
    </div>
  );
}
