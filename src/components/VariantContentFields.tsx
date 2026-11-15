import { lazy, Suspense } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { ProductVariant } from "@/lib/product-variants";
import { ProductControlSection } from "@/components/ProductControlSection";

const RichTextEditor = lazy(() => import("@/components/RichTextEditor").then((m) => ({ default: m.RichTextEditor })));
const inputClass = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export type VariantParentSettings = Partial<Pick<ProductVariant, "accepts_3d_file" | "quote_only" | "show_whatsapp" | "hide_default_cta">>;

export function VariantContentFields({ variant: v, onUpdate, parentSettings = {} }: { variant: ProductVariant; onUpdate: (patch: Partial<ProductVariant>) => void; parentSettings?: VariantParentSettings }) {
  const option = (key: keyof VariantParentSettings, label: string) => <div key={key} className="space-y-2 text-sm">
    <label className="flex flex-wrap items-center justify-between gap-2">
      {label}
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch aria-label={`Personalizar: ${label}`} checked={v[key] !== undefined} onCheckedChange={(own) => onUpdate({ [key]: own ? parentSettings[key] ?? false : undefined })} />
        Personalizar
      </span>
    </label>
    <label className="flex items-center gap-2">
      <Switch aria-label={label} checked={v[key] ?? parentSettings[key] ?? false} disabled={v[key] === undefined} onCheckedChange={(value) => onUpdate({ [key]: value })} />
      {v[key] === undefined ? "Heredado del producto" : (v[key] ? "Activado" : "Desactivado")}
    </label>
  </div>;
  return <div className="space-y-4">
    <label className="flex items-center gap-2 text-sm font-semibold">
      <Switch checked={v.featured === true} onCheckedChange={(featured) => onUpdate({ featured })} aria-label="Destacar variante en Inicio" />
      Destacar en Inicio
    </label>
    <div className="space-y-3">
        <label className="block text-sm">Descripción corta
          <textarea className={inputClass} rows={2} value={v.short ?? ""} placeholder="Hereda del producto" onChange={(e) => onUpdate({ short: e.target.value })} />
        </label>
        <ProductControlSection title="Descripción completa">
          <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
            <RichTextEditor value={v.description ?? ""} onChange={(description) => onUpdate({ description })} />
          </Suspense>
        </ProductControlSection>
        <ProductControlSection title="Especificaciones">
        <div className="flex items-center justify-between text-sm font-semibold">Especificaciones
          <Button type="button" size="icon" variant="ghost" title="Añadir especificación" onClick={() => onUpdate({ specs: [...(v.specs ?? []), { label: "", value: "" }] })}><Plus className="h-4 w-4" /></Button>
        </div>
        {(v.specs ?? []).map((spec, index) => <div key={index} className="flex items-center gap-2">
          <input aria-label={`Especificación ${index + 1}`} className={inputClass} value={spec.label} placeholder="Material" onChange={(e) => onUpdate({ specs: v.specs?.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} />
          <input aria-label={`Valor ${index + 1}`} className={inputClass} value={spec.value} placeholder="PLA" onChange={(e) => onUpdate({ specs: v.specs?.map((item, i) => i === index ? { ...item, value: e.target.value } : item) })} />
          <Button type="button" size="icon" variant="ghost" title="Eliminar especificación" onClick={() => onUpdate({ specs: v.specs?.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
        </ProductControlSection>
    </div>
    <ProductControlSection title="WhatsApp, Kiara y opciones comerciales">
        <label className="block text-sm">Texto para compartir por WhatsApp<textarea className={inputClass} rows={3} value={v.custom_share_text ?? ""} placeholder="Hereda del producto" onChange={(e) => onUpdate({ custom_share_text: e.target.value || null })} /></label>
        <label className="block text-sm">Consejo de Kiara<textarea className={inputClass} rows={2} value={v.kiara_tip ?? ""} placeholder="Hereda del producto" onChange={(e) => onUpdate({ kiara_tip: e.target.value })} /></label>
        {option("accepts_3d_file", "Aceptar archivo 3D")}
        {option("quote_only", "Solo cotización")}
    </ProductControlSection>
    <ProductControlSection title="Acciones predeterminadas">
      <label className="block text-sm">Texto de Ver más<input className={inputClass} value={v.btn_text ?? ""} placeholder="Hereda del producto" onChange={(e) => onUpdate({ btn_text: e.target.value })} /></label>
      {option("show_whatsapp", "Mostrar WhatsApp predeterminado")}
      {option("hide_default_cta", "Ocultar acción predeterminada")}
    </ProductControlSection>
  </div>;
}