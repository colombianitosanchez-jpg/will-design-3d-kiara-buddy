import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  CornerDownRight,
} from "lucide-react";
import { buildTree, menuHref, type MenuItemRow, type MenuNodeData } from "@/lib/menu";

export const Route = createFileRoute("/panel/menu")({
  ssr: false,
  component: MenuAdmin,
});

type Row = MenuItemRow & { is_active: boolean };
type Node = MenuNodeData & { is_active: boolean; children: Node[] };

const LINK_TYPES = [
  { value: "", label: "— Solo grupo (sin enlace) —" },
  { value: "tienda_categoria", label: "Categoría de tienda" },
  { value: "tienda_categoria_marca", label: "Categoría + marca (categoria::marca)" },
  { value: "servicio_anchor", label: "Ancla en /servicios" },
  { value: "personalizado", label: "URL personalizada" },
];

const HELP: Record<string, string> = {
  tienda_categoria: "Ej: filamentos → /tienda?categoria=filamentos",
  tienda_categoria_marca: "Ej: impresoras-filamento::creality",
  servicio_anchor: "Ej: cursos-3d-modelado → /servicios#cursos-3d-modelado",
  personalizado: "Ej: /galeria o https://…",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const empty: Partial<Row> = {
  label: "",
  slug: "",
  parent_id: null,
  link_type: null,
  link_value: "",
  display_order: 0,
  is_active: true,
};

function flatten(nodes: Node[], depth = 0): { node: Node; depth: number }[] {
  return nodes.flatMap((n) => [{ node: n, depth }, ...flatten(n.children, depth + 1)]);
}

function MenuAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("menu_items")
      .select("id,parent_id,label,slug,link_type,link_value,display_order,is_active")
      .order("display_order", { ascending: true });
    if (error) alert(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const tree = buildTree(rows as MenuItemRow[]) as Node[];
  const items = flatten(tree);

  function descendants(id: string): string[] {
    const kids = rows.filter((r) => r.parent_id === id);
    return kids.flatMap((k) => [k.id, ...descendants(k.id)]);
  }

  async function toggleActive(row: Row) {
    setBusy(row.id);
    const { error } = await supabase
      .from("menu_items")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    setBusy(null);
    if (error) return alert(error.message);
    load();
  }

  async function move(row: Row, dir: -1 | 1) {
    const siblings = rows
      .filter((r) => (r.parent_id ?? null) === (row.parent_id ?? null))
      .sort((a, b) => a.display_order - b.display_order);
    const idx = siblings.findIndex((s) => s.id === row.id);
    const target = siblings[idx + dir];
    if (!target) return;
    setBusy(row.id);
    const a = await supabase
      .from("menu_items")
      .update({ display_order: target.display_order })
      .eq("id", row.id);
    const b = await supabase
      .from("menu_items")
      .update({ display_order: row.display_order })
      .eq("id", target.id);
    setBusy(null);
    if (a.error || b.error) return alert((a.error ?? b.error)!.message);
    load();
  }

  async function remove(row: Row) {
    const kids = descendants(row.id);
    const msg = kids.length
      ? `“${row.label}” tiene ${kids.length} subítem(s). Si continúas, también se eliminarán todos sus hijos. ¿Eliminar de todas formas?`
      : `¿Eliminar “${row.label}” del menú?`;
    if (!confirm(msg)) return;
    setBusy(row.id);
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .in("id", [...kids, row.id]);
    setBusy(null);
    if (error) return alert(error.message);
    load();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Menú de navegación</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} ítem{rows.length === 1 ? "" : "s"}. Organiza el menú público sin tocar
            código.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Añadir ítem
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Aún no hay ítems. Haz clic en <b>Añadir ítem</b>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Ítem</th>
                  <th className="px-4 py-3">Enlace</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Visible</th>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ node, depth }) => {
                  const href = menuHref(node);
                  return (
                    <tr key={node.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${depth * 18}px` }}
                        >
                          {depth > 0 && (
                            <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className={depth === 0 ? "font-bold" : "font-semibold"}>
                            {node.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {href ?? "— grupo —"}
                      </td>
                      <td className="px-4 py-3 text-xs">{depth + 1}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(node)}
                          disabled={busy === node.id}
                          role="switch"
                          aria-checked={node.is_active}
                          aria-label={`Mostrar ${node.label} en el menú público`}
                          className={`relative h-6 w-11 rounded-full transition ${
                            node.is_active ? "bg-[var(--brand-teal-deep)]" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${
                              node.is_active ? "left-[22px]" : "left-0.5"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => move(node, -1)}
                            disabled={busy === node.id}
                            aria-label="Subir"
                            className="rounded-lg bg-muted p-1.5 hover:bg-muted/70"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => move(node, 1)}
                            disabled={busy === node.id}
                            aria-label="Bajar"
                            className="rounded-lg bg-muted p-1.5 hover:bg-muted/70"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditing(node)}
                          className="mr-2 inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/70"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                        <button
                          onClick={() => remove(node)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3 w-3" /> Borrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <MenuModal
          item={editing}
          items={items}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function MenuModal({
  item,
  items,
  onClose,
  onSaved,
}: {
  item: Partial<Row>;
  items: { node: Node; depth: number }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Row>>(item);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Row>(k: K, v: Row[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // No permitir elegir como padre a sí mismo ni a un descendiente, ni pasar de 3 niveles
  const blocked = new Set<string>();
  if (form.id) {
    const collect = (id: string) => {
      blocked.add(id);
      items.filter(({ node }) => node.parent_id === id).forEach(({ node }) => collect(node.id));
    };
    collect(form.id);
  }
  const parentOptions = items.filter(({ node, depth }) => depth < 2 && !blocked.has(node.id));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        label: (form.label ?? "").trim(),
        slug: (form.slug || slugify(form.label || "")).slice(0, 80),
        parent_id: form.parent_id || null,
        link_type: form.link_type || null,
        link_value: form.link_value?.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active ?? true,
      };
      if (!payload.label) throw new Error("El texto del ítem es obligatorio");
      if (!payload.slug) throw new Error("El slug es obligatorio");
      const q = form.id
        ? supabase.from("menu_items").update(payload).eq("id", form.id)
        : supabase.from("menu_items").insert(payload);
      const { error } = await q;
      if (error) throw error;
      onSaved();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <form onSubmit={save} className="my-8 w-full max-w-xl rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">{form.id ? "Editar ítem" : "Nuevo ítem"}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Texto del menú" required>
            <input
              required
              value={form.label ?? ""}
              onChange={(e) => {
                set("label", e.target.value);
                if (!form.id) set("slug", slugify(e.target.value));
              }}
              className={inputCls}
            />
          </Field>
          <Field label="Slug (identificador)">
            <input
              value={form.slug ?? ""}
              onChange={(e) => set("slug", slugify(e.target.value))}
              className={inputCls}
              placeholder="impresoras-3d"
            />
          </Field>
          <Field label="Pertenece a (padre)">
            <select
              value={form.parent_id ?? ""}
              onChange={(e) => set("parent_id", e.target.value || null)}
              className={inputCls}
            >
              <option value="">— Ninguno (primer nivel) —</option>
              {parentOptions.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {"— ".repeat(depth)}
                  {node.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Orden">
            <input
              type="number"
              value={form.display_order ?? 0}
              onChange={(e) => set("display_order", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Tipo de enlace">
            <select
              value={form.link_type ?? ""}
              onChange={(e) => set("link_type", e.target.value || null)}
              className={inputCls}
            >
              {LINK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valor del enlace">
            <input
              value={form.link_value ?? ""}
              onChange={(e) => set("link_value", e.target.value)}
              className={inputCls}
              placeholder={HELP[form.link_type ?? ""] ?? "Déjalo vacío si es solo un grupo"}
            />
          </Field>
        </div>

        {form.link_type && HELP[form.link_type] && (
          <p className="mt-2 text-xs text-muted-foreground">{HELP[form.link_type]}</p>
        )}

        <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.is_active ?? true}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4"
          />
          Visible en el menú público
        </label>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
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

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
