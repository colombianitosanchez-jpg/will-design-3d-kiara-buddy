import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  type ProductButton,
} from "@/lib/product-buttons";

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

/** Constructor completo de botones: mismo editor para el producto y para cada variante. */
export function ProductButtonsEditor({
  buttons,
  onChange,
  showVariantToken = false,
}: {
  buttons: ProductButton[];
  onChange: (b: ProductButton[]) => void;
  showVariantToken?: boolean;
}) {
  const setButtons = (fn: (list: ProductButton[]) => ProductButton[]) => onChange(fn(buttons));
  const updateButton = (index: number, patch: Partial<ProductButton>) =>
    setButtons((list) => list.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  const moveButton = (index: number, dir: -1 | 1) =>
    setButtons((list) => {
      const next = [...list];
      const t = index + dir;
      if (t < 0 || t >= next.length) return list;
      [next[index], next[t]] = [next[t], next[index]];
      return next;
    });

  return (
          <div className="grid gap-3">
            {buttons.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sin botones personalizados: la tarjeta mostrará el texto de acción de arriba.
              </p>
            )}
            {buttons.map((b, i) => (
              <div key={b.id} className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Botón {i + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveButton(i, -1)}
                      disabled={i === 0}
                      aria-label="Subir botón"
                      className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveButton(i, 1)}
                      disabled={i === buttons.length - 1}
                      aria-label="Bajar botón"
                      className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setButtons((list) => list.filter((_, j) => j !== i))}
                      className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Texto
                    <input
                      value={b.text}
                      onChange={(e) => updateButton(i, { text: e.target.value })}
                      placeholder="Comprar ahora"
                      className={inputCls}
                    />
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Estilo
                    <select
                      value={b.variant}
                      onChange={(e) => updateButton(i, { variant: e.target.value as ProductButton["variant"] })}
                      className={inputCls}
                    >
                      {BUTTON_VARIANTS.map((v) => (
                        <option key={v} value={v}>
                          {VARIANT_LABELS[v]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Ancho
                    <select
                      value={b.width}
                      onChange={(e) => updateButton(i, { width: e.target.value as ProductButton["width"] })}
                      className={inputCls}
                    >
                      {BUTTON_WIDTHS.map((w) => (
                        <option key={w} value={w}>
                          {WIDTH_LABELS[w]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Alineación
                    <select
                      value={b.position}
                      onChange={(e) => updateButton(i, { position: e.target.value as ProductButton["position"] })}
                      className={inputCls}
                    >
                      {BUTTON_POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {POSITION_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Acción al pulsar
                    <select
                      value={b.action_type}
                      onChange={(e) =>
                        updateButton(i, {
                          action_type: e.target.value as ProductButton["action_type"],
                          action_value: "",
                        })
                      }
                      className={inputCls}
                    >
                      {BUTTON_ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {ACTION_LABELS[a]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(b.action_type === "link" || b.action_type === "whatsapp") && (
                    <label className="text-xs font-semibold text-muted-foreground">
                      {b.action_type === "link" ? "URL o ruta de destino" : "Número de WhatsApp (opcional)"}
                      <input
                        value={b.action_value}
                        onChange={(e) => updateButton(i, { action_value: e.target.value })}
                        placeholder={b.action_type === "link" ? "/cotizador o https://…" : "573156724474"}
                        className={inputCls}
                      />
                    </label>
                  )}
                  <label className="text-xs font-semibold text-muted-foreground">
                    URL GIF/Video/Imagen (Opcional)
                    <input
                      value={b.media_url || ""}
                      onChange={(e) => updateButton(i, { media_url: e.target.value })}
                      placeholder="https://... .gif o .mp4"
                      className={inputCls}
                    />
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Efecto / Animación Botón
                    <select
                      value={b.animation_style || "none"}
                      onChange={(e) => updateButton(i, { animation_style: e.target.value })}
                      className={inputCls}
                    >
                      <option value="none">Sin Animación</option>
                      <option value="neon_glow">Neón Cyberpunk ⚡</option>
                      <option value="cyber_pulse">Pulso Dinámico 💫</option>
                      <option value="shimmer">Brillo Shimmer ✨</option>
                      <option value="festive_sparkle">Destello Festivo 🌟</option>
                    </select>
                  </label>
                </div>
                {b.action_type === "whatsapp" && (
                  <div className="mt-2 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Si lo dejas vacío usamos el WhatsApp general del sitio.
                    </p>
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Mensaje personalizado de WhatsApp
                      <Textarea
                        value={b.whatsapp_message}
                        onChange={(e) => updateButton(i, { whatsapp_message: e.target.value })}
                        placeholder="Hola Will Design 3D, me interesa el producto {{producto}}..."
                        rows={3}
                        className="mt-1"
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Puedes usar {"{{producto}}"}, {"{{precio}}"}{showVariantToken ? <> y {"{{variante}}"}</> : null}; si lo dejas vacío enviamos el
                      mensaje estándar.
                    </p>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
                      <span className="text-xs font-semibold">
                        Incluir la foto del producto en el mensaje
                        <span className="mt-0.5 block font-normal text-muted-foreground">
                          Añade el enlace de la ficha del producto; WhatsApp muestra la foto, el
                          nombre y el precio como vista previa.
                        </span>
                      </span>
                      <Switch
                        checked={b.include_image_link}
                        onCheckedChange={(v) => updateButton(i, { include_image_link: v })}
                      />
                    </label>

                  </div>
                )}

                {(b.action_type === "add_to_cart" || b.action_type === "checkout") && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {b.action_type === "add_to_cart"
                      ? "Añade este producto al carrito del visitante."
                      : "Añade el producto y lleva directo al carrito para confirmar el pedido."}
                  </p>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setButtons((list) => [...list, newProductButton()])}
              className="justify-self-start rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              + Añadir botón
            </button>
          </div>
  );
}
