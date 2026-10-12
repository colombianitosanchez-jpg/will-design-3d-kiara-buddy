import { ProductMedia } from "@/components/ProductMedia";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, X, Search } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VariantsEditor } from "@/components/VariantsEditor";
import { PaymentMethodsPicker } from "@/components/PaymentMethodsPicker";
import { normalizeMethodIds } from "@/lib/payment-rules";
import { ProductButtonsEditor } from "@/components/ProductButtonsEditor";
import { getMatchingVariants, parseVariants, validateVariants, type ProductVariant } from "@/lib/product-variants";

import {
  ACTION_LABELS,
  BUTTON_ACTIONS,
  BUTTON_POSITIONS,
  BUTTON_VARIANTS,
  BUTTON_WIDTHS,
  POSITION_LABELS,
  VARIANT_LABELS,
  WIDTH_LABELS,
  newProductButton,
  parseProductButtons,
  validateProductButtons,
  type ProductButton,
} from "@/lib/product-buttons";
import {
  buildCategoryTree,
  categoryPath,
  flattenCategoryTree,
  normalizeText,
  slugify as slugifyValue,
  type Attribute,
  type Brand,
  type Category,
  type CategoryAttribute,
} from "@/lib/catalog";

export const Route = createFileRoute("/panel/productos")({
  ssr: false,
  component: ProductosAdmin,
});

type ProductAttrRow = { product_id: string; attribute_id: string; attribute_value_id: string | null };

type Product = {
  id: string;
  slug: string;
  name: string;
  price_cop: number;
  btn_text: string;
  show_whatsapp: boolean;
  hide_default_cta: boolean;
  accepts_3d_file: boolean;
  quote_only: boolean;
  custom_share_text: string | null;
  custom_buttons: ProductButton[];
  category_id: string | null;
  brand_id: string | null;
  short: string;
  description: string;
  kiara_tip: string;
  image_url: string | null;
  images: string[];
  specs: { label: string; value: string }[];
  sku: string | null;
  featured: boolean;
  active: boolean;
  stock: number;
  variants: ProductVariant[];
  variant_label: string;
  allowed_payment_method_ids: string[];
};

