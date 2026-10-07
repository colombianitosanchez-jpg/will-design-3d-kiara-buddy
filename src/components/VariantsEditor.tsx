import { Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  const updateBtn = (i: number, bi: number, patch: Partial<ProductButton>) => {
    const btns = (variants[i].custom_buttons ?? []).map((b, idx) => (idx === bi ? { ...b, ...patch } : b));
    update(i, { custom_buttons: btns });
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
            Foto de la variante
            {gallery.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sube primero imágenes al producto.</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {gallery.map((url) => (
                  <button
                    type="button"
                    key={url}
                    onClick={() => update(i, { image_url: v.image_url === url ? null : url })}
                    className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${v.image_url === url ? "border-primary" : "border-transparent"}`}
                    aria-label="Elegir foto"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm">
            <Switch
              checked={v.custom_buttons !== null}
              onCheckedChange={(c) =>
                update(i, { custom_buttons: c ? parentButtons.map((b) => ({ ...b })) : null })
              }
              aria-label="Botones propios para esta variante"
            />
            Botones y mensajes propios (si está apagado usa los del producto)
          </label>

          {v.custom_buttons && (
            <div className="mt-2 grid gap-2">
              {v.custom_buttons.length === 0 && (
                <p className="text-xs text-muted-foreground">El producto no tiene botones para personalizar.</p>
              )}
              {v.custom_buttons.map((b, bi) => (
                <div key={b.id} className="rounded-lg bg-muted/40 p-2">
                  <label className="text-xs">
                    Texto del botón
                    <input className={inputCls} value={b.text} onChange={(e) => updateBtn(i, bi, { text: e.target.value })} />
                  </label>
                  {b.action_type === "whatsapp" && (
                    <>
                      <label className="mt-2 block text-xs">
                        Mensaje de WhatsApp ({"{{producto}}"}, {"{{precio}}"}, {"{{variante}}"})
                        <Textarea
                          className="mt-1"
                          value={b.whatsapp_message}
                          onChange={(e) => updateBtn(i, bi, { whatsapp_message: e.target.value })}
                        />
                      </label>
                      <label className="mt-2 inline-flex items-center gap-2 text-xs">
                        <Switch
                          checked={b.include_image_link}
                          onCheckedChange={(c) => updateBtn(i, bi, { include_image_link: c })}
                          aria-label="Incluir foto"
                        />
                        Incluir enlace con foto
                      </label>
                    </>
                  )}
                </div>
              ))}
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
