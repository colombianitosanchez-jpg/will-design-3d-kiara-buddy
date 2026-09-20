import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, X, Upload, Search } from "lucide-react";

export const Route = createFileRoute("/admin/inventario")({
  ssr: false,
  component: InventarioAdmin,
});

type Category = { id: string; name: string; slug: string };
type Brand = { id: string; name: string };
type Product = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  price_cop: number;
  category_id: string | null;
  brand_id: string | null;
  short: string;
  description: string;
  kiara_tip: string;
  image_url: string | null;
  featured: boolean;
  active: boolean;
  stock: number;
};

const empty: Omit<Product, "id"> = {
  slug: "",
  name: "",
  sku: "",
  price_cop: 0,
  category_id: null,
  brand_id: null,
  short: "",
  description: "",
  kiara_tip: "",
  image_url: null,
  featured: false,
  active: true,
  stock: 0,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatCOP(n: number) {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function InventarioAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");

  async function load() {
    setLoading(true);
    const [p, c, b] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name,slug").order("sort_order"),
      supabase.from("brands").select("id,name").order("name"),
    ]);
    setProducts((p.data as Product[]) ?? []);
    setCategories((c.data as Category[]) ?? []);
    setBrands((b.data as Brand[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter && p.category_id !== catFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.short ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, catFilter]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} producto{products.length === 1 ? "" : "s"} · {filtered.length}{" "}
            visibles
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Añadir producto
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o SKU…"
            className="w-full rounded-full border border-input bg-card px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-full border border-input bg-card px-4 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {products.length === 0 ? (
              <>
                Aún no hay productos. Haz clic en <b>Añadir producto</b>.
              </>
            ) : (
              "Sin resultados para tu búsqueda."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Imagen</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const cat = categories.find((c) => c.id === p.category_id)?.name ?? "—";
                  const br = brands.find((b) => b.id === p.brand_id)?.name ?? "—";
                  const low = p.stock <= 3;
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {p.sku || "—"}
                      </td>
                      <td className="px-4 py-3">{cat}</td>
                      <td className="px-4 py-3">{br}</td>
                      <td className="px-4 py-3 text-right">{formatCOP(p.price_cop)}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${low ? "text-red-600" : ""}`}
                      >
                        {p.stock}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            p.active
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.active ? "Activo" : "Oculto"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditing(p)}
                          className="mr-2 inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/70"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                        <button
                          onClick={() => remove(p.id)}
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
        <ProductModal
          product={editing}
          categories={categories}
          brands={brands}
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

function ProductModal({
  product,
  categories,
  brands,
  onClose,
  onSaved,
}: {
  product: Partial<Product>;
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>(product);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      set("image_url", signed.data.signedUrl);
    } catch (e) {
      alert("Error al subir la imagen: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        slug: (form.slug || slugify(form.name || "")).slice(0, 80),
        name: form.name ?? "",
        sku: (form.sku ?? "").trim() || null,
        price_cop: Number(form.price_cop) || 0,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        short: form.short ?? "",
        description: form.description ?? "",
        kiara_tip: form.kiara_tip ?? "",
        image_url: form.image_url ?? null,
        featured: !!form.featured,
        active: form.active ?? true,
        stock: Number(form.stock) || 0,
      };
      if (!payload.name || !payload.slug) throw new Error("Nombre y slug son obligatorios");

      const q = form.id
        ? supabase.from("products").update(payload).eq("id", form.id)
        : supabase.from("products").insert(payload);
      const { error } = await q;
      if (error) throw error;
      onSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <form
        onSubmit={save}
        className="my-8 w-full max-w-2xl rounded-3xl bg-background p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">{form.id ? "Editar producto" : "Nuevo producto"}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Field label="Imagen del producto">
          <div className="flex items-center gap-4">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-muted" />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
              <Upload className="h-4 w-4" />
              {uploading ? "Subiendo…" : "Subir imagen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              />
            </label>
            {form.image_url && (
              <button
                type="button"
                onClick={() => set("image_url", null)}
                className="text-xs text-muted-foreground underline"
              >
                Quitar
              </button>
            )}
          </div>
        </Field>

        <div className="mt-1 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required>
            <input
              required
              value={form.name ?? ""}
              onChange={(e) => {
                set("name", e.target.value);
                if (!form.id && !form.slug) set("slug", slugify(e.target.value));
              }}
              className={inputCls}
            />
          </Field>
          <Field label="SKU (código único)">
            <input
              value={form.sku ?? ""}
              onChange={(e) => set("sku", e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="Ej: FIL-PLA-001"
            />
          </Field>
          <Field label="Precio (COP)" required>
            <input
              type="number"
              min={0}
              required
              value={form.price_cop ?? 0}
              onChange={(e) => set("price_cop", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Cantidad en Stock">
            <input
              type="number"
              min={0}
              value={form.stock ?? 0}
              onChange={(e) => set("stock", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Categoría">
            <select
              value={form.category_id ?? ""}
              onChange={(e) => set("category_id", e.target.value || null)}
              className={inputCls}
            >
              <option value="">— Selecciona —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marca">
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
          <Field label="Slug (URL)">
            <input
              value={form.slug ?? ""}
              onChange={(e) => set("slug", slugify(e.target.value))}
              className={inputCls}
              placeholder="mi-producto"
            />
          </Field>
        </div>

        <Field label="Descripción corta">
          <textarea
            rows={2}
            value={form.short ?? ""}
            onChange={(e) => set("short", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Descripción completa">
          <textarea
            rows={4}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Consejo de Kiara 🐾">
          <input
            value={form.kiara_tip ?? ""}
            onChange={(e) => set("kiara_tip", e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="mt-4 flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.featured}
              onChange={(e) => set("featured", e.target.checked)}
            />
            Destacado en home
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active ?? true}
              onChange={(e) => set("active", e.target.checked)}
            />
            Visible en tienda
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            className="rounded-full bg-[var(--brand-wine)] px-6 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar producto"}
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
