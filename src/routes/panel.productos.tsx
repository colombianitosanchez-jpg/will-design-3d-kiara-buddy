import { ProductMedia } from "@/components/ProductMedia";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Layers,
  ArrowRightLeft,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { ProductImageOptimizerModal } from "@/components/ProductImageOptimizerModal";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PaymentMethodsPicker } from "@/components/PaymentMethodsPicker";
import { UnifiedButton } from "@/components/UnifiedButton";
import { normalizeMethodIds } from "@/lib/payment-rules";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

const RichTextEditor = lazy(() =>
  import("@/components/RichTextEditor").then((m) => ({ default: m.RichTextEditor }))
);
const VariantsEditor = lazy(() =>
  import("@/components/VariantsEditor").then((m) => ({ default: m.VariantsEditor }))
);
const ProductButtonsEditor = lazy(() =>
  import("@/components/ProductButtonsEditor").then((m) => ({ default: m.ProductButtonsEditor }))
);
import { getMatchingVariants, parseVariants, validateVariants, type ProductVariant } from "@/lib/product-variants";

import {
  parseProductButtons,
  validateProductButtons,
  type ProductButton,
} from "@/lib/product-buttons";
import {
  variantToProduct,
  productToVariant,
  transferVariant,
  type ProductRecord,
} from "@/lib/product-hierarchy";
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

const STORAGE_KEY = "will_product_draft_v1";

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
  btn_text: "",
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
  variant_label: "",
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

function detectAnimType(url?: string | null): "video" | "gif" | "lottie" | "image" | "none" {
  if (!url) return "none";
  if (/\.(mp4|webm|mov|quicktime)($|\?)/i.test(url)) return "video";
  if (/\.gif($|\?)/i.test(url)) return "gif";
  if (/\.json($|\?)/i.test(url)) return "lottie";
  return "image";
}

type DragItemData =
  | { type: "product"; product: Product }
  | { type: "variant"; variant: ProductVariant; parentProduct: Product };

