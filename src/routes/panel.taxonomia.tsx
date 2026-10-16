import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  CornerDownRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  buildCategoryTree,
  flattenCategoryTree,
  slugify,
  type Attribute,
  type AttributeValue,
  type Brand,
  type Category,
  type CategoryAttribute,
} from "@/lib/catalog";

export const Route = createFileRoute("/panel/taxonomia")({
  ssr: false,
  component: TaxonomiaAdmin,
});

type Tab = "categorias" | "marcas" | "atributos";

function TaxonomiaAdmin() {
  const [tab, setTab] = useState<Tab>("categorias");
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [catAttrs, setCatAttrs] = useState<CategoryAttribute[]>([]);
  const [counts, setCounts] = useState<{ cat: Record<string, number>; brand: Record<string, number> }>({
    cat: {},
    brand: {},
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [c, b, a, ca, p] = await Promise.all([
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
      supabase.from("category_attributes").select("id,category_id,attribute_id,is_required,sort_order"),
      supabase.from("products").select("category_id,brand_id"),
    ]);
    setCategories((c.data as Category[]) ?? []);
    setBrands((b.data as Brand[]) ?? []);
    setAttributes(
      ((a.data as any[]) ?? []).map((x) => ({
        ...x,
        values: (x.values ?? []).sort((m: AttributeValue, n: AttributeValue) => m.sort_order - n.sort_order),
      })) as Attribute[],
    );
    setCatAttrs((ca.data as CategoryAttribute[]) ?? []);
    const cat: Record<string, number> = {};
    const brand: Record<string, number> = {};
    ((p.data as any[]) ?? []).forEach((r) => {
      if (r.category_id) cat[r.category_id] = (cat[r.category_id] ?? 0) + 1;
      if (r.brand_id) brand[r.brand_id] = (brand[r.brand_id] ?? 0) + 1;
    });
    setCounts({ cat, brand });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "categorias", label: "Categorías" },
    { id: "marcas", label: "Marcas" },
    { id: "atributos", label: "Atributos" },
  ];

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">Categorías y marcas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta es la única fuente de verdad del catálogo: lo que creas aquí aparece al subir
          productos, en los filtros de la tienda y como destino del menú de navegación.
        </p>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === t.id ? "bg-[var(--brand-wine)] text-white" : "bg-muted hover:bg-muted/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : tab === "categorias" ? (
        <CategoriesTab
          categories={categories}
          attributes={attributes}
          catAttrs={catAttrs}
          counts={counts.cat}
          reload={load}
        />
      ) : tab === "marcas" ? (
        <BrandsTab brands={brands} counts={counts.brand} reload={load} />
      ) : (
        <AttributesTab attributes={attributes} reload={load} />
      )}
    </>
  );
}

/* ------------------------------ Categorías ------------------------------ */

