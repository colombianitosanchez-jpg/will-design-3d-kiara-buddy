import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Package, Star } from "lucide-react";
import {
  featuredItemKey,
  featuredProductItems,
  formatCOP,
  gradientKeyFor,
  productsQuery,
  type Product,
} from "@/lib/catalog";
import { resolveVariantProduct, type ProductVariant } from "@/lib/product-variants";
import { ProductMedia } from "@/components/ProductMedia";

const GRADIENTS: Record<string, string> = {
  orange:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-orange) 35%, white), color-mix(in oklab, var(--brand-orange) 75%, white))",
  teal: "linear-gradient(135deg, color-mix(in oklab, var(--brand-teal) 35%, white), color-mix(in oklab, var(--brand-teal) 75%, white))",
  wine: "linear-gradient(135deg, color-mix(in oklab, var(--brand-wine) 35%, white), color-mix(in oklab, var(--brand-wine) 70%, white))",
};

type FeaturedItem = {
  product: Product;
  variant: ProductVariant | null;
};

function FeaturedPreviewBody({
  item,
  index,
  isExplicitFeatured,
  handleProps,
  label,
}: {
  item: FeaturedItem;
  index: number;
  isExplicitFeatured: boolean;
  handleProps?: Record<string, unknown>;
  label: string;
}) {
  const resolved = resolveVariantProduct(item.product, item.variant);
  const cover = item.variant?.image_url ?? resolved.image_url;
  const gradient = GRADIENTS[gradientKeyFor(resolved.category?.slug)];

  return (
    <>
      <div
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden text-3xl font-black text-primary-foreground/90"
        style={{ background: gradient }}
      >
        {cover ? (
          <ProductMedia src={cover} alt={resolved.name} className="h-full w-full object-cover" />
        ) : (
          <span className="drop-shadow-md">{resolved.name.split(" ")[0]}</span>
        )}

        <button
          type="button"
          {...handleProps}
          aria-label={`Arrastrar ${label}`}
          title="Arrastrar para reordenar producto destacado"
          className="absolute left-2.5 top-2.5 z-10 inline-flex cursor-grab touch-none items-center gap-1 rounded-xl border border-border/80 bg-background/95 px-2 py-1.5 text-xs font-black text-foreground shadow-sm backdrop-blur transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 shrink-0 text-primary" />
          <span>#{index + 1}</span>
        </button>

        <span
          className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs backdrop-blur ${
            isExplicitFeatured
              ? "bg-background/95 text-[var(--brand-wine)]"
              : "bg-background/90 text-muted-foreground"
          }`}
        >
          {isExplicitFeatured ? "Destacado" : "Activo"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h4 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
          {resolved.name}
        </h4>

        {item.variant && (
          <p className="text-xs text-muted-foreground">
            Variante: <span className="font-semibold text-foreground">{item.variant.name}</span>
          </p>
        )}

        <div className="mt-auto pt-1">
          {resolved.quote_only ? (
            <span className="text-xs font-bold text-[var(--brand-teal-deep)]">
              Sujeto a cotización
            </span>
          ) : (
            <span className="text-sm font-black text-[var(--brand-wine)]">
              {formatCOP(resolved.price_cop)}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function SortableFeaturedCard({
  item,
  itemKey,
  index,
  isDropTarget,
  isExplicitFeatured,
}: {
  item: FeaturedItem;
  itemKey: string;
  index: number;
  isDropTarget: boolean;
  isExplicitFeatured: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: itemKey });

  const resolved = resolveVariantProduct(item.product, item.variant);
  const label = item.variant ? `${resolved.name} (${item.variant.name})` : resolved.name;
  const highlightTarget = !isDragging && (isOver || isDropTarget);

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all ${
        isDragging
          ? "z-10 border-2 border-dashed border-primary/70 bg-primary/5 opacity-45 shadow-none"
          : highlightTarget
            ? "z-20 scale-[1.01] border-2 border-primary bg-primary/5 shadow-lg ring-4 ring-primary/30"
            : "border-border shadow-2xs hover:border-border/80 hover:shadow-sm"
      }`}
    >
      <FeaturedPreviewBody
        item={item}
        index={index}
        isExplicitFeatured={isExplicitFeatured}
        label={label}
        handleProps={{ ...attributes, ...listeners }}
      />
    </article>
  );
}

export function FeaturedProductsOrder({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: products, isPending, isError } = useQuery(productsQuery());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeProducts = useMemo(() => (products ?? []).filter((p) => p.active), [products]);

  const hasExplicitFeatured = useMemo(
    () =>
      activeProducts.some((p) => p.featured || p.variants.some((v) => v.is_active && v.featured)),
    [activeProducts],
  );

  const items = useMemo(() => featuredProductItems(activeProducts, value), [activeProducts, value]);

  const itemKeys = useMemo(
    () => items.map((it) => featuredItemKey(it.product, it.variant)),
    [items],
  );

  const activeIndex = activeId ? itemKeys.indexOf(activeId) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setOverId(String(active.id));
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over ? String(over.id) : null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = itemKeys.indexOf(String(active.id));
    const newIndex = itemKeys.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const nextOrder = arrayMove(itemKeys, oldIndex, newIndex);
    onChange(JSON.stringify(nextOrder));
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverId(null);
  }

  if (isPending && !products) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos destacados…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        No pudimos cargar el catálogo de productos para ordenar los destacados.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <Package className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">
          No hay productos activos disponibles
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Activa o marca productos como destacados en el módulo de Productos para ordenarlos aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
          <Star className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
          {items.length}{" "}
          {items.length === 1 ? "elemento mostrado en Inicio" : "elementos mostrados en Inicio"}
        </span>
        <span className="text-muted-foreground">
          {hasExplicitFeatured
            ? "Mostrando todos los productos y variantes marcados como destacados (sin límite de 4)."
            : "No hay productos marcados como destacados aún: se muestran todos los activos."}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemKeys} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const key = itemKeys[index];
              return (
                <SortableFeaturedCard
                  key={key}
                  item={item}
                  itemKey={key}
                  index={index}
                  isDropTarget={overId === key && activeId !== key}
                  isExplicitFeatured={Boolean(item.variant?.featured ?? item.product.featured)}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <article className="flex flex-col overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-2xl ring-4 ring-primary/25">
              <FeaturedPreviewBody
                item={activeItem}
                index={activeIndex}
                isExplicitFeatured={Boolean(
                  activeItem.variant?.featured ?? activeItem.product.featured,
                )}
                label={
                  activeItem.variant
                    ? `${activeItem.product.name} (${activeItem.variant.name})`
                    : activeItem.product.name
                }
              />
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
