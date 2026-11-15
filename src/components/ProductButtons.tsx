import { UnifiedButton } from "@/components/UnifiedButton";
import {
  type ProductButton,
  type ButtonPosition,
} from "@/lib/product-buttons";
import type { Product } from "@/lib/catalog";

const ROW_ALIGN: Record<ButtonPosition, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const ORDER: ButtonPosition[] = ["left", "center", "right"];

export function ProductButtons({
  product,
  shareProduct,
  buttons,
  className = "",
  extraWhatsappNote,
  quoteOnly = false,
  variantName,
  variantId,
}: {
  product?: Product;
  shareProduct?: Product;
  buttons: ProductButton[];
  className?: string;
  extraWhatsappNote?: string;
  /** Producto "solo cotización": se desactivan las acciones de compra. */
  quoteOnly?: boolean;
  /** Variante elegida: reemplaza {{variante}} y se añade al nombre. */
  variantName?: string | null;
  /** Variante elegida: el enlace con foto apunta a su ficha (vista previa con su foto). */
  variantId?: string | null;
}) {
  if (!buttons || !buttons.length) return null;

  const groups = ORDER.map((position) => ({
    position,
    list: buttons.filter((b) => b.position === position),
  })).filter((g) => g.list.length > 0);

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {groups.map(({ position, list }) => (
        <div
          key={position}
          className={`flex flex-wrap items-center gap-2.5 ${ROW_ALIGN[position]}`}
        >
          {list.map((b) => (
            <UnifiedButton
              key={b.id}
              button={b}
              product={product}
              shareProduct={shareProduct}
              extraWhatsappNote={extraWhatsappNote}
              quoteOnly={quoteOnly}
              variantName={variantName}
              variantId={variantId}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