function CategoriesTab({
  categories,
  attributes,
  catAttrs,
  counts,
  reload,
}: {
  categories: Category[];
  attributes: Attribute[];
  catAttrs: CategoryAttribute[];
  counts: Record<string, number>;
  reload: () => void;
}) {
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const items = useMemo(() => flattenCategoryTree(buildCategoryTree(categories)), [categories]);

  function descendants(id: string): string[] {
    const kids = categories.filter((c) => c.parent_id === id);
    return kids.flatMap((k) => [k.id, ...descendants(k.id)]);
  }

  async function toggleActive(c: Category) {
    setBusy(c.id);
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    setBusy(null);
    if (error) return alert(error.message);
    reload();
  }

  async function move(c: Category, dir: -1 | 1) {
    const siblings = categories
      .filter((x) => (x.parent_id ?? null) === (c.parent_id ?? null))
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex((s) => s.id === c.id);
    const target = siblings[idx + dir];
    if (!target) return;
    setBusy(c.id);
    await supabase.from("categories").update({ sort_order: target.sort_order }).eq("id", c.id);
    await supabase.from("categories").update({ sort_order: c.sort_order }).eq("id", target.id);
    setBusy(null);
    reload();
  }

  async function remove(c: Category) {
    const kids = descendants(c.id);
    const used = counts[c.id] ?? 0;
    if (used > 0) {
      alert(
        `“${c.name}” tiene ${used} producto(s) asignado(s). Mueve esos productos a otra categoría antes de borrarla.`,
      );
      return;
    }
    const msg = kids.length
      ? `“${c.name}” tiene ${kids.length} subcategoría(s). Se borrarán también. ¿Continuar?`
      : `¿Eliminar la categoría “${c.name}”?`;
    if (!confirm(msg)) return;
    setBusy(c.id);
    const { error } = await supabase.from("categories").delete().in("id", [...kids, c.id]);
    setBusy(null);
    if (error) return alert(error.message);
    reload();
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setEditing({ name: "", slug: "", parent_id: null, sort_order: 0, is_active: true })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Añadir categoría
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Atributos</th>
                <th className="px-4 py-3 text-right">Productos</th>
                <th className="px-4 py-3">Visible</th>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ category: c, depth }) => {
                const attrNames = catAttrs
                  .filter((ca) => ca.category_id === c.id)
                  .map((ca) => attributes.find((a) => a.id === ca.attribute_id)?.name)
                  .filter(Boolean);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 18}px` }}>
                        {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className={depth === 0 ? "font-bold" : "font-semibold"}>{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.slug}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {attrNames.length ? attrNames.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">{counts[c.id] ?? 0}</td>
                    <td className="px-4 py-3">
                      <Switch on={c.is_active} disabled={busy === c.id} onClick={() => toggleActive(c)} label={c.name} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <IconBtn label="Subir" onClick={() => move(c, -1)}>
                          <ChevronUp className="h-3 w-3" />
                        </IconBtn>
                        <IconBtn label="Bajar" onClick={() => move(c, 1)}>
                          <ChevronDown className="h-3 w-3" />
                        </IconBtn>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setEditing(c)}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/70"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      <button
                        onClick={() => remove(c)}
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
      </div>

      {editing && (
        <CategoryModal
          category={editing}
          categories={categories}
          attributes={attributes}
          catAttrs={catAttrs}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function CategoryModal({
  category,
  categories,
  attributes,
  catAttrs,
  onClose,
  onSaved,
}: {
  category: Partial<Category>;
  categories: Category[];
  attributes: Attribute[];
  catAttrs: CategoryAttribute[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Category>>(category);
  const [selected, setSelected] = useState<string[]>(
    catAttrs.filter((ca) => ca.category_id === category.id).map((ca) => ca.attribute_id),
  );
  const [saving, setSaving] = useState(false);

  const blocked = new Set<string>();
  if (form.id) {
    const collect = (id: string) => {
      blocked.add(id);
      categories.filter((c) => c.parent_id === id).forEach((c) => collect(c.id));
    };
    collect(form.id);
  }
  const parents = flattenCategoryTree(buildCategoryTree(categories)).filter(
    ({ category: c }) => !blocked.has(c.id),
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: (form.name ?? "").trim(),
        slug: (form.slug || slugify(form.name ?? "")).slice(0, 80),
        parent_id: form.parent_id || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active ?? true,
        image_url: form.image_url?.trim() || null,
      };
      if (!payload.name) throw new Error("El nombre es obligatorio");
      if (!payload.slug) throw new Error("El slug es obligatorio");
      let id = form.id;
      if (id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("categories").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      // sincronizar atributos aplicables
      const current = catAttrs.filter((ca) => ca.category_id === id).map((ca) => ca.attribute_id);
      const toAdd = selected.filter((a) => !current.includes(a));
      const toRemove = current.filter((a) => !selected.includes(a));
      if (toAdd.length)
        await supabase
          .from("category_attributes")
          .insert(toAdd.map((attribute_id) => ({ category_id: id!, attribute_id })));
      if (toRemove.length)
        await supabase
          .from("category_attributes")
          .delete()
          .eq("category_id", id!)
          .in("attribute_id", toRemove);
      onSaved();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={form.id ? "Editar categoría" : "Nueva categoría"} onClose={onClose} onSubmit={save} saving={saving}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required>
          <input
            required
            value={form.name ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                name: e.target.value,
                slug: f.id ? f.slug : slugify(e.target.value),
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Slug">
          <input
            value={form.slug ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            className={inputCls}
          />
        </Field>
        <Field label="Categoría padre">
          <select
            value={form.parent_id ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value || null }))}
            className={inputCls}
          >
            <option value="">— Ninguna (nivel principal) —</option>
            {parents.map(({ category: c, depth }) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(depth)}
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Orden">
          <input
            type="number"
            value={form.sort_order ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Atributos que aplican a esta categoría">
        <div className="mt-1 flex flex-wrap gap-2">
          {attributes.map((a) => {
            const on = selected.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id]))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  on ? "bg-[var(--brand-teal-deep)] text-white" : "bg-muted hover:bg-muted/70"
                }`}
              >
                {a.name}
              </button>
            );
          })}
          {attributes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aún no hay atributos. Créalos en la pestaña “Atributos”.
            </p>
          )}
        </div>
      </Field>
      <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={form.is_active ?? true}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="h-4 w-4"
        />
        Visible en la tienda y en el menú
      </label>
    </Modal>
  );
}

