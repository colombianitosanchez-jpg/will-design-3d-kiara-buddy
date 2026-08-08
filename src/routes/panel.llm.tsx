import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  Zap,
  KeyRound,
  X,
} from "lucide-react";
import {
  listLlmProviders,
  saveLlmProvider,
  deleteLlmProvider,
  setLlmProviderActive,
  reorderLlmProviders,
  testLlmProvider,
  type LlmProviderRow,
} from "@/lib/llm-providers.functions";

export const Route = createFileRoute("/panel/llm")({
  ssr: false,
  component: LlmAdmin,
});

type Draft = {
  id: string | null;
  name: string;
  base_url: string;
  model: string;
  api_key: string;
  priority: number;
  is_active: boolean;
  has_key: boolean;
};

const EMPTY: Draft = {
  id: null,
  name: "",
  base_url: "",
  model: "",
  api_key: "",
  priority: 1,
  is_active: true,
  has_key: false,
};

function LlmAdmin() {
  const list = useServerFn(listLlmProviders);
  const save = useServerFn(saveLlmProvider);
  const del = useServerFn(deleteLlmProvider);
  const toggle = useServerFn(setLlmProviderActive);
  const reorder = useServerFn(reorderLlmProviders);
  const test = useServerFn(testLlmProvider);

  const [rows, setRows] = useState<LlmProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const [prompts, setPrompts] = useState({ pub: "", internal: "" });
  const [savingPrompts, setSavingPrompts] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await list({ data: undefined } as never));
    } catch (e) {
      setMsg("Error al cargar: " + (e as Error).message);
    }
    const { data } = await supabase
      .from("site_content")
      .select("key, value")
      .in("key", ["kiara_prompt_public", "kiara_prompt_internal"]);
    const map: Record<string, string> = {};
    (data ?? []).forEach((r) => (map[r.key] = r.value));
    setPrompts({
      pub: map.kiara_prompt_public ?? "",
      internal: map.kiara_prompt_internal ?? "",
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitDraft() {
    if (!draft) return;

    const name = draft.name.trim();
    const base_url = draft.base_url.trim();
    const model = draft.model.trim();

    if (name.length < 2) {
      setMsg("Error: el nombre debe tener al menos 2 caracteres.");
      return;
    }
    let validUrl = false;
    try {
      const u = new URL(base_url);
      validUrl = u.protocol === "http:" || u.protocol === "https:";
    } catch {
      validUrl = false;
    }
    if (!validUrl) {
      setMsg("Error: la URL base debe ser completa, ej: https://openrouter.ai/api/v1");
      return;
    }
    if (!model) {
      setMsg("Error: escribe el nombre del modelo (ej: gpt-4o-mini).");
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      await save({
        data: {
          id: draft.id,
          name,
          base_url,
          model,

          api_key: draft.api_key || null,
          priority: draft.priority,
          is_active: draft.is_active,
        },
      });
      setDraft(null);
      await load();
      setMsg("Proveedor guardado.");
    } catch (e) {
      setMsg("Error: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    await reorder({ data: { ids: next.map((r) => r.id) } });
    await load();
  }

  async function savePrompts() {
    setSavingPrompts(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("site_content").upsert(
        [
          { key: "kiara_prompt_public", value: prompts.pub },
          { key: "kiara_prompt_internal", value: prompts.internal },
        ],
        { onConflict: "key" },
      );
      if (error) throw error;
      setMsg("Instrucciones de Kiara guardadas.");
    } catch (e) {
      setMsg("Error: " + (e as Error).message);
    } finally {
      setSavingPrompts(false);
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
          <h1 className="text-3xl font-black">Configuración de LLM</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Kiara intenta responder con el proveedor de prioridad 1. Si se agota la cuota
            (error 429) o el servidor falla, salta automáticamente al siguiente. Funciona con
            cualquier API compatible con OpenAI (OpenRouter, proxies, servidores locales).
          </p>
        </div>
        <button
          onClick={() => setDraft({ ...EMPTY, priority: rows.length + 1 })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Añadir proveedor
        </button>
      </div>

      {msg && <p className="mt-4 rounded-2xl bg-muted p-4 text-sm">{msg}</p>}

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aún no hay proveedores. Añade el primero para que Kiara responda con IA real.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Clave</th>
                <th className="px-4 py-3">Activo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-border align-middle">
                  <td className="px-4 py-3 font-black">{r.priority}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{r.name}</p>
                    <p className="break-all text-xs text-muted-foreground">{r.base_url}</p>
                    {results[r.id] && (
                      <p className="mt-1 text-xs font-semibold">{results[r.id]}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.model}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                        r.has_key ? "bg-[var(--brand-teal)]/15" : "bg-muted"
                      }`}
                    >
                      <KeyRound className="h-3 w-3" />
                      {r.has_key ? "Guardada" : "Sin clave"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        await toggle({ data: { id: r.id, is_active: !r.is_active } });
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
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40"
                        aria-label="Subir prioridad"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === rows.length - 1}
                        className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40"
                        aria-label="Bajar prioridad"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          setTesting(r.id);
                          try {
                            const res = await test({ data: { id: r.id } });
                            setResults((p) => ({
                              ...p,
                              [r.id]: res.ok
                                ? `OK · ${res.ms} ms`
                                : `Falló (${res.status || "red"}): ${res.message}`,
                            }));
                          } catch (e) {
                            setResults((p) => ({ ...p, [r.id]: "Error: " + (e as Error).message }));
                          } finally {
                            setTesting(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted"
                      >
                        {testing === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                        Probar
                      </button>
                      <button
                        onClick={() =>
                          setDraft({
                            id: r.id,
                            name: r.name,
                            base_url: r.base_url,
                            model: r.model,
                            api_key: "",
                            priority: r.priority,
                            is_active: r.is_active,
                            has_key: r.has_key,
                          })
                        }
                        className="rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted"
                      >
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar el proveedor "${r.name}"?`)) return;
                          await del({ data: { id: r.id } });
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

      {/* Instrucciones (doble persona) */}
      <div className="mt-8 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-lg font-black">Instrucciones de Kiara (doble persona)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El primer texto se usa con visitantes del sitio. El segundo se usa cuando quien
          escribe tiene sesión del equipo. Si los dejas vacíos se usan las instrucciones por
          defecto.
        </p>
        <label className="mt-4 block text-sm font-bold">Atención al cliente (público)</label>
        <textarea
          value={prompts.pub}
          onChange={(e) => setPrompts((p) => ({ ...p, pub: e.target.value }))}
          rows={6}
          className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <label className="mt-4 block text-sm font-bold">Técnico interno (equipo)</label>
        <textarea
          value={prompts.internal}
          onChange={(e) => setPrompts((p) => ({ ...p, internal: e.target.value }))}
          rows={6}
          className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={savePrompts}
          disabled={savingPrompts}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {savingPrompts ? "Guardando…" : "Guardar instrucciones"}
        </button>
      </div>

      {/* Modal proveedor */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">
                {draft.id ? "Editar proveedor" : "Nuevo proveedor"}
              </h2>
              <button
                onClick={() => setDraft(null)}
                className="rounded-full p-1 hover:bg-muted"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-bold">Nombre del proveedor</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="OpenRouter (gratis)"
                  className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-bold">URL base de la API</label>
                <p className="text-xs text-muted-foreground">
                  Sin /chat/completions. Ej: https://openrouter.ai/api/v1
                </p>
                <input
                  value={draft.base_url}
                  onChange={(e) => setDraft({ ...draft, base_url: e.target.value })}
                  placeholder="https://openrouter.ai/api/v1"
                  className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-bold">Nombre del modelo</label>
                <input
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  placeholder="meta-llama/llama-3.3-70b-instruct:free"
                  className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-bold">Clave API</label>
                <p className="text-xs text-muted-foreground">
                  {draft.has_key
                    ? "Ya hay una clave guardada. Déjalo vacío para conservarla."
                    : "Se guarda cifrada del lado del servidor y nunca se muestra de nuevo."}
                </p>
                <input
                  type="password"
                  value={draft.api_key}
                  onChange={(e) => setDraft({ ...draft, api_key: e.target.value })}
                  placeholder={draft.has_key ? "•••••••• guardada" : "sk-..."}
                  className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-bold">Prioridad (1 = primero)</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={draft.priority}
                    onChange={(e) =>
                      setDraft({ ...draft, priority: Number(e.target.value) || 1 })
                    }
                    className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                  />
                  Activo
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDraft(null)}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
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