const empty: Omit<Product, "id"> = {
  slug: "",
  name: "",
  price_cop: 0,
  btn_text: "Ver más",
  show_whatsapp: false,
  hide_default_cta: false,
  accepts_3d_file: false,
  quote_only: false,
  custom_share_text: null,
  custom_buttons: [],
  category_id: null,
  brand_id: null,
  short: "",
  description: "",
  kiara_tip: "",
  image_url: null,
  images: [],
  specs: [],
  sku: null,
  featured: false,
  active: true,
  stock: 0,
  variants: [],
  variant_label: "Color",
  allowed_payment_method_ids: [],
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
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function ProductosAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [catAttrs, setCatAttrs] = useState<CategoryAttribute[]>([]);
  const [attrRows, setAttrRows] = useState<ProductAttrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [targetVariantId, setTargetVariantId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const scrollPosRef = useRef<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const visibleProducts = useMemo(() => {
    const q = search.trim();
    const normQ = q ? normalizeText(q) : "";

    return products.filter((p) => {
      if (normQ) {
        const prodName = normalizeText(p.name);
        const prodDesc = normalizeText(`${p.short ?? ""} ${p.description ?? ""}`);
        const variantMatch = (p.variants ?? []).some((v) => normalizeText(v.name).includes(normQ));
        const matchesQuery = prodName.includes(normQ) || prodDesc.includes(normQ) || variantMatch;
        if (!matchesQuery) return false;
      }

      if (selectedCategory !== "all" && p.category_id !== selectedCategory) {
        return false;
      }

      if (selectedStatus === "active" && !p.active) return false;
      if (selectedStatus === "inactive" && p.active) return false;
      if (selectedStatus === "in_stock" && p.stock <= 0) return false;
      if (selectedStatus === "out_of_stock" && p.stock > 0) return false;

      return true;
    });
  }, [products, search, selectedCategory, selectedStatus]);

  async function load(isBackground = false) {
    if (!isBackground) setLoading(true);
    const [p, c, b, a, ca, pav] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id,name,slug,sort_order,parent_id,is_active,image_url")
        .order("sort_order"),
      supabase.from("brands").select("id,name,slug,logo_url,is_active,sort_order").order("sort_order"),
      supabase
        .from("attributes")
        .select(
          "id,slug,name,input_type,is_filterable,sort_order,values:attribute_values(id,attribute_id,slug,label,color_hex,sort_order)",
        )
        .order("sort_order"),
      supabase.from("category_attributes").select("id,category_id,attribute_id,is_required,sort_order"),
      supabase.from("product_attribute_values").select("product_id,attribute_id,attribute_value_id"),
    ]);
    setProducts(
      ((p.data as Record<string, unknown>[]) ?? []).map((r) => ({
        ...r,
        images: Array.isArray(r.images) ? r.images : [],
        specs: Array.isArray(r.specs) ? r.specs : [],
        hide_default_cta: !!r.hide_default_cta,
        accepts_3d_file: !!r.accepts_3d_file,
        quote_only: !!r.quote_only,
        custom_share_text: typeof r.custom_share_text === "string" ? r.custom_share_text : null,
        custom_buttons: parseProductButtons(r.custom_buttons),
        variants: parseVariants(r.variants),
        variant_label: typeof r.variant_label === "string" && r.variant_label ? r.variant_label : "Color",
        allowed_payment_method_ids: normalizeMethodIds(r.allowed_payment_method_ids),
      })) as Product[],
    );
    setCategories((c.data as Category[]) ?? []);
    setBrands((b.data as Brand[]) ?? []);
    setAttributes((a.data as unknown as Attribute[]) ?? []);
    setCatAttrs((ca.data as CategoryAttribute[]) ?? []);
    setAttrRows((pav.data as ProductAttrRow[]) ?? []);
    setLoading(false);
  }

  function handleEditProduct(product: Product, varId?: string | null) {
    setEditing(product);
    setTargetVariantId(varId ?? null);
    setHighlightedId(product.id);
    setTimeout(() => {
      const el = document.getElementById(`product-row-${product.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTimeout(() => setHighlightedId(null), 2500);
    }, 50);
  }


  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return alert(error.message);
    load(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {visibleProducts.length} de {products.length} producto{products.length === 1 ? "" : "s"} en el catálogo.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Añadir producto
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, SKU, variante, descripción..."
            className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="cursor-pointer rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
        >
          <option value="all">Todas las categorías</option>
          {categories
            .filter((c) => c.is_active)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {categoryPath(c.slug, categories)}
              </option>
            ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="cursor-pointer rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Ocultos / Inactivos</option>
          <option value="in_stock">Con stock</option>
          <option value="out_of_stock">Agotados (stock 0)</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Aún no hay productos. Haz clic en <b>Añadir producto</b>.
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Ningún producto coincide con «{search}».
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Imagen</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((p) => {
                  const cat = p.category_id
                    ? (categoryPath(categories.find((c) => c.id === p.category_id)?.slug, categories) || "—")
                    : "—";
                  const br = brands.find((b) => b.id === p.brand_id)?.name ?? "—";
                  const matchedVars = search.trim() ? getMatchingVariants(p.variants, search) : [];
                  const primaryVar = matchedVars[0] ?? null;
                  const displayImageUrl = primaryVar?.image_url ?? p.image_url;

                  return (
                    <tr
                      id={`product-row-${p.id}`}
                      key={p.id}
                      className={`border-t border-border transition-all duration-500 ${
                        highlightedId === p.id
                          ? "bg-amber-500/10 ring-2 ring-[var(--brand-orange)] dark:bg-amber-500/20"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        {displayImageUrl ? (
                          <ProductMedia thumb src={displayImageUrl} className="h-12 w-12 rounded-lg object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <div>{p.name}</div>
                        {matchedVars.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {matchedVars.map((mv) => (
                              <button
                                key={mv.id}
                                type="button"
                                onClick={() => handleEditProduct(p, mv.id)}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-[var(--brand-orange)] hover:bg-amber-500/20"
                                title="Hacer clic para editar directamente esta variante"
                              >
                                Variante: {mv.name} · Editar
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{cat}</td>
                      <td className="px-4 py-3">{br}</td>
                      <td className="px-4 py-3 text-right">{formatCOP(primaryVar?.price_cop ?? p.price_cop)}</td>
                      <td className="px-4 py-3 text-right">{primaryVar?.stock ?? p.stock}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            p.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.active ? "Activo" : "Oculto"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEditProduct(p, primaryVar?.id)}
                          className="mr-2 inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/70"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                        <button
                          onClick={() => {
                            scrollPosRef.current = window.scrollY;
                            remove(p.id);
                          }}
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
          targetVariantId={targetVariantId}
          categories={categories}
          brands={brands}
          attributes={attributes}
          catAttrs={catAttrs}
          initialAttrs={Object.fromEntries(
            attrRows
              .filter((r) => r.product_id === editing.id && r.attribute_value_id)
              .map((r) => [r.attribute_id, r.attribute_value_id!]),
          )}
          onClose={() => {
            const savedScroll = scrollPosRef.current;
            setEditing(null);
            setTargetVariantId(null);
            window.scrollTo({ top: savedScroll });
          }}
          onSaved={async () => {
            setEditing(null);
            setTargetVariantId(null);
            load(true);
          }}
        />
      )}

    </>
  );
}

function ProductModal({
  product,
  targetVariantId,
  categories,
  brands,
  attributes,
  catAttrs,
  initialAttrs,
  onClose,
  onSaved,
}: {
  product: Partial<Product>;
  targetVariantId?: string | null;
  categories: Category[];
  brands: Brand[];
  attributes: Attribute[];
  catAttrs: CategoryAttribute[];
  initialAttrs: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>(product);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attrSel, setAttrSel] = useState<Record<string, string>>(initialAttrs);
  const [buttons, setButtons] = useState<ProductButton[]>(product.custom_buttons ?? []);

  function updateButton(index: number, patch: Partial<ProductButton>) {
    setButtons((list) => list.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function moveButton(index: number, dir: -1 | 1) {
    setButtons((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const categoryOptions = useMemo(
    () => flattenCategoryTree(buildCategoryTree(categories)),
    [categories],
  );

  /** Atributos de la categoría elegida y de sus categorías padre. */
  const applicableAttributes = useMemo(() => {
    if (!form.category_id) return [];
    const ids = new Set<string>();
    let cur = categories.find((c) => c.id === form.category_id) ?? null;
    let guard = 0;
    while (cur && guard++ < 20) {
      ids.add(cur.id);
      cur = cur.parent_id ? (categories.find((c) => c.id === cur!.parent_id) ?? null) : null;
    }
    const allowed = new Set(
      catAttrs.filter((ca) => ids.has(ca.category_id)).map((ca) => ca.attribute_id),
    );
    return attributes.filter((a) => allowed.has(a.id));
  }, [attributes, catAttrs, categories, form.category_id]);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function quickCreateCategory() {
    const name = prompt("Nombre de la nueva categoría o subcategoría:")?.trim();
    if (!name) return;
    const parentName = form.category_id
      ? categories.find((c) => c.id === form.category_id)?.name
      : null;
    const asChild =
      parentName && confirm(`¿Crear “${name}” como subcategoría de “${parentName}”?`) ? form.category_id : null;
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, slug: slugifyValue(name), parent_id: asChild })
      .select("id")
      .single();
    if (error) return alert(error.message);
    set("category_id", data.id);
    alert("Categoría creada. Se verá en toda la tienda al guardar el producto.");
  }

  async function quickCreateBrand() {
    const name = prompt("Nombre de la nueva marca:")?.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("brands")
      .insert({ name, slug: slugifyValue(name) })
      .select("id")
      .single();
    if (error) return alert(error.message);
    set("brand_id", data.id);
  }


  async function uploadToStorage(file: File): Promise<string> {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (up.error) throw up.error;
      // signed URL 10 years
      const signed = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      return signed.data.signedUrl;
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      set("image_url", await uploadToStorage(file));
    } catch (e) {
      alert("Error al subir la imagen: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadGallery(files: FileList) {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadToStorage(f));
      setForm((fm) => ({ ...fm, images: [...(fm.images ?? []), ...urls] }));
    } catch (e) {
      alert("Error al subir imágenes: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function setSpec(i: number, key: "label" | "value", v: string) {
    setForm((fm) => {
      const specs = [...(fm.specs ?? [])];
      specs[i] = { ...specs[i], [key]: v };
      return { ...fm, specs };
    });
  }

  /** Guarda en el servidor. Si faltan datos obligatorios, no guarda y muestra qué falta. */
  async function persist(snapshot: string) {
    setSaving(true);
    try {
      const payload = {
        slug: (form.slug || slugify(form.name || "")).slice(0, 80),
        name: form.name ?? "",
        price_cop: Number(form.price_cop) || 0,
        btn_text: form.btn_text?.trim() || "Ver más",
        show_whatsapp: !!form.show_whatsapp,
        hide_default_cta: !!form.hide_default_cta,
        accepts_3d_file: !!form.accepts_3d_file,
        quote_only: !!form.quote_only,
        custom_share_text: form.custom_share_text?.trim() ? form.custom_share_text.trim() : null,
        custom_buttons: buttons.map((b) => ({ ...b, text: b.text.trim(), action_value: b.action_value.trim() })),
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        short: form.short ?? "",
        description: form.description ?? "",
        kiara_tip: form.kiara_tip ?? "",
        image_url: form.image_url ?? null,
        images: (form.images ?? []).filter((u) => !!u),
        specs: (form.specs ?? []).filter((sp) => sp.label?.trim() || sp.value?.trim()),
        sku: form.sku?.trim() ? form.sku.trim() : null,
        featured: !!form.featured,
        active: form.active ?? true,
        stock: Number(form.stock) || 0,
        variant_label: form.variant_label?.trim() || "Color",
        variants: (form.variants ?? []).map((v) => ({ ...v, name: v.name.trim() })),
        allowed_payment_method_ids: form.allowed_payment_method_ids ?? [],
      };
      const problem =
        (!payload.name || !payload.slug ? "Escribe el nombre para guardar." : null) ??
        validateProductButtons(buttons) ??
        validateVariants(form.variants ?? []);
      setPending(problem);
      if (problem) return;

      let id = form.id;
      if (id) {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
        setForm((fm) => ({ ...fm, id }));
      }

      // Atributos del producto (Material, Color…): se reescriben en cada guardado.
      await supabase.from("product_attribute_values").delete().eq("product_id", id!);
      const rows = Object.entries(attrSel)
        .filter(([, valueId]) => !!valueId)
        .map(([attribute_id, attribute_value_id]) => ({
          product_id: id!,
          attribute_id,
          attribute_value_id,
        }));
      if (rows.length) {
        const { error } = await supabase.from("product_attribute_values").insert(rows);
        if (error) throw error;
      }
      lastSaved.current = snapshot;
      dirty.current = true;
    } catch (e) {
      toast.error("No pudimos guardar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // Guardado automático: cada cambio se guarda solo tras una breve pausa.
  const [pending, setPending] = useState<string | null>(null);
  const dirty = useRef(false);
  const snapshot = JSON.stringify({ form: { ...form, id: undefined }, buttons, attrSel });
  const lastSaved = useRef(snapshot);
  useEffect(() => {
    if (snapshot === lastSaved.current || saving) return;
    const timer = setTimeout(() => persist(snapshot), 900);
    return () => clearTimeout(timer);
  }, [snapshot, saving]);

  function close() {
    if (dirty.current) onSaved();
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          persist(snapshot);
        }}
        className="my-8 w-full max-w-2xl rounded-3xl bg-background p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">{form.id ? "Editar producto" : "Nuevo producto"}</h2>
          <button type="button" onClick={close} aria-label="Cerrar" className="rounded-full p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
          <Field label="Slug (URL)">
            <input
              value={form.slug ?? ""}
              onChange={(e) => set("slug", slugify(e.target.value))}
              className={inputCls}
              placeholder="mi-producto"
            />
          </Field>
          <Field label="SKU / Referencia">
            <input
              value={form.sku ?? ""}
              onChange={(e) => set("sku", e.target.value)}
              className={inputCls}
              placeholder="WD3D-001"
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
          <Field label="Texto de acción">
            <input
              value={form.btn_text ?? "Ver más"}
              onChange={(e) => set("btn_text", e.target.value)}
              className={inputCls}
              placeholder="Ver más, Cotizar, Reservar"
            />
          </Field>
          <Field label="Texto para compartir (Ej: ¡Mira este diseño increíble!)">
            <input
              value={form.custom_share_text ?? ""}
              onChange={(e) => set("custom_share_text", e.target.value)}
              className={inputCls}
              placeholder="¡Mira este diseño increíble!"
            />
          </Field>
          <Field label="Stock">
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
              {categoryOptions.map(({ category: c, depth }) => (
                <option key={c.id} value={c.id}>
                  {"— ".repeat(depth)}
                  {c.name}
                  {c.is_active ? "" : " (oculta)"}
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={quickCreateCategory}
                className="text-xs font-semibold text-[var(--brand-orange)] hover:underline"
              >
                + Crear categoría o subcategoría
              </button>
              <Link to="/panel/taxonomia" className="text-xs text-muted-foreground hover:underline">
                Gestionar todo
              </Link>
            </div>
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
            <button
              type="button"
              onClick={quickCreateBrand}
              className="mt-1 text-xs font-semibold text-[var(--brand-orange)] hover:underline"
            >
              + Crear marca
            </button>
          </Field>
          {applicableAttributes.map((a) => (
            <Field key={a.id} label={a.name}>
              <select
                value={attrSel[a.id] ?? ""}
                onChange={(e) =>
                  setAttrSel((s) => {
                    const next = { ...s };
                    if (e.target.value) next[a.id] = e.target.value;
                    else delete next[a.id];
                    return next;
                  })
                }
                className={inputCls}
              >
                <option value="">— Sin especificar —</option>
                {a.values.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
        {form.category_id && applicableAttributes.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Esta categoría no tiene atributos asignados.{" "}
            <Link to="/panel/taxonomia" className="underline">
              Asígnale Color, Material, etc.
            </Link>
          </p>
        )}


        <Field label="Descripción corta">
          <textarea
            rows={2}
            value={form.short ?? ""}
            onChange={(e) => set("short", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Descripción completa">
          <RichTextEditor
            value={form.description ?? ""}
            onChange={(html) => set("description", html)}
            placeholder="Escribe la descripción con negritas, listas y subtítulos…"
          />
        </Field>
        <Field label="Consejo de Kiara 🐾">
          <input
            value={form.kiara_tip ?? ""}
            onChange={(e) => set("kiara_tip", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Imágenes del producto (la primera o la marcada con ★ es la portada)">
          <ImageDropzone
            images={[
              ...(form.image_url ? [form.image_url] : []),
              ...(form.images ?? []).filter((u) => u !== form.image_url),
            ]}
            coverIndex={0}
            onSetCover={(url) => set("image_url", url)}
            onChange={(urls) => {
              // La posición 1 de la lista es siempre la portada.
              const cover = urls[0] ?? null;
              setForm((fm) => ({
                ...fm,
                image_url: cover,
                images: urls.slice(1),
              }));
            }}

          />
        </Field>

        <Field label="Métodos de pago permitidos para este producto">
          <PaymentMethodsPicker
            value={form.allowed_payment_method_ids ?? []}
            onChange={(v) => set("allowed_payment_method_ids", v ?? [])}
          />
        </Field>

        <Field label="Variantes (colores, tamaños…) — opcional">
          <VariantsEditor
            label={form.variant_label ?? "Color"}
            onLabelChange={(v) => set("variant_label", v)}
            variants={form.variants ?? []}
            onChange={(v) => set("variants", v)}
            gallery={[...(form.image_url ? [form.image_url] : []), ...(form.images ?? []).filter((u) => u !== form.image_url)]}
            parentButtons={buttons}
            targetVariantId={targetVariantId}
          />
        </Field>


        <Field label="Especificaciones técnicas (tecnología, volumen, material…)">
          <div className="grid gap-2">
            {(form.specs ?? []).map((sp, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={sp.label ?? ""}
                  onChange={(e) => setSpec(i, "label", e.target.value)}
                  placeholder="Tecnología"
                  className={inputCls}
                />
                <input
                  value={sp.value ?? ""}
                  onChange={(e) => setSpec(i, "value", e.target.value)}
                  placeholder="FDM"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((fm) => ({ ...fm, specs: (fm.specs ?? []).filter((_, j) => j !== i) }))
                  }
                  className="mt-1 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-700"
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm((fm) => ({ ...fm, specs: [...(fm.specs ?? []), { label: "", value: "" }] }))}
              className="justify-self-start rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              + Añadir especificación
            </button>
          </div>
        </Field>

        <Field label="Botones del producto (se muestran en las tarjetas del catálogo)">
          <ProductButtonsEditor buttons={buttons} onChange={setButtons} />
        </Field>



        <div className="mt-4 flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <Switch
              checked={!!form.show_whatsapp}
              onCheckedChange={(checked) => set("show_whatsapp", checked)}
              aria-label="Mostrar icono de WhatsApp en el catálogo"
            />
            Mostrar icono de WhatsApp en el catálogo
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <Switch
              checked={!!form.hide_default_cta}
              onCheckedChange={(checked) => set("hide_default_cta", checked)}
              aria-label="Ocultar el texto de acción y el icono de WhatsApp"
            />
            Ocultar el texto de acción y el icono de WhatsApp
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <Switch
              checked={!!form.accepts_3d_file}
              onCheckedChange={(checked) => set("accepts_3d_file", checked)}
              aria-label="Solicitar archivo 3D al cliente (STL/OBJ/STEP) antes de cotizar"
            />
            Solicitar archivo 3D al cliente (STL/OBJ/STEP) antes de cotizar
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <Switch
              checked={!!form.quote_only}
              onCheckedChange={(checked) => set("quote_only", checked)}
              aria-label="Solo cotización (ocultar precio)"
            />
            Solo cotización (ocultar precio)
          </label>
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

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {saving ? "Guardando…" : pending ?? (form.id ? "Guardado automático ✓" : "Se guardará solo al escribir el nombre")}
          </span>
          <button
            type="button"
            onClick={close}
            className="rounded-full bg-[var(--brand-wine)] px-6 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            Listo
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