/* -------------------------------- Marcas -------------------------------- */

function BrandsTab({
  brands,
  counts,
  reload,
}: {
  brands: Brand[];
  counts: Record<string, number>;
  reload: () => void;
}) {
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);

  async function remove(b: Brand) {
    if ((counts[b.id] ?? 0) > 0) {
      alert(`“${b.name}” tiene ${counts[b.id]} producto(s). Reasigna esos productos antes de borrarla.`);
      return;
    }
    if (!confirm(`¿Eliminar la marca “${b.name}”?`)) return;
    const { error } = await supabase.from("brands").delete().eq("id", b.id);
    if (error) return alert(error.message);
    reload();
  }

  async function toggle(b: Brand) {
    const { error } = await supabase.from("brands").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) return alert(error.message);
    reload();
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setEditing({ name: "", slug: "", is_active: true, sort_order: 0 })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Añadir marca
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Logo</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3 text-right">Productos</th>
              <th className="px-4 py-3">Visible</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-4 py-3">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-muted" />
                  )}
                </td>
                <td className="px-4 py-3 font-semibold">{b.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{b.slug ?? "—"}</td>
                <td className="px-4 py-3 text-right">{counts[b.id] ?? 0}</td>
                <td className="px-4 py-3">
                  <Switch on={b.is_active} onClick={() => toggle(b)} label={b.name} />
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditing(b)}
                    className="mr-2 inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/70"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button
                    onClick={() => remove(b)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3 w-3" /> Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <BrandModal
          brand={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function BrandModal({
  brand,
  onClose,
  onSaved,
}: {
  brand: Partial<Brand>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Brand>>(brand);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const path = `marcas/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("product-images").upload(path, file);
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, logo_url: signed.data.signedUrl }));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: (form.name ?? "").trim(),
        slug: (form.slug || slugify(form.name ?? "")).slice(0, 80),
        logo_url: form.logo_url?.trim() || null,
        is_active: form.is_active ?? true,
        sort_order: Number(form.sort_order) || 0,
      };
      if (!payload.name) throw new Error("El nombre es obligatorio");
      const q = form.id
        ? supabase.from("brands").update(payload).eq("id", form.id)
        : supabase.from("brands").insert(payload);
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
    <Modal title={form.id ? "Editar marca" : "Nueva marca"} onClose={onClose} onSubmit={save} saving={saving}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required>
          <input
            required
            value={form.name ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value, slug: f.id ? f.slug : slugify(e.target.value) }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Slug">
          <input
            value={form.slug ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            className={inputCls}
          />
        </Field>
        <Field label="Orden">
          <input
            type="number"
            value={form.sort_order ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
            className={inputCls}
          />
        </Field>
        <Field label="Logo">
          <div className="mt-1 flex items-center gap-3">
            {form.logo_url && (
              <img src={form.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              className="text-xs"
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={form.is_active ?? true}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="h-4 w-4"
        />
        Visible en filtros y menú
      </label>
    </Modal>
  );
}

/* ------------------------------ Atributos ------------------------------ */

function AttributesTab({ attributes, reload }: { attributes: Attribute[]; reload: () => void }) {
  const [editing, setEditing] = useState<Partial<Attribute> | null>(null);

  async function remove(a: Attribute) {
    if (!confirm(`¿Eliminar el atributo “${a.name}” y todas sus opciones?`)) return;
    const { error } = await supabase.from("attributes").delete().eq("id", a.id);
    if (error) return alert(error.message);
    reload();
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setEditing({ name: "", slug: "", is_filterable: true, sort_order: 0, values: [] })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Añadir atributo
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {attributes.map((a) => (
          <div key={a.id} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{a.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {a.slug} · {a.is_filterable ? "filtrable en la tienda" : "solo informativo"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(a)}
                  className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/70"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => remove(a)}
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.values.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold"
                >
                  {v.color_hex && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
                      style={{ background: v.color_hex }}
                    />
                  )}
                  {v.label}
                </span>
              ))}
              {a.values.length === 0 && <span className="text-xs text-muted-foreground">Sin opciones</span>}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <AttributeModal
          attribute={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

type DraftValue = { id?: string; slug: string; label: string; color_hex: string | null; image_url?: string | null };

function AttributeModal({
  attribute,
  onClose,
  onSaved,
}: {
  attribute: Partial<Attribute>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Attribute>>(attribute);
  const [values, setValues] = useState<DraftValue[]>(
    (attribute.values ?? []).map((v) => ({
      id: v.id,
      slug: v.slug,
      label: v.label,
      color_hex: v.color_hex,
      image_url: v.image_url,
    })),
  );
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: (form.name ?? "").trim(),
        slug: (form.slug || slugify(form.name ?? "")).slice(0, 60),
        input_type: form.input_type || "select",
        is_filterable: form.is_filterable ?? true,
        sort_order: Number(form.sort_order) || 0,
      };
      if (!payload.name) throw new Error("El nombre es obligatorio");
      let id = form.id;
      if (id) {
        const { error } = await supabase.from("attributes").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("attributes").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const clean = values.filter((v) => v.label.trim());
      const keep = clean.filter((v) => v.id).map((v) => v.id!);
      const existing = (attribute.values ?? []).map((v) => v.id);
      const toRemove = existing.filter((x) => !keep.includes(x));
      if (toRemove.length) await supabase.from("attribute_values").delete().in("id", toRemove);
      for (const [i, v] of clean.entries()) {
        const row = {
          attribute_id: id!,
          slug: v.slug || slugify(v.label),
          label: v.label.trim(),
          color_hex: v.color_hex?.trim() || null,
          image_url: v.image_url?.trim() || null,
          sort_order: i,
        };
        const q = v.id
          ? supabase.from("attribute_values").update(row).eq("id", v.id)
          : supabase.from("attribute_values").insert(row);
        const { error } = await q;
        if (error) throw error;
      }
      onSaved();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={form.id ? "Editar atributo" : "Nuevo atributo"}
      onClose={onClose}
      onSubmit={save}
      saving={saving}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required>
          <input
            required
            value={form.name ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value, slug: f.id ? f.slug : slugify(e.target.value) }))
            }
            className={inputCls}
            placeholder="Color"
          />
        </Field>
        <Field label="Slug">
          <input
            value={form.slug ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            className={inputCls}
          />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={form.is_filterable ?? true}
          onChange={(e) => setForm((f) => ({ ...f, is_filterable: e.target.checked }))}
          className="h-4 w-4"
        />
        Mostrar como filtro en la tienda
      </label>

      <Field label="Opciones">
        <div className="grid gap-3">
          {values.map((v, i) => (
            <div key={i} className="rounded-2xl border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={v.label}
                  onChange={(e) =>
                    setValues((list) =>
                      list.map((x, j) =>
                        j === i
                          ? { ...x, label: e.target.value, slug: x.id ? x.slug : slugify(e.target.value) }
                          : x,
                      ),
                    )
                  }
                  placeholder="Etiqueta (ej. Máquina Cerrada, Rainbow)"
                  className={inputCls}
                />
                <input
                  type="color"
                  value={v.color_hex ?? "#cccccc"}
                  onChange={(e) =>
                    setValues((list) => list.map((x, j) => (j === i ? { ...x, color_hex: e.target.value } : x)))
                  }
                  className="mt-1 h-9 w-12 rounded-lg border border-input shrink-0"
                  aria-label="Color opcional"
                  title="Color hexadecimal"
                />
                <button
                  type="button"
                  onClick={() => setValues((list) => list.filter((_, j) => j !== i))}
                  className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 shrink-0"
                >
                  Quitar
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <input
                  value={v.image_url || ""}
                  onChange={(e) =>
                    setValues((list) =>
                      list.map((x, j) => (j === i ? { ...x, image_url: e.target.value } : x)),
                    )
                  }
                  placeholder="URL Imagen / GIF / Video opcional (ej. https://.../closed_printer.gif)"
                  className={inputCls}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setValues((l) => [...l, { slug: "", label: "", color_hex: null, image_url: null }])}
            className="justify-self-start rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            + Añadir opción
          </button>
        </div>
      </Field>
    </Modal>
  );
}

/* ------------------------------- UI base ------------------------------- */

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

function Switch({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      aria-label={`Mostrar ${label}`}
      className={`relative h-6 w-11 rounded-full transition ${
        on ? "bg-[var(--brand-teal-deep)]" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="rounded-lg bg-muted p-1.5 hover:bg-muted/70"
      type="button"
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  onClose,
  onSubmit,
  saving,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <form onSubmit={onSubmit} className="my-8 w-full max-w-xl rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
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
