import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  GripVertical,
  CornerDownRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  buildTree,
  menuHref,
  menuTargetLabel,
  MENU_SELECT,
  SERVICE_ANCHORS,
  SITE_PAGES,
  type MenuItemRow,
  type MenuNodeData,
  type MenuTargetKind,
} from "@/lib/menu";
import {
  buildCategoryTree,
  flattenCategoryTree,
  slugify,
  type Attribute,
  type Brand,
  type Category,
} from "@/lib/catalog";
import { applySiblingOrder, resolveSiblingReorder } from "@/lib/tree-reorder";

export const Route = createFileRoute("/panel/menu")({
  ssr: false,
  component: MenuAdmin,
});

type Row = MenuItemRow & { is_active: boolean };
type Node = MenuNodeData & { is_active: boolean; children: Node[] };

const TARGETS: { value: MenuTargetKind; label: string }[] = [
  { value: "group", label: "Solo grupo (sin enlace)" },
  { value: "category", label: "Categoría del catálogo" },
  { value: "category_brand", label: "Categoría + marca" },
  { value: "attribute", label: "Atributo (color, material…)" },
  { value: "service", label: "Servicio de /servicios" },
  { value: "page", label: "Página del sitio" },
  { value: "url", label: "URL personalizada" },
];

const empty: Partial<Row> = {
  label: "",
  slug: "",
  parent_id: null,
  target_kind: "group",
  display_order: 0,
  is_active: true,
};

function flatten(nodes: Node[], depth = 0): { node: Node; depth: number }[] {
  return nodes.flatMap((n) => [{ node: n, depth }, ...flatten(n.children, depth + 1)]);
}

