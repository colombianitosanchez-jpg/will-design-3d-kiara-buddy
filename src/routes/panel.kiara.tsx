import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  Upload,
  BookOpen,
  Search,
  Bot,
  SlidersHorizontal,
  FileText,
  Database,
  Check,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { getDefaultKiaraTab } from "@/lib/panel-access";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  listLlmProviders,
  saveLlmProvider,
  deleteLlmProvider,
  setLlmProviderActive,
  reorderLlmProviders,
  testLlmProvider,
  type LlmProviderRow,
} from "@/lib/llm-providers.functions";

export const Route = createFileRoute("/panel/kiara")({
  ssr: false,
  component: KiaraUnifiedAdmin,
});

// -----------------------------------------------------------------------------
// TYPES & CONSTANTS FOR KNOWLEDGE BASE
// -----------------------------------------------------------------------------
type KbCategory = "internal_team" | "public_web" | "all";

type KbRow = {
  id: string;
  category: KbCategory;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
};

type KbDraft = {
  id: string | null;
  category: KbCategory;
  title: string;
  content: string;
  is_active: boolean;
};

const KB_EMPTY: KbDraft = {
  id: null,
  category: "internal_team",
  title: "",
  content: "",
  is_active: true,
};

const CATEGORY_LABEL: Record<KbCategory, string> = {
  internal_team: "Solo equipo interno",
  public_web: "Solo web pública",
  all: "Ambos (equipo y público)",
};

// -----------------------------------------------------------------------------
// TYPES FOR LLM PROVIDER DRAFT
// -----------------------------------------------------------------------------
type LlmDraft = {
  id: string | null;
  name: string;
  base_url: string;
  model: string;
  api_key: string;
  priority: number;
  is_active: boolean;
  has_key: boolean;
  temperature: number;
  system_prompt: string;
  max_tokens: string;
};

