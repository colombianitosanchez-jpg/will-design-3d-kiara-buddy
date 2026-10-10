import { Plus, Trash2 } from "lucide-react";
import { PaymentMethodsPicker } from "@/components/PaymentMethodsPicker";
import { Switch } from "@/components/ui/switch";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProductButtonsEditor } from "@/components/ProductButtonsEditor";
import type { ProductButton } from "@/lib/product-buttons";
import { newVariant, type ProductVariant } from "@/lib/product-variants";

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function VariantsEditor({
  label,
  onLabelChange,
  variants,
  onChange,
  gallery,
  parentButtons,
}: {
  label: string;
  onLabelChange: (v: string) => void;
  variants: ProductVariant[];
  onChange: (v: ProductVariant[]) => void;
  gallery: string[];
  parentButtons: ProductButton[];
}) {
  const update = (i: number, patch: Partial<ProductVariant>) =>
    onChange(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const setImages = (i: number, images: string[]) => {
    const uniq = Array.from(new Set(images.filter(Boolean)));
    update(i, { images: uniq, image_url: uniq[0] ?? null });
  };

  return (
    <div className="grid gap-3">
      <label className="text-sm">
        Nombre del selector (ej. Color, Tamaño)
        <input className={inputCls} value={label} onChange={(e) => onLabelChange(e.target.value)} />
      </label>

      {variants.map((v, i) => (
        <div key={v.id} className={`rounded-xl border border-border p-3 ${v.is_active ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-40 flex-1 text-sm">
              Nombre
              <input className={inputCls} value={v.name} placeholder="Rojo" onChange={(e) => update(i, { name: e.target.value })} />
            </label>
            <label className="w-32 text-sm">
              Precio (vacío = hereda)
              <input
                type="number"
                min={0}
                className={inputCls}
                value={v.price_cop ?? ""}
                onChange={(e) => update(i, { price_cop: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </label>
            <label className="w-28 text-sm">
              Stock (vacío = hereda)
              <input
                type="number"
                min={0}
                className={inputCls}
                value={v.stock ?? ""}
                onChange={(e) => update(i, { stock: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </label>
            <label className="inline-flex items-center gap-2 pb-2 text-sm">
              <Switch checked={v.is_active} onCheckedChange={(c) => update(i, { is_active: c })} aria-label="Variante visible" />
              Visible
            </label>
            <button
              type="button"
              onClick={() => onChange(variants.filter((_, idx) => idx !== i))}
              className="mb-1 rounded-full p-2 text-red-600 hover:bg-red-50"
              aria-label="Eliminar variante"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 text-sm">
            <p className="font-semibold">Fotos de esta variante</p>
            <p className="text-xs text-muted-foreground">
              Sube fotos propias o tócalas desde las del producto. La marcada con ★ es la principal y la que se
              comparte por WhatsApp. Sin fotos, usa las del producto.
            </p>
            {gallery.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {gallery.map((url) => {
                  const on = v.images.includes(url);
                  return (
                    <button
                      type="button"
                      key={url}
                      onClick={() => setImages(i, on ? v.images.filter((u) => u !== url) : [...v.images, url])}
                      className={`h-12 w-12 overflow-hidden rounded-lg border-2 ${on ? "border-primary" : "border-transparent opacity-70"}`}
                      aria-label={on ? "Quitar foto de la variante" : "Usar foto en la variante"}
                      aria-pressed={on}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-2">
              <ImageDropzone
                images={v.images}
                coverIndex={0}
                onSetCover={(url) => setImages(i, [url, ...v.images.filter((u) => u !== url)])}
                onChange={(urls) => setImages(i, urls)}
                label="Arrastra aquí fotos de esta variante"
              />
            </div>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm">
            <Switch
              checked={v.custom_buttons !== null}
              onCheckedChange={(c) =>
                update(i, { custom_buttons: c ? parentButtons.map((b) => ({ ...b, id: `${b.id}-${v.id.slice(0, 6)}` })) : null })
              }
              aria-label="Botones propios para esta variante"
            />
            Botones, WhatsApp y pagos propios (apagado = usa los del producto)
          </label>

          <div className="mt-3 text-sm">
            <p className="font-semibold">Métodos de pago de esta variante</p>
            <div className="mt-2">
              <PaymentMethodsPicker
                value={v.allowed_payment_method_ids}
                onChange={(ids) => update(i, { allowed_payment_method_ids: ids })}
                inheritLabel="Usar los mismos del producto"
              />
            </div>
          </div>

          {v.custom_buttons && (
            <div className="mt-2 rounded-xl bg-muted/30 p-2">
              <ProductButtonsEditor
                buttons={v.custom_buttons}
                onChange={(b) => update(i, { custom_buttons: b })}
                showVariantToken
              />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...variants, newVariant()])}
        className="inline-flex w-fit items-center gap-1 rounded-full border border-border px-4 py-1.5 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" /> Añadir variante
      </button>
    </div>
  );
}