function MenuAdmin() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function invalidateMenuCache() {
    void queryClient.invalidateQueries({ queryKey: ["menu_items"] });
  }

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const [m, c, b, a, p] = await Promise.all([
      supabase
        .from("menu_items")
        .select(`${MENU_SELECT},is_active`)
        .order("display_order", { ascending: true }),
      supabase
        .from("categories")
        .select("id,slug,name,sort_order,parent_id,is_active,image_url")
        .order("sort_order"),
      supabase.from("brands").select("id,name,slug,logo_url,is_active,sort_order").order("sort_order"),
      supabase
        .from("attributes")
        .select(
          "id,slug,name,input_type,is_filterable,sort_order,values:attribute_values(id,attribute_id,slug,label,color_hex,sort_order)",
        )
        .order("sort_order"),
      supabase.from("products").select("category_id,brand_id").eq("active", true),
    ]);
    if (m.error) alert(m.error.message);
    setRows((m.data as unknown as Row[]) ?? []);
    setCategories((c.data as Category[]) ?? []);
    setBrands((b.data as Brand[]) ?? []);
    setAttributes((a.data as unknown as Attribute[]) ?? []);
    const counts: Record<string, number> = {};
    ((p.data as { category_id: string | null }[] | null) ?? []).forEach((r) => {
      if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1;
    });
    setProductCounts(counts);
    setLoading(false);
  }

  async function reloadAndInvalidate() {
    invalidateMenuCache();
    await load(true);
  }

  useEffect(() => {
    void load();
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
    await reloadAndInvalidate();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const orderedNodes = items.map(({ node }) => node);
    const result = resolveSiblingReorder(orderedNodes, String(active.id), String(over.id));
    if (!result) {
      toast.info("Solo puedes reordenar ítems dentro del mismo nivel");
      return;
    }

    setRows((prev) => applySiblingOrder(prev, result.reorderedSiblings, "display_order"));
    const results = await Promise.all(
      result.reorderedSiblings.map((item, idx) =>
        supabase.from("menu_items").update({ display_order: idx }).eq("id", item.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("No se pudo reordenar el menú", { description: failed.error.message });
      await load(true);
      return;
    }
    toast.success("Orden del menú actualizado");
    await reloadAndInvalidate();
  }

  async function remove(row: Row) {
    const kids = descendants(row.id);
    const msg = kids.length
      ? `“${row.label}” tiene ${kids.length} subítem(s). Si continúas, también se eliminarán todos sus hijos. ¿Eliminar de todas formas?`
      : `¿Eliminar “${row.label}” del menú?`;
    if (!confirm(msg)) return;
    setBusy(row.id);
    const { error } = await supabase.from("menu_items").delete().in("id", [...kids, row.id]);
    setBusy(null);
    if (error) return alert(error.message);
    await reloadAndInvalidate();
  }

  /** Crea/completa la rama del menú a partir del árbol de categorías, sin tocar los ítems manuales. */
  async function generateFromCatalog() {
    if (
      !confirm(
        "Se añadirán al menú las categorías que aún no estén enlazadas (no se borra ni se modifica nada de lo que ya creaste). ¿Continuar?",
      )
    )
      return;
    setGenerating(true);
    try {
      const existing = new Set(rows.map((r) => r.category_id).filter(Boolean) as string[]);
      const nodes = flattenCategoryTree(buildCategoryTree(categories.filter((c) => c.is_active)));
      /** category_id → menu_item id, para colgar las hijas del padre correcto. */
      const menuByCategory = new Map<string, string>();
      rows.forEach((r) => r.category_id && menuByCategory.set(r.category_id, r.id));
      let created = 0;
      for (const { category } of nodes) {
        if (existing.has(category.id)) continue;
        const parentMenuId = category.parent_id ? (menuByCategory.get(category.parent_id) ?? null) : null;
        const siblings = rows.filter((r) => (r.parent_id ?? null) === parentMenuId);
        const { data, error } = await supabase
          .from("menu_items")
          .insert({
            label: category.name,
            slug: slugify(`${category.slug}`),
            parent_id: parentMenuId,
            target_kind: "category",
            category_id: category.id,
            display_order: siblings.length + created + 1,
            is_active: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        menuByCategory.set(category.id, data.id);
        created++;
      }
      alert(created ? `Se añadieron ${created} ítem(s) al menú.` : "El menú ya cubre todas las categorías.");
      await reloadAndInvalidate();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Menú de navegación</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} ítem{rows.length === 1 ? "" : "s"}. Cada ítem apunta a algo real del
            catálogo, así que los enlaces nunca se rompen.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateFromCatalog}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generar desde catálogo
          </button>
          <button
            onClick={() => setEditing({ ...empty })}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Añadir ítem
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Aún no hay ítems. Haz clic en <b>Añadir ítem</b> o en <b>Generar desde catálogo</b>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-3"></th>
                    <th className="px-4 py-3">Ítem</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Enlace final</th>
                    <th className="px-4 py-3">Visible</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <SortableContext
                  items={items.map(({ node }) => node.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {items.map(({ node, depth }) => {
                      const href = menuHref(node);
                      const emptyBranch =
                        node.target_kind === "category" &&
                        node.category_id &&
                        !hasProductsInBranch(node.category_id, categories, productCounts);
                      return (
                        <SortableMenuRow
                          key={node.id}
                          node={node}
                          depth={depth}
                          href={href}
                          emptyBranch={Boolean(emptyBranch)}
                          busy={busy === node.id}
                          onToggleActive={() => toggleActive(node)}
                          onEdit={() => setEditing(node)}
                          onRemove={() => remove(node)}
                        />
                      );
                    })}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        )}
      </div>

      {editing && (
        <MenuModal
          item={editing}
          items={items}
          categories={categories}
          brands={brands}
          attributes={attributes}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reloadAndInvalidate();
          }}
        />
      )}
    </>
  );
}

function SortableMenuRow({
  node,
  depth,
  href,
  emptyBranch,
  busy,
  onToggleActive,
  onEdit,
  onRemove,
}: {
  node: Node;
  depth: number;
  href: string | null;
  emptyBranch: boolean;
  busy: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-t border-border bg-card">
      <td className="px-3 py-3 text-center">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Arrastrar ítem ${node.label}`}
          className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 18}px` }}>
          {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className={depth === 0 ? "font-bold" : "font-semibold"}>{node.label}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        {menuTargetLabel(node)}
        {emptyBranch && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <AlertTriangle className="h-3 w-3" /> sin productos
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{href ?? "— grupo —"}</td>
      <td className="px-4 py-3">
        <button
          onClick={onToggleActive}
          disabled={busy}
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
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <button
          onClick={onEdit}
          className="mr-2 inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/70"
        >
          <Pencil className="h-3 w-3" /> Editar
        </button>
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-3 w-3" /> Borrar
        </button>
      </td>
    </tr>
  );
}

function hasProductsInBranch(
  categoryId: string,
  categories: Category[],
  counts: Record<string, number>,
): boolean {
  const walk = (id: string, depth = 0): number => {
    if (depth > 20) return 0;
    return (
      (counts[id] ?? 0) +
      categories.filter((c) => c.parent_id === id).reduce((sum, c) => sum + walk(c.id, depth + 1), 0)
    );
  };
  return walk(categoryId) > 0;
}

function MenuModal({
  item,
  items,
  categories,
  brands,
  attributes,
  onClose,
  onSaved,
}: {
  item: Partial<Row>;
  items: { node: Node; depth: number }[];
  categories: Category[];
  brands: Brand[];
  attributes: Attribute[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Row>>({ target_kind: "group", ...item });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Row>(k: K, v: Row[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // No permitir elegir como padre a sí mismo ni a un descendiente (evita ciclos).
  const blocked = new Set<string>();
  if (form.id) {
    const collect = (id: string) => {
      blocked.add(id);
      items.filter(({ node }) => node.parent_id === id).forEach(({ node }) => collect(node.id));
    };
    collect(form.id);
  }
  const parentOptions = items.filter(({ node }) => !blocked.has(node.id));
  const categoryOptions = useMemo(
    () => flattenCategoryTree(buildCategoryTree(categories)),
    [categories],
  );
  const kind = (form.target_kind ?? "group") as MenuTargetKind;
  const attributeValueOptions = attributes.flatMap((a) =>
    a.values.map((v) => ({ id: v.id, label: `${a.name}: ${v.label}` })),
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        label: (form.label ?? "").trim(),
        slug: (form.slug || slugify(form.label || "")).slice(0, 80),
        parent_id: form.parent_id || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active ?? true,
        target_kind: kind,
        category_id: kind === "category" || kind === "category_brand" || kind === "attribute" ? form.category_id || null : null,
        brand_id: kind === "category_brand" ? form.brand_id || null : null,
        attribute_value_id: kind === "attribute" ? form.attribute_value_id || null : null,
        service_anchor: kind === "service" ? form.service_anchor || null : null,
        site_page: kind === "page" ? form.site_page || null : null,
        custom_url: kind === "url" ? form.custom_url?.trim() || null : null,
        // el formato antiguo queda limpio una vez migrado el ítem
        link_type: null,
        link_value: null,
      };
      if (!payload.label) throw new Error("El texto del ítem es obligatorio");
      if (!payload.slug) throw new Error("El slug es obligatorio");
      if (kind === "category" && !payload.category_id)
        throw new Error("Elige la categoría a la que apunta este ítem");
      if (kind === "category_brand" && !payload.brand_id) throw new Error("Elige la marca");
      if (kind === "attribute" && !payload.attribute_value_id)
        throw new Error("Elige el atributo y su opción");
      if (kind === "service" && !payload.service_anchor) throw new Error("Elige el servicio");
      if (kind === "page" && !payload.site_page) throw new Error("Elige la página");
      if (kind === "url" && !payload.custom_url) throw new Error("Escribe la URL");

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

  const preview = menuHref({
    ...(form as MenuItemRow),
    category: categories.find((c) => c.id === form.category_id)
      ? {
          slug: categories.find((c) => c.id === form.category_id)!.slug,
          name: categories.find((c) => c.id === form.category_id)!.name,
        }
      : null,
    brand: brands.find((b) => b.id === form.brand_id)
      ? {
          slug: brands.find((b) => b.id === form.brand_id)!.slug,
          name: brands.find((b) => b.id === form.brand_id)!.name,
        }
      : null,
    value: (() => {
      for (const a of attributes) {
        const v = a.values.find((x) => x.id === form.attribute_value_id);
        if (v) return { slug: v.slug, label: v.label, attribute: { slug: a.slug, name: a.name } };
      }
      return null;
    })(),
  });

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
                  {node.label} (nivel {depth + 1})
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
        </div>

        <Field label="¿A dónde lleva este ítem?" required>
          <select
            value={kind}
            onChange={(e) => set("target_kind", e.target.value)}
            className={inputCls}
          >
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        {(kind === "category" || kind === "category_brand" || kind === "attribute") && (
          <Field label={kind === "attribute" ? "Categoría (opcional)" : "Categoría"} required={kind !== "attribute"}>
            <select
              value={form.category_id ?? ""}
              onChange={(e) => set("category_id", e.target.value || null)}
              className={inputCls}
            >
              <option value="">— {kind === "attribute" ? "Todo el catálogo" : "Selecciona"} —</option>
              {categoryOptions.map(({ category: c, depth }) => (
                <option key={c.id} value={c.id}>
                  {"— ".repeat(depth)}
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {kind === "category_brand" && (
          <Field label="Marca" required>
            <select
              value={form.brand_id ?? ""}
              onChange={(e) => set("brand_id", e.target.value || null)}
              className={inputCls}
            >
              <option value="">— Selecciona —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {kind === "attribute" && (
          <Field label="Atributo y opción" required>
            <select
              value={form.attribute_value_id ?? ""}
              onChange={(e) => set("attribute_value_id", e.target.value || null)}
              className={inputCls}
            >
              <option value="">— Selecciona —</option>
              {attributeValueOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {kind === "service" && (
          <Field label="Servicio" required>
            <select
              value={form.service_anchor ?? ""}
              onChange={(e) => set("service_anchor", e.target.value || null)}
              className={inputCls}
            >
              <option value="">— Selecciona —</option>
              {SERVICE_ANCHORS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {kind === "page" && (
          <Field label="Página del sitio" required>
            <select
              value={form.site_page ?? ""}
              onChange={(e) => set("site_page", e.target.value || null)}
              className={inputCls}
            >
              <option value="">— Selecciona —</option>
              {SITE_PAGES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {kind === "url" && (
          <Field label="URL" required>
            <input
              value={form.custom_url ?? ""}
              onChange={(e) => set("custom_url", e.target.value)}
              className={inputCls}
              placeholder="https://… o /galeria"
            />
          </Field>
        )}

        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          Enlace final: <span className="font-mono">{preview ?? "— grupo, no navega —"}</span>
        </p>

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
