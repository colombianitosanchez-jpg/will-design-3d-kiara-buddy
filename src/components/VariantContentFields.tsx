import { lazy, Suspense } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { ProductVariant } from "@/lib/product-variants";

const RichTextEditor = lazy(() => import("@/components/RichTextEditor").then((m) => ({ default: m.RichTextEditor })));
const inputClass = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function VariantContentFields({ variant: v, onUpdate }: { variant: ProductVariant; onUpdate: (patch: Partial<ProductVariant>) => void }) {
  return <div className="space-y-4">
    {v.inheritance_frozen && <label className="flex items-center gap-2 text-sm">
      <Switch checked aria-label="Conservar configuración del origen" onCheckedChange={() => onUpdate({ inheritance_frozen: false })} />
      Conservar configuración del origen
    </label>}
    <label className="flex items-center gap-2 text-sm font-semibold">
      <Switch checked={v.featured === true} onCheckedChange={(featured) => onUpdate({ featured })} aria-label="Destacar variante en Inicio" />
      Destacar en Inicio
    </label>
    <details className="border-t border-border pt-3" open>
      <summary className="cursor-pointer text-sm font-bold">Descripciones y especificaciones</summary>
      <div className="mt-3 space-y-3">
        <label className="block text-sm">Descripción corta
          <textarea className={inputClass} rows={2} value={v.short ?? ""} placeholder="Hereda del producto" onChange={(e) => onUpdate({ short: e.target.value })} />
        </label>
        <div className="text-sm">Descripción larga
          <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
            <RichTextEditor value={v.description ?? ""} onChange={(description) => onUpdate({ description })} />
          </Suspense>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold">Especificaciones
          <Button type="button" size="icon" variant="ghost" title="Añadir especificación" onClick={() => onUpdate({ specs: [...(v.specs ?? []), { label: "", value: "" }] })}><Plus className="h-4 w-4" /></Button>
        </div>
        {(v.specs ?? []).map((spec, index) => <div key={index} className="flex items-center gap-2">
          <input aria-label={`Especificación ${index + 1}`} className={inputClass} value={spec.label} placeholder="Material" onChange={(e) => onUpdate({ specs: v.specs?.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} />
          <input aria-label={`Valor ${index + 1}`} className={inputClass} value={spec.value} placeholder="PLA" onChange={(e) => onUpdate({ specs: v.specs?.map((item, i) => i === index ? { ...item, value: e.target.value } : item) })} />
          <Button type="button" size="icon" variant="ghost" title="Eliminar especificación" onClick={() => onUpdate({ specs: v.specs?.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
      </div>
    </details>
    <details className="border-t border-border pt-3">
      <summary className="cursor-pointer text-sm font-bold">WhatsApp, Kiara y opciones comerciales</summary>
      <div className="mt-3 space-y-3">
        <label className="block text-sm">Texto para compartir por WhatsApp<textarea className={inputClass} rows={3} value={v.custom_share_text ?? ""} placeholder="Hereda del producto" onChange={(e) => onUpdate({ custom_share_text: e.target.value || null })} /></label>
        <label className="block text-sm">Consejo de Kiara<textarea className={inputClass} rows={2} value={v.kiara_tip ?? ""} placeholder="Hereda del producto" onChange={(e) => onUpdate({ kiara_tip: e.target.value })} /></label>
        <label className="block text-sm">Texto de Ver más<input className={inputClass} value={v.btn_text ?? ""} placeholder="Hereda del producto" onChange={(e) => onUpdate({ btn_text: e.target.value })} /></label>
        {([
          ["accepts_3d_file", "Aceptar archivo 3D"], ["quote_only", "Solo cotización"],
          ["show_whatsapp", "Mostrar WhatsApp predeterminado"], ["hide_default_cta", "Ocultar acción predeterminada"],
        ] as const).map(([key, label]) => <label key={key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {label}
          <select className="rounded-md border border-input bg-background px-3 py-2" aria-label={label} value={v[key] === undefined ? "inherit" : String(v[key])} onChange={(e) => onUpdate({ [key]: e.target.value === "inherit" ? undefined : e.target.value === "true" })}>
            <option value="inherit">Heredar del producto</option><option value="true">Sí</option><option value="false">No</option>
          </select>
        </label>)}
      </div>
    </details>
  </div>;
}