import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wrench,
  Printer,
  Sparkles,
  Package2,
  PencilRuler,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Film,
  Image as ImageIcon,
  Calculator,
  Save,
  X,
} from "lucide-react";
import { quoterServicesQuery } from "@/lib/quoter";
import { ProductButtonsEditor } from "@/components/ProductButtonsEditor";
import { parseProductButtons, type ProductButton } from "@/lib/product-buttons";

export const Route = createFileRoute("/admin/servicios")({
  ssr: false,
  component: ServiciosAdmin,
});

export type CustomServiceItem = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  media_url?: string;
  media_type?: "image" | "video" | "gif";
  bullets: string[];
  kiara_tip?: string;
  quoter_slug?: string;
  custom_buttons?: ProductButton[];
};

const DEFAULT_SERVICES: CustomServiceItem[] = [
  {
    id: "impresion-3d",
    name: "Impresión 3D a Pedido",
    desc: "Producimos tus piezas en FDM y resina, con especialidad en gran formato (50×50 cm o más).",
    icon: "printer",
    bullets: ["FDM: PLA, PETG, ABS, TPU", "Resina MSLA hasta 12K", "Gran formato 50x50 cm"],
    kiara_tip: "Si tu archivo aún no está optimizado, avísanos: revisamos huecos y grosores gratis.",
    quoter_slug: "impresion-3d",
  },
  {
    id: "modelado-3d",
    name: "Diseño 3D Personalizado",
    desc: "Modelamos desde cero usando tus referencias, planos o fotografías. Ideal si no tienes archivo.",
    icon: "pencil-ruler",
    bullets: ["Ingeniería inversa", "Escultura orgánica", "Modelado CAD paramétrico"],
    kiara_tip: "Cuéntanos función y tamaño primero — un buen diseño ahorra horas de impresión.",
    quoter_slug: "diseno-3d",
  },
  {
    id: "servicio-tecnico",
    name: "Mantenimiento y Reparación",
    desc: "Servicio técnico especializado para impresoras FDM y de resina de cualquier marca.",
    icon: "wrench",
    bullets: ["Diagnóstico y calibración", "Cambio de hotend y boquillas", "Soporte presencial en Bogotá"],
    kiara_tip: "Un mantenimiento cada 500 h de impresión evita el 80 % de las fallas comunes.",
    quoter_slug: "mantenimiento",
  },
  {
    id: "postprocesado",
    name: "Post-procesado y Acabados",
    desc: "Convertimos una pieza recién impresa en un producto terminado profesional.",
    icon: "sparkles",
    bullets: ["Lijado y masillado", "Pintura y primer", "Acabados metalizados y mate"],
    kiara_tip: "El acabado Premium multiplica el impacto visual — pídelo si vas a exhibir la pieza.",
    quoter_slug: "post-procesado",
  },
];

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function ServiciosAdmin() {
  const qc = useQueryClient();
  const { data: quoterSvcs } = useQuery(quoterServicesQuery(true));

  const [services, setServices] = useState<CustomServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CustomServiceItem | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("site_content").select("value").eq("key", "custom_services_list").maybeSingle();
    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServices(parsed);
          setLoading(false);
          return;
        }
      } catch {
        // fallback
      }
    }
    setServices(DEFAULT_SERVICES);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveServices(list: CustomServiceItem[]) {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_content").upsert(
        { key: "custom_services_list", value: JSON.stringify(list), section: "Servicios" },
        { onConflict: "key" },
      );
      if (error) throw error;
      setServices(list);
      await qc.invalidateQueries({ queryKey: ["site_content"] });
      toast.success("Servicios actualizados correctamente");
    } catch (e) {
      toast.error("Error al guardar servicios", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function handleSaveEditing(updated: CustomServiceItem) {
    const exists = services.some((s) => s.id === updated.id);
    const next = exists ? services.map((s) => (s.id === updated.id ? updated : s)) : [...services, updated];
    saveServices(next);
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este servicio?")) return;
    const next = services.filter((s) => s.id !== id);
    saveServices(next);
  }

  function handleCreateNew() {
    const newService: CustomServiceItem = {
      id: `svc_${Date.now()}`,
      name: "Nuevo Servicio Personalizado",
      desc: "Descripción breve del servicio...",
      icon: "printer",
      bullets: ["Característica 1", "Característica 2"],
      kiara_tip: "Tip práctico para tus clientes.",
      custom_buttons: [],
    };
    setEditing(newService);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Servicios 3D</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea, modifica y personaliza los servicios. Asígnales cotizadores, imágenes/GIFs/videos y botones dinámicos.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 shadow"
        >
          <Plus className="h-4 w-4" /> Crear nuevo servicio
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {services.map((s) => {
          const assignedQuoter = (quoterSvcs ?? []).find((q) => q.slug === s.quoter_slug);
          return (
            <div key={s.id} className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary font-bold">
                      <Printer className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{s.name}</h3>
                      {assignedQuoter ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-teal-deep)]">
                          <Calculator className="h-3 w-3" /> Vinculado a Cotizador: {assignedQuoter.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Sin cotizador vinculado</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-lg bg-muted p-2 text-xs font-semibold hover:bg-muted/70"
                      title="Editar servicio"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>

                {s.media_url && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted">
                    {s.media_type === "video" ? (
                      <video src={s.media_url} autoPlay loop muted playsInline className="h-32 w-full object-cover" />
                    ) : (
                      <img src={s.media_url} alt="" className="h-32 w-full object-cover" />
                    )}
                  </div>
                )}

                {s.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {s.bullets.map((b, i) => (
                      <li key={i}>• {b}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 border-t border-border pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Botones personalizados: {s.custom_buttons?.length ?? 0}
                </span>
                <button
                  onClick={() => setEditing(s)}
                  className="text-xs font-bold text-primary underline"
                >
                  Personalizar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Editor de Servicio */}
      {editing && (
        <ServiceModal
          service={editing}
          quoterServices={quoterSvcs ?? []}
          onClose={() => setEditing(null)}
          onSave={handleSaveEditing}
        />
      )}
    </>
  );
}

function ServiceModal({
  service,
  quoterServices,
  onClose,
  onSave,
}: {
  service: CustomServiceItem;
  quoterServices: any[];
  onClose: () => void;
  onSave: (updated: CustomServiceItem) => void;
}) {
  const [form, setForm] = useState<CustomServiceItem>(service);
  const [bulletsText, setBulletsText] = useState((service.bullets || []).join("\n"));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bullets = bulletsText
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);
    onSave({ ...form, bullets });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="my-8 w-full max-w-2xl rounded-3xl bg-background p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xl font-black">Configurar Servicio 3D</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold block">
            Nombre del Servicio
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </label>

          <label className="text-xs font-semibold block">
            Cotizador Asignado
            <select
              value={form.quoter_slug || ""}
              onChange={(e) => setForm({ ...form, quoter_slug: e.target.value || undefined })}
              className={inputCls}
            >
              <option value="">— Ninguno (Cotizar general por WhatsApp) —</option>
              {quoterServices.map((q) => (
                <option key={q.id} value={q.slug}>
                  {q.name} ({q.slug})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-xs font-semibold block">
          Descripción Principal
          <textarea
            rows={2}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            className={inputCls}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold block">
            URL Multimedia (GIF / Video MP4 / Imagen)
            <input
              value={form.media_url || ""}
              onChange={(e) => setForm({ ...form, media_url: e.target.value })}
              placeholder="https://... .gif o .mp4"
              className={inputCls}
            />
          </label>

          <label className="text-xs font-semibold block">
            Tipo de Multimedia
            <select
              value={form.media_type || "image"}
              onChange={(e) => setForm({ ...form, media_type: e.target.value as any })}
              className={inputCls}
            >
              <option value="image">Imagen fija</option>
              <option value="gif">GIF Animado</option>
              <option value="video">Vídeo Corto MP4/WebM</option>
            </select>
          </label>
        </div>

        <label className="text-xs font-semibold block">
          Puntos destacados (uno por línea)
          <textarea
            rows={3}
            value={bulletsText}
            onChange={(e) => setBulletsText(e.target.value)}
            placeholder="FDM: PLA, PETG, ABS&#10;Resina MSLA 12K&#10;Gran formato 50x50 cm"
            className={inputCls}
          />
        </label>

        <label className="text-xs font-semibold block">
          Consejo de Kiara (KiaraTip)
          <input
            value={form.kiara_tip || ""}
            onChange={(e) => setForm({ ...form, kiara_tip: e.target.value })}
            placeholder="Tip que verá el cliente al cotizar este servicio..."
            className={inputCls}
          />
        </label>

        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Botones Personalizables del Servicio
          </h4>
          <ProductButtonsEditor
            buttons={form.custom_buttons || []}
            onChange={(btns) => setForm({ ...form, custom_buttons: btns })}
          />
        </div>

        <div className="mt-6 flex gap-3 pt-3 border-t border-border">
          <button
            type="submit"
            className="flex-1 rounded-full bg-[var(--brand-orange)] px-5 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Guardar servicio
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
