import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Save } from "lucide-react";

export const Route = createFileRoute("/panel/contenido")({
  ssr: false,
  component: ContenidoAdmin,
});

type Row = { key: string; value: string };

const FIELDS: { key: string; label: string; type: "text" | "textarea" | "image"; help?: string }[] = [
  { key: "hero_title", label: "Título del hero (home)", type: "text" },
  { key: "hero_subtitle", label: "Subtítulo del hero (home)", type: "textarea" },
  { key: "kiara_message", label: "Mensaje de Kiara (widget)", type: "textarea" },
  { key: "about_short", label: "Descripción corta 'Nosotros'", type: "textarea" },
  { key: "kiara_image_url", label: "Foto de Kiara", type: "image", help: "Sube una nueva foto para reemplazar la mascota." },
];

function ContenidoAdmin() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("site_content").select("*");
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
    setMsg(null);
    try {
      const rows = FIELDS.map((f) => ({ key: f.key, value: values[f.key] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      setMsg("Cambios guardados. La web pública se actualiza en unos segundos.");
    } catch (e) {
      setMsg("Error: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(key: string, file: File) {
    setUploadingKey(key);
    try {
      const path = `content/${key}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      setValues((v) => ({ ...v, [key]: signed.data.signedUrl }));
    } catch (e) {
      alert("Error al subir: " + (e as Error).message);
    } finally {
      setUploadingKey(null);
    }
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Contenido del sitio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cambia los textos y la foto de Kiara sin tocar código.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {msg && <p className="mt-4 rounded-2xl bg-muted p-4 text-sm">{msg}</p>}

      <div className="mt-6 space-y-5">
        {FIELDS.map((f) => (
          <div key={f.key} className="rounded-3xl border border-border bg-card p-5">
            <label className="text-sm font-bold">{f.label}</label>
            {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
            {f.type === "text" && (
              <input
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            {f.type === "textarea" && (
              <textarea
                rows={3}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            {f.type === "image" && (
              <div className="mt-3 flex items-center gap-4">
                {values[f.key] ? (
                  <img src={values[f.key]} alt="" className="h-20 w-20 rounded-xl object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-muted" />
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  {uploadingKey === f.key ? "Subiendo…" : "Subir nueva imagen"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadImage(f.key, e.target.files[0])}
                  />
                </label>
                {values[f.key] && (
                  <button
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, [f.key]: "" }))}
                    className="text-xs text-muted-foreground underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