type HierarchyActionPrompt =
  | {
      type: "variant_to_standalone";
      variant: ProductVariant;
      parent: Product;
    }
  | {
      type: "variant_to_other_product";
      variant: ProductVariant;
      sourceParent: Product;
      targetParent: Product;
    }
  | {
      type: "product_to_variant";
      sourceProduct: Product;
      targetParent: Product;
    };

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const scrollPosRef = useRef<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [activeDragItem, setActiveDragItem] = useState<DragItemData | null>(null);
  const [actionPrompt, setActionPrompt] = useState<HierarchyActionPrompt | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  const visibleProducts = useMemo(() => {
    const q = debouncedSearch.trim();
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
  }, [products, debouncedSearch, selectedCategory, selectedStatus]);

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
        variant_label: typeof r.variant_label === "string" && r.variant_label ? r.variant_label : "",
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
    try {
      const savedDraft = sessionStorage.getItem(STORAGE_KEY);
      if (savedDraft && !editing) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === "object") {
          setEditing(parsed);
        }
      }
    } catch (e) {
      console.error("Error al restaurar borrador", e);
    }
  }, []);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return alert(error.message);
    load(true);
  }

  // Eliminar una variante de un producto principal desde la tabla
  async function handleRemoveVariant(product: Product, variantId: string) {
    if (!confirm("¿Eliminar esta variante?")) return;
    const nextVariants = (product.variants ?? []).filter((v) => v.id !== variantId);
    const { error } = await supabase
      .from("products")
      .update({ variants: nextVariants })
      .eq("id", product.id);
    if (error) {
      toast.error("Error al eliminar variante: " + error.message);
      return;
    }
    toast.success("Variante eliminada");
    load(true);
  }

  // Resolver acción de jerarquía (Mover / Convertir)
  async function executeHierarchyAction() {
    if (!actionPrompt) return;
    const existingSlugs = products.map((p) => p.slug);
    const existingNames = products.map((p) => p.name);

    try {
      if (actionPrompt.type === "variant_to_standalone") {
        const { variant, parent } = actionPrompt;
        const newProd = variantToProduct(variant, parent, existingSlugs, existingNames);

        // 1. Insertar el nuevo producto
        const { error: insErr } = await supabase.from("products").insert(newProd as any);
        if (insErr) throw insErr;

        // 2. Quitar la variante del producto padre
        const nextVars = (parent.variants ?? []).filter((v) => v.id !== variant.id);
        const { error: updErr } = await supabase
          .from("products")
          .update({ variants: nextVars })
          .eq("id", parent.id);
        if (updErr) throw updErr;
        toast.success(`Variante convertida en producto principal: ${newProd.name}`);
      } else if (actionPrompt.type === "variant_to_other_product") {
        const { variant, sourceParent, targetParent } = actionPrompt;
        const transferred = transferVariant(variant, targetParent, { makeUniqueId: true });
        const targetVars = [...(targetParent.variants ?? []), transferred];

        // 1. Añadir al nuevo padre
        const { error: updTargetErr } = await supabase
          .from("products")
          .update({ variants: targetVars })
          .eq("id", targetParent.id);
        if (updTargetErr) throw updTargetErr;

        // 2. Quitar del origen
        const sourceVars = (sourceParent.variants ?? []).filter((v) => v.id !== variant.id);
        const { error: updSourceErr } = await supabase
          .from("products")
          .update({ variants: sourceVars })
          .eq("id", sourceParent.id);
        if (updSourceErr) throw updSourceErr;
        toast.success(`Variante movida a ${targetParent.name}`);
      } else if (actionPrompt.type === "product_to_variant") {
        const { sourceProduct, targetParent } = actionPrompt;
        const newVar = productToVariant(sourceProduct);
        const transferred = transferVariant(newVar, targetParent, { makeUniqueId: true });
        const targetVars = [...(targetParent.variants ?? []), transferred];

        // 1. Añadir al producto padre destino
        const { error: updTargetErr } = await supabase
          .from("products")
          .update({ variants: targetVars })
          .eq("id", targetParent.id);
        if (updTargetErr) throw updTargetErr;

        // 2. Borrar el producto de origen
        const { error: delErr } = await supabase.from("products").delete().eq("id", sourceProduct.id);
        if (delErr) throw delErr;
        toast.success(`Producto asociado como variante de ${targetParent.name}`);
      }
      load(true);
    } catch (e: any) {
      toast.error("Error en la operación: " + (e.message || e));
    } finally {
      setActionPrompt(null);
    }
  }

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragItemData | undefined;
    if (data) {
      setActiveDragItem(data);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragItem(null);
    if (!over) return;

    const activeData = active.data.current as DragItemData | undefined;
    const overData = over.data.current as { type: string; product?: Product } | undefined;

    if (!activeData || !overData) return;

    // Caso A: Arrastrar variante
    if (activeData.type === "variant") {
      const { variant, parentProduct } = activeData;

      // Soltada en zona de convertir a producto principal (borde o dropzone)
      if (overData.type === "standalone_zone") {
        setActionPrompt({
          type: "variant_to_standalone",
          variant,
          parent: parentProduct,
        });
        return;
      }

      // Soltada sobre otro producto
      if (overData.type === "product_target" && overData.product) {
        if (overData.product.id === parentProduct.id) {
          // Es el mismo producto, nada que hacer
          return;
        }
        setActionPrompt({
          type: "variant_to_other_product",
          variant,
          sourceParent: parentProduct,
          targetParent: overData.product,
        });
        return;
      }
    }

    // Caso B: Arrastrar producto principal hacia otro producto principal
    if (activeData.type === "product") {
      const sourceProduct = activeData.product;
      if (overData.type === "product_target" && overData.product) {
        if (overData.product.id === sourceProduct.id) return;
        setActionPrompt({
          type: "product_to_variant",
          sourceProduct,
          targetParent: overData.product,
        });
      }
    }
  };

  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {visibleProducts.length} de {products.length} producto{products.length === 1 ? "" : "s"} en el catálogo.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOptimizerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-orange)]/40 bg-[var(--brand-orange)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--brand-orange)] hover:bg-[var(--brand-orange)]/20 transition"
            title="Escanear y optimizar fotos pesadas (>280 KB) para previsualización en WhatsApp"
          >
            <Sparkles className="h-4 w-4" /> Optimizar imágenes WhatsApp
          </button>
          <button
            onClick={() => setEditing({ ...empty })}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Añadir producto
          </button>
        </div>
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

      {/* Zona activa superior de soltar para convertir variante en producto principal */}
      <StandaloneDropZone isDragging={activeDragItem?.type === "variant"} />

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
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
                  <th className="w-10 px-3 py-3"></th>
                  <th className="px-4 py-3">Imagen</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((p) => {
                  const cat = p.category_id
                    ? categoryPath(categories.find((c) => c.id === p.category_id)?.slug, categories) || "—"
                    : "—";
                  const br = brands.find((b) => b.id === p.brand_id)?.name ?? "—";
                  const matchedVars = search.trim() ? getMatchingVariants(p.variants, search) : [];
                  const primaryVar = matchedVars[0] ?? null;
                  const displayImageUrl = primaryVar?.image_url ?? p.image_url;
                  const isExpanded = expandedProductIds.has(p.id);
                  const hasVariants = (p.variants ?? []).length > 0;

                  return (
                    <React.Fragment key={p.id}>
                      <ProductTableRow
                        product={p}
                        cat={cat}
                        br={br}
                        displayImageUrl={displayImageUrl}
                        primaryVar={primaryVar}
                        matchedVars={matchedVars}
                        isExpanded={isExpanded}
                        hasVariants={hasVariants}
                        highlightedId={highlightedId}
                        onToggleExpand={() => toggleExpand(p.id)}
                        onEditProduct={(varId) => handleEditProduct(p, varId)}
                        onRemove={() => {
                          scrollPosRef.current = window.scrollY;
                          remove(p.id);
                        }}
                      />

                      {/* Subfilas de variantes expandibles con estilo de barra de herramientas 6 puntos */}
                      {isExpanded && hasVariants && (
                        <tr className="bg-muted/20 border-t border-border">
                          <td colSpan={9} className="p-3 sm:p-4">
                            <div className="rounded-2xl border border-border/80 bg-background/90 p-3 sm:p-4 space-y-2.5">
                              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                                  <Layers className="h-3.5 w-3.5 text-primary" />
                                  Variantes de {p.name} ({p.variants.length})
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  Arrastra desde los 6 puntos hacia otro producto o hacia arriba para independizar
                                </span>
                              </div>

                              <ul className="space-y-2">
                                {p.variants.map((v, idx) => (
                                  <VariantTableRow
                                    key={v.id}
                                    variant={v}
                                    parentProduct={p}
                                    index={idx}
                                    onEdit={() => handleEditProduct(p, v.id)}
                                    onRemove={() => handleRemoveVariant(p, v.id)}
                                  />
                                ))}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drag Overlay para visualización mientras se arrastra */}
      <DragOverlay>
        {activeDragItem?.type === "variant" ? (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-background p-3 shadow-2xl ring-4 ring-primary/20 max-w-sm">
            <GripVertical className="h-5 w-5 text-primary" />
            <div className="text-xs font-bold text-foreground truncate">
              Variante: {activeDragItem.variant.name || "Sin nombre"}
            </div>
          </div>
        ) : activeDragItem?.type === "product" ? (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--brand-orange)] bg-background p-3 shadow-2xl ring-4 ring-[var(--brand-orange)]/20 max-w-sm">
            <GripVertical className="h-5 w-5 text-[var(--brand-orange)]" />
            <div className="text-xs font-bold text-foreground truncate">
              Producto: {activeDragItem.product.name}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Cuadro de diálogo para confirmar: Mover / Convertir */}
      {actionPrompt && (
        <HierarchyConfirmDialog
          prompt={actionPrompt}
          onConfirm={() => executeHierarchyAction()}
          onCancel={() => setActionPrompt(null)}
        />
      )}

      {optimizerOpen && (
        <ProductImageOptimizerModal
          open={optimizerOpen}
          onOpenChange={setOptimizerOpen}
          onComplete={() => load(true)}
        />
      )}

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
    </DndContext>
  );
}

/** Zona de soltar para convertir variante en producto principal sin textos largos */
function StandaloneDropZone({ isDragging }: { isDragging: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: "standalone_drop_zone",
    data: { type: "standalone_zone" },
  });

  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={`mt-4 rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
        isOver
          ? "border-primary bg-primary/10 scale-[1.01] shadow-lg ring-2 ring-primary"
          : "border-primary/40 bg-primary/[0.03]"
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
        <ArrowRightLeft className="h-4 w-4" />
        Soltar aquí para convertir en producto principal
      </div>
    </div>
  );
}

/** Fila arrastrable y receptora de producto principal */
function ProductTableRow({
  product,
  cat,
  br,
  displayImageUrl,
  primaryVar,
  matchedVars,
  isExpanded,
  hasVariants,
  highlightedId,
  onToggleExpand,
  onEditProduct,
  onRemove,
}: {
  product: Product;
  cat: string;
  br: string;
  displayImageUrl: string | null;
  primaryVar: ProductVariant | null;
  matchedVars: ProductVariant[];
  isExpanded: boolean;
  hasVariants: boolean;
  highlightedId: string | null;
  onToggleExpand: () => void;
  onEditProduct: (varId?: string | null) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `prod_drag_${product.id}`,
    data: { type: "product", product },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `prod_drop_${product.id}`,
    data: { type: "product_target", product },
  });

  return (
    <tr
      ref={setDropRef}
      id={`product-row-${product.id}`}
      className={`border-t border-border transition-all duration-300 ${
        highlightedId === product.id
          ? "bg-amber-500/10 ring-2 ring-[var(--brand-orange)] dark:bg-amber-500/20"
          : isOver
            ? "bg-primary/10 ring-2 ring-primary"
            : isDragging
              ? "opacity-50"
              : ""
      }`}
    >
      <td className="px-3 py-3 text-center">
        <div className="flex items-center gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing transition"
            title="Arrastrar producto sobre otro para convertirlo en variante"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
          {hasVariants ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title={isExpanded ? "Plegar variantes" : "Ver variantes"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-6" />
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {displayImageUrl ? (
          <ProductMedia thumb src={displayImageUrl} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-muted" />
        )}
      </td>
      <td className="px-4 py-3 font-semibold">
        <div className="flex items-center gap-2">
          <span>{product.name}</span>
          {hasVariants && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              {product.variants.length} var
            </span>
          )}
        </div>
        {matchedVars.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {matchedVars.map((mv) => (
              <span
                key={mv.id}
                className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-[var(--brand-orange)]"
              >
                Variante: {mv.name}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">{cat}</td>
      <td className="px-4 py-3">{br}</td>
      <td className="px-4 py-3 text-right">{formatCOP(primaryVar?.price_cop ?? product.price_cop)}</td>
      <td className="px-4 py-3 text-right">{primaryVar?.stock ?? product.stock}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            product.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
          }`}
        >
          {product.active ? "Activo" : "Oculto"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onEditProduct(primaryVar?.id)}
            className="h-8 text-xs font-semibold gap-1"
          >
            <Pencil className="h-3 w-3" /> Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

/** Fila arrastrable de variante dentro de la tabla */
function VariantTableRow({
  variant,
  parentProduct,
  index,
  onEdit,
  onRemove,
}: {
  variant: ProductVariant;
  parentProduct: Product;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `var_drag_${variant.id}`,
    data: { type: "variant", variant, parentProduct },
  });

  const primaryBtn = variant.custom_buttons?.[0] ?? parentProduct.custom_buttons?.[0] ?? {
    id: `var-btn-${variant.id}`,
    text: variant.name || "Comprar",
    action_type: "whatsapp",
    action_value: "",
    media_mode: "none",
  };

  const previewBtn: ProductButton = {
    ...primaryBtn,
    text: primaryBtn.text || variant.name || "Ver producto",
    animation_type: detectAnimType(primaryBtn.media_url),
  };

  return (
    <li
      ref={setNodeRef}
      className={`flex items-center justify-between gap-3 rounded-xl border bg-card p-2.5 transition shadow-2xs ${
        isDragging ? "opacity-40 border-primary" : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Arrastrar variante ${variant.name}`}
          className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing transition"
          title="Arrastrar variante a otro producto o a la zona superior para independizar"
        >
          <GripVertical className="h-4 w-4 text-primary" />
        </button>

        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[11px] font-black text-primary shrink-0">
          #{index + 1}
        </span>

        {variant.image_url ? (
          <ProductMedia thumb src={variant.image_url} className="h-7 w-7 rounded-lg object-cover shrink-0" />
        ) : null}

        <span className="text-xs font-bold text-foreground truncate text-left">
          {variant.name || "Sin nombre"}
          {variant.price_cop !== null && (
            <span className="ml-2 font-normal text-muted-foreground">
              (${variant.price_cop.toLocaleString("es-CO")})
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="shrink-0 max-w-[160px]">
          <UnifiedButton button={previewBtn} onClick={() => {}} />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-7 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
          title="Eliminar variante"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

/** Diálogo de confirmación: Mover / Convertir */
function HierarchyConfirmDialog({
  prompt,
  onConfirm,
  onCancel,
}: {
  prompt: HierarchyActionPrompt;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const title =
    prompt.type === "variant_to_standalone"
      ? `Convertir variante «${prompt.variant.name}» en producto principal`
      : prompt.type === "variant_to_other_product"
        ? `Mover variante «${prompt.variant.name}» a «${prompt.targetParent.name}»`
        : `Convertir producto «${prompt.sourceProduct.name}» en variante de «${prompt.targetParent.name}»`;

  const description =
    prompt.type === "variant_to_standalone"
      ? "¿Deseas mover esta variante y convertirla en un nuevo producto independiente? (Se eliminará de las variantes del producto actual)."
      : prompt.type === "variant_to_other_product"
        ? `¿Deseas mover la variante al producto «${prompt.targetParent.name}»? (Se retirará del producto original).`
        : `¿Deseas mover el producto a «${prompt.targetParent.name}»? (Se convertirá en variante y dejará de ser un producto principal).`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95">
        <h3 className="text-lg font-black text-foreground">{title}</h3>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs">
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            className="text-xs font-bold bg-primary text-primary-foreground gap-1.5 hover:opacity-90"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {prompt.type === "variant_to_standalone" || prompt.type === "product_to_variant" ? "Convertir" : "Mover"}
          </Button>
        </div>
      </div>
    </div>
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
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      return !!sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved && (!product || (!product.id && !product.name))) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setForm((prev) => ({ ...prev, ...parsed }));
          if (Array.isArray(parsed.custom_buttons)) {
            setButtons(parsed.custom_buttons);
          }
          setHasDraft(true);
        }
      }
    } catch (e) {
      console.error("Error al cargar borrador en ProductModal", e);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (
        (form.name && form.name.trim().length > 0) ||
        (form.description && form.description.trim().length > 0)
      ) {
        const draftData = { ...form, custom_buttons: buttons };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
        setHasDraft(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [form, buttons]);

  function handleDiscardDraft() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Error removiendo borrador", e);
    }
    setHasDraft(false);
    setForm(product);
    setButtons(product.custom_buttons ?? []);
    toast.info("Borrador descartado");
  }

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
        btn_text: form.btn_text?.trim() || "",
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
        variant_label: form.variant_label?.trim() || "",
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
      sessionStorage.removeItem(STORAGE_KEY);
      setHasDraft(false);
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

        {hasDraft && (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-50 px-3.5 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <span>Borrador guardado automático - vuelve y sigue donde estabas</span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="ml-2 font-bold underline hover:no-underline text-amber-900 dark:text-amber-200 shrink-0"
            >
              Descartar borrador
            </button>
          </div>
        )}

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
              value={form.btn_text ?? ""}
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
          <Suspense fallback={<div className="p-4 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando editor...</div>}>
            <RichTextEditor
              value={form.description ?? ""}
              onChange={(html) => set("description", html)}
              placeholder="Escribe la descripción con negritas, listas y subtítulos…"
            />
          </Suspense>
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
          <Suspense fallback={<div className="p-4 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando editor de variantes...</div>}>
            <VariantsEditor
              label={form.variant_label ?? ""}
              onLabelChange={(v) => set("variant_label", v)}
              variants={form.variants ?? []}
              onChange={(v) => set("variants", v)}
              gallery={[...(form.image_url ? [form.image_url] : []), ...(form.images ?? []).filter((u) => u !== form.image_url)]}
              parentButtons={buttons}
              targetVariantId={targetVariantId}
            />
          </Suspense>
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
          <Suspense fallback={<div className="p-4 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando botones...</div>}>
            <ProductButtonsEditor buttons={buttons} onChange={setButtons} />
          </Suspense>
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