const LLM_EMPTY: LlmDraft = {
  id: null,
  name: "",
  base_url: "",
  model: "",
  api_key: "",
  priority: 1,
  is_active: true,
  has_key: false,
  temperature: 0.2,
  system_prompt: "",
  max_tokens: "",
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
function KiaraUnifiedAdmin() {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(() => getDefaultKiaraTab(isSuperAdmin));

  useEffect(() => {
    if (!isSuperAdmin && activeTab !== "knowledge") {
      setActiveTab("knowledge");
    }
  }, [isSuperAdmin, activeTab]);

  const currentTab = isSuperAdmin ? activeTab : "knowledge";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Bot className="h-8 w-8 text-[var(--brand-orange)]" />
            Kiara IA — Panel Unificado
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Gestiona la personalidad, imagen, modelo LLM, prompts de sistema y base de conocimientos de Kiara desde un solo lugar."
              : "Consulta y gestiona la base de conocimientos de Kiara para respuestas comerciales y técnicas."}
          </p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start border-b border-border bg-transparent p-0">
          {isSuperAdmin && (
            <>
              <TabsTrigger value="perfil" className="flex items-center gap-2 py-2.5">
                <Bot className="h-4 w-4" /> Perfil y Saludos
              </TabsTrigger>
              <TabsTrigger value="llm" className="flex items-center gap-2 py-2.5">
                <SlidersHorizontal className="h-4 w-4" /> Proveedores de IA
              </TabsTrigger>
              <TabsTrigger value="prompts" className="flex items-center gap-2 py-2.5">
                <FileText className="h-4 w-4" /> Prompts del Sistema
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="knowledge" className="flex items-center gap-2 py-2.5">
            <Database className="h-4 w-4" /> Base de Conocimiento
          </TabsTrigger>
        </TabsList>

        {isSuperAdmin && (
          <>
            <TabsContent value="perfil" className="mt-6">
              <TabPerfilSaludos />
            </TabsContent>

            <TabsContent value="llm" className="mt-6">
              <TabProveedorLlm />
            </TabsContent>

            <TabsContent value="prompts" className="mt-6">
              <TabPromptsSistema />
            </TabsContent>
          </>
        )}

        <TabsContent value="knowledge" className="mt-6">
          <TabBaseConocimiento />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// TAB 1: PERFIL Y SALUDOS
// =============================================================================
function TabPerfilSaludos() {
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("site_content")
        .select("key, value")
        .in("key", ["kiara_image_url", "kiara_message"]);
      const map: Record<string, string> = {};
      ((data ?? []) as { key: string; value: string }[]).forEach((r) => (map[r.key] = r.value ?? ""));
      setImageUrl(map.kiara_image_url || "");
      setMessage(map.kiara_message || "");
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_content").upsert(
        [
          { key: "kiara_image_url", value: imageUrl, section: "Kiara" },
          { key: "kiara_message", value: message, section: "Kiara" },
        ],
        { onConflict: "key" },
      );
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
      toast.success("Perfil y mensajes de Kiara guardados");
    } catch (e) {
      toast.error("Error al guardar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadImage(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 50MB");
      return;
    }
    setUploading(true);
    try {
      const path = `content/kiara-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("site-media").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      setImageUrl(signed.data.signedUrl);
      toast.success("Foto de Kiara subida exitosamente");
    } catch (e) {
      toast.error("Error al subir foto: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando perfil de Kiara…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil y Mensaje Inicial de Kiara</CardTitle>
        <CardDescription>
          Configura la avatar visual de Kiara y su saludo inicial en el widget flotante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-bold">Avatar / Imagen de Kiara</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Imagen representativa usada en el widget de asistente y en la sección Nosotros.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Kiara Avatar"
                className="h-24 w-24 rounded-2xl object-cover border-2 border-primary/20 shadow-sm"
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-2xl bg-muted border border-dashed border-border text-xs text-muted-foreground text-center p-2">
                Sin foto
              </div>
            )}
            <div className="space-y-2">
              <Button asChild variant="outline" size="sm" disabled={uploading}>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Subiendo…" : "Subir nueva foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0])}
                  />
                </label>
              </Button>
              {imageUrl && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setImageUrl("")}
                  >
                    Quitar foto
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="kiara_message" className="text-sm font-bold">
            Mensaje de Bienvenida / Saludo Inicial
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Texto flotante del globo de Kiara para invitar a interactuar a los visitantes.
          </p>
          <Textarea
            id="kiara_message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hola 👋 Soy Kiara, la asistente técnica de Will Design 3D. ¿En qué puedo ayudarte hoy?"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--brand-wine)] hover:opacity-90 text-white font-bold"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Guardando…" : "Guardar Perfil"}
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TAB 2: PROVEEDORES Y LLM
// =============================================================================
function TabProveedorLlm() {
  const list = useServerFn(listLlmProviders);
  const save = useServerFn(saveLlmProvider);
  const del = useServerFn(deleteLlmProvider);
  const toggle = useServerFn(setLlmProviderActive);
  const reorder = useServerFn(reorderLlmProviders);
  const test = useServerFn(testLlmProvider);

  const [rows, setRows] = useState<LlmProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<LlmDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      setRows(await list({ data: undefined } as never));
    } catch (e) {
      setMsg("Error al cargar proveedores: " + (e as Error).message);
    }
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
      toast.error("El nombre debe tener al menos 2 caracteres");
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
      toast.error("La URL base debe ser completa, ej: https://openrouter.ai/api/v1");
      return;
    }
    if (!model) {
      toast.error("Escribe el nombre del modelo (ej: gpt-4o-mini)");
      return;
    }

    setBusy(true);
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
          temperature: draft.temperature,
          system_prompt: draft.system_prompt.trim() || null,
          max_tokens: draft.max_tokens.trim() ? Number(draft.max_tokens) : null,
        },
      });
      setDraft(null);
      await load();
      toast.success("Proveedor LLM guardado correctamente");
    } catch (e) {
      toast.error("Error al guardar proveedor: " + (e as Error).message);
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando proveedores de IA…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Proveedores de Inteligencia Artificial (LLM)</CardTitle>
            <CardDescription className="max-w-2xl">
              Kiara responde con el proveedor de prioridad 1. Si falla o se agota la cuota (429), salta automáticamente al siguiente.
            </CardDescription>
          </div>
          <Button
            onClick={() => setDraft({ ...LLM_EMPTY, priority: rows.length + 1 })}
            className="bg-[var(--brand-wine)] hover:opacity-90 text-white font-bold rounded-full"
          >
            <Plus className="mr-2 h-4 w-4" /> Añadir proveedor
          </Button>
        </CardHeader>
        <CardContent>
          {msg && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{msg}</p>}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aún no hay proveedores configurados. Añade el primero (OpenAI, DeepSeek, Groq, OpenRouter).
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Prio</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Modelo</th>
                    <th className="px-4 py-3">Clave API</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-t border-border align-middle">
                      <td className="px-4 py-3 font-black text-center">{r.priority}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold">{r.name}</p>
                        <p className="break-all text-xs text-muted-foreground">{r.base_url}</p>
                        {results[r.id] && (
                          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {results[r.id]}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.model}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                            r.has_key ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
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
                            title="Subir prioridad"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => move(i, 1)}
                            disabled={i === rows.length - 1}
                            className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40"
                            title="Bajar prioridad"
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
                                    : `Falló: ${res.message}`,
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
                                temperature: r.temperature,
                                system_prompt: r.system_prompt ?? "",
                                max_tokens: r.max_tokens ? String(r.max_tokens) : "",
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
                            title="Eliminar"
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
        </CardContent>
      </Card>

      {/* MODAL CONFIGURACIÓN PROVEEDOR */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">
                {draft.id ? "Editar proveedor LLM" : "Nuevo proveedor LLM"}
              </h2>
              <button onClick={() => setDraft(null)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-xs font-bold">Nombre del Proveedor</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Ej: OpenAI / DeepSeek / Groq / OpenRouter"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">URL Base de la API</Label>
                <p className="text-[11px] text-muted-foreground">
                  Ej: https://api.openai.com/v1 o https://openrouter.ai/api/v1
                </p>
                <Input
                  value={draft.base_url}
                  onChange={(e) => setDraft({ ...draft, base_url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Nombre del Modelo</Label>
                <Input
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  placeholder="gpt-4o-mini / deepseek-chat / llama-3.3-70b"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Clave API</Label>
                <p className="text-[11px] text-muted-foreground">
                  {draft.has_key
                    ? "Clave cifrada almacenada. Déjalo en blanco para no cambiarla."
                    : "Se guarda cifrada de forma segura en el backend."}
                </p>
                <Input
                  type="password"
                  value={draft.api_key}
                  onChange={(e) => setDraft({ ...draft, api_key: e.target.value })}
                  placeholder={draft.has_key ? "•••••••• guardada" : "sk-..."}
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs font-bold">
                    Temperatura ({draft.temperature.toFixed(2)})
                  </Label>
                  <p className="text-[10px] text-muted-foreground">0 = exacto · 1 = creativo</p>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={draft.temperature}
                    onChange={(e) =>
                      setDraft({ ...draft, temperature: Number(e.target.value) })
                    }
                    className="mt-2 w-full accent-[var(--brand-orange)]"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs font-bold">Máx Tokens</Label>
                  <Input
                    type="number"
                    min={64}
                    max={32000}
                    value={draft.max_tokens}
                    onChange={(e) => setDraft({ ...draft, max_tokens: e.target.value })}
                    placeholder="800"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Instrucciones Adicionales para este Modelo</Label>
                <Textarea
                  value={draft.system_prompt}
                  onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
                  rows={2}
                  placeholder="Instrucción específica para este modelo (opcional)"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label className="text-xs font-bold">Prioridad</Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={draft.priority}
                    onChange={(e) =>
                      setDraft({ ...draft, priority: Number(e.target.value) || 1 })
                    }
                    className="mt-1 w-24"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
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
              <Button variant="outline" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button
                onClick={submitDraft}
                disabled={busy}
                className="bg-[var(--brand-wine)] text-white font-bold"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Proveedor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TAB 3: PROMPTS DE SISTEMA
// =============================================================================
function TabPromptsSistema() {
  const queryClient = useQueryClient();
  const [prompts, setPrompts] = useState({ pub: "", internal: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("site_content")
        .select("key, value")
        .in("key", ["kiara_prompt_public", "kiara_prompt_internal"]);
      const map: Record<string, string> = {};
      ((data ?? []) as { key: string; value: string }[]).forEach((r) => (map[r.key] = r.value ?? ""));
      setPrompts({
        pub: map.kiara_prompt_public ?? "",
        internal: map.kiara_prompt_internal ?? "",
      });
      setLoading(false);
    }
    load();
  }, []);

  async function handleSavePrompts() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_content").upsert(
        [
          { key: "kiara_prompt_public", value: prompts.pub, section: "Kiara" },
          { key: "kiara_prompt_internal", value: prompts.internal, section: "Kiara" },
        ],
        { onConflict: "key" },
      );
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
      toast.success("Prompts de sistema de Kiara actualizados");
    } catch (e) {
      toast.error("Error al guardar prompts: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando prompts de sistema…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompts de Sistema (Doble Persona)</CardTitle>
        <CardDescription>
          Define la personalidad y reglas de comportamiento de Kiara según si el usuario es un cliente web o un miembro del equipo en el panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-bold text-foreground">
            1. Prompt para Clientes Web (Público)
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Instrucciones para atender visitantes en la tienda y cotizador. Debe ser cordial, comercial y resolutiva.
          </p>
          <Textarea
            rows={8}
            value={prompts.pub}
            onChange={(e) => setPrompts((p) => ({ ...p, pub: e.target.value }))}
            placeholder="Eres Kiara, la asistente comercial y técnica de Will Design 3D..."
            className="font-mono text-xs"
          />
        </div>

        <div>
          <Label className="text-sm font-bold text-foreground">
            2. Prompt para el Equipo (Técnico e Interno)
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Instrucciones cuando quien interactúa tiene sesión iniciada en el panel administrativo. Puede incluir lenguaje técnico y acceso a datos internos.
          </p>
          <Textarea
            rows={8}
            value={prompts.internal}
            onChange={(e) => setPrompts((p) => ({ ...p, internal: e.target.value }))}
            placeholder="Eres Kiara en modo Asistente de Operaciones de Will Design 3D..."
            className="font-mono text-xs"
          />
        </div>

        <Button
          onClick={handleSavePrompts}
          disabled={saving}
          className="bg-[var(--brand-wine)] hover:opacity-90 text-white font-bold"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Guardando…" : "Guardar Prompts de Sistema"}
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TAB 4: BASE DE CONOCIMIENTO
// =============================================================================
function TabBaseConocimiento() {
  const [rows, setRows] = useState<KbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<KbDraft | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("id, category, title, content, is_active, updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast.error("Error al cargar base de conocimientos: " + error.message);
    setRows((data ?? []) as KbRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmitDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (title.length < 2) {
      toast.error("El título debe tener al menos 2 caracteres");
      return;
    }
    if (!content) {
      toast.error("El contenido no puede estar vacío");
      return;
    }
    setBusy(true);
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
      toast.error("Error al guardar: " + error.message);
      return;
    }
    setDraft(null);
    toast.success("Documento guardado exitosamente");
    await load();
  }

  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando base de conocimiento…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Base de Conocimiento de Kiara</CardTitle>
            <CardDescription className="max-w-xl">
              Documentación, especificaciones, políticas y procedimientos que Kiara consulta automáticamente para responder consultas complejas.
            </CardDescription>
          </div>
          <Button
            onClick={() => setDraft({ ...KB_EMPTY })}
            className="bg-[var(--brand-wine)] hover:opacity-90 text-white font-bold rounded-full shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" /> Añadir Documento
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en el conocimiento…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {filteredRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {search ? "No hay documentos que coincidan con la búsqueda." : "Aún no hay documentos en la base de conocimiento."}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Alcance</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="border-t border-border align-middle">
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-2 font-bold text-foreground">
                          <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                          {r.title}
                        </p>
                        <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                          {r.content}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-bold"
                            onClick={() =>
                              setDraft({
                                id: r.id,
                                category: r.category,
                                title: r.title,
                                content: r.content,
                                is_active: r.is_active,
                              })
                            }
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-muted"
                            onClick={async () => {
                              if (!confirm(`¿Eliminar "${r.title}"?`)) return;
                              await supabase.from("knowledge_base").delete().eq("id", r.id);
                              await load();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL DOCUMENTO KB */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">
                {draft.id ? "Editar Documento de Conocimiento" : "Nuevo Documento"}
              </h2>
              <button
                onClick={() => setDraft(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-xs font-bold">Título del Documento</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Ej: Políticas de envío y garantía de filamentos"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Alcance de Visibilidad</Label>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as KbCategory })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="internal_team">{CATEGORY_LABEL.internal_team}</option>
                  <option value="public_web">{CATEGORY_LABEL.public_web}</option>
                  <option value="all">{CATEGORY_LABEL.all}</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold">Contenido Explícito</Label>
                <Textarea
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  rows={10}
                  placeholder="Escribe o pega aquí la información técnica, políticas, preguntas frecuentes o manuales..."
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                />
                Activo (Kiara utilizará este conocimiento en sus consultas)
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitDraft}
                disabled={busy}
                className="bg-[var(--brand-wine)] text-white font-bold"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Documento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
