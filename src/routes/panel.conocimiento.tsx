import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Save, Trash2, X, BookOpen, Bot, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/panel/conocimiento")({
  ssr: false,
  component: KnowledgeAdmin,
});

type Category = "internal_team" | "public_web" | "all";

type KbRow = {
  id: string;
  category: Category;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
};

type Draft = {
  id: string | null;
  category: Category;
  title: string;
  content: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  id: null,
  category: "internal_team",
  title: "",
  content: "",
  is_active: true,
};

const CATEGORY_LABEL: Record<Category, string> = {
  internal_team: "Solo equipo interno",
  public_web: "Solo web pública",
  all: "Ambos (equipo y público)",
};

function KnowledgeAdmin() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/panel/kiara" });
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  const [rows, setRows] = useState<KbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("id, category, title, content, is_active, updated_at")
      .order("updated_at", { ascending: false });
    if (error) setMsg("Error al cargar: " + error.message);
    setRows((data ?? []) as KbRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (title.length < 2) {
      setMsg("Error: escribe un título de al menos 2 caracteres.");
      return;
    }
    if (!content) {
      setMsg("Error: el contenido no puede estar vacío.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const payload = {
      category: draft.category,
      title,
      content,
      is_active: draft.is_active,
    };
    const { error } = draft.id
      ? await supabase.from("knowledge_base").update(payload).eq("id", draft.id)
      : await supabase.from("knowledge_base").insert(payload);
    setBusy(false);
    if (error) {
      setMsg("Error: " + error.message);
      return;
    }
    setDraft(null);
    setMsg("Documento guardado. Kiara ya lo puede usar.");
    await load();
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
      <div className="mb-6 rounded-2xl border-2 border-primary/40 bg-primary/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            <div>
              <p className="font-bold text-sm">Esta sección se ha movido a la Base de Conocimiento en /panel/kiara</p>
              <p className="text-xs text-muted-foreground">Redirigiendo automáticamente a /panel/kiara...</p>
            </div>
          </div>
          <Link
            to="/panel/kiara"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            Ir a /panel/kiara <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Base de Conocimiento</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Todo lo que guardes aquí se le entrega a Kiara antes de responder: procedimientos,
            notas de inventario, manuales de impresoras, precios internos. Elige si el documento
            es solo para el equipo, solo para el público o para ambos.
          </p>
        </div>
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Añadir documento
        </button>
      </div>

      {msg && <p className="mt-4 rounded-2xl bg-muted p-4 text-sm">{msg}</p>}

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aún no hay documentos. Añade el primero para que Kiara responda con datos reales de
            la empresa.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Alcance</th>
                <th className="px-4 py-3">Activo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-middle">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-bold">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.title}
                    </p>
                    <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                      {r.content}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">
                      {CATEGORY_LABEL[r.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        await supabase
                          .from("knowledge_base")
                          .update({ is_active: !r.is_active })
                          .eq("id", r.id);
                        await load();
                      }}
                      className={`relative h-6 w-11 rounded-full transition ${
                        r.is_active ? "bg-[var(--brand-teal)]" : "bg-muted-foreground/30"
                      }`}
                      aria-label="Activar o desactivar"
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                          r.is_active ? "left-[1.4rem]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          setDraft({
                            id: r.id,
                            category: r.category,
                            title: r.title,
                            content: r.content,
                            is_active: r.is_active,
                          })
                        }
                        className="rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted"
                      >
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar "${r.title}"?`)) return;
                          await supabase.from("knowledge_base").delete().eq("id", r.id);
                          await load();
                        }}
                        className="rounded-lg border border-border p-1.5 text-red-600 hover:bg-muted"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">
                {draft.id ? "Editar documento" : "Nuevo documento"}
              </h2>
              <button
                onClick={() => setDraft(null)}
                aria-label="Cerrar"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-4 block text-sm font-bold">Título</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Ej: Procedimiento de calibración Elegoo Neptune 4 Max"
              className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <label className="mt-4 block text-sm font-bold">Alcance</label>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
              className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="internal_team">{CATEGORY_LABEL.internal_team}</option>
              <option value="public_web">{CATEGORY_LABEL.public_web}</option>
              <option value="all">{CATEGORY_LABEL.all}</option>
            </select>

            <label className="mt-4 block text-sm font-bold">Contenido</label>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              rows={12}
              placeholder="Pega aquí el procedimiento, manual, notas de inventario o precios internos."
              className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <label className="mt-4 flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              Activo (Kiara lo usará)
            </label>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setDraft(null)}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-bold hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={submitDraft}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {busy ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
