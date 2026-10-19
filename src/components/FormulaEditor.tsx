import { useState, useMemo } from "react";
import { evaluateFormula } from "@/lib/quoter-core";
import { Calculator, CheckCircle2, AlertCircle, Plus } from "lucide-react";

export type FormulaVarTag = {
  key: string;
  label: string;
  category?: string;
};

export function FormulaEditor({
  value,
  onChange,
  availableVars,
  placeholder = "Ej: (precio_bobina / peso_bobina) * 1.05",
  label = "Fórmula Matemática Personalizada",
}: {
  value: string;
  onChange: (val: string) => void;
  availableVars: FormulaVarTag[];
  placeholder?: string;
  label?: string;
}) {
  const sampleContext = useMemo(() => {
    const ctx: Record<string, number> = {};
    for (const v of availableVars) {
      ctx[v.key] = 100;
    }
    return ctx;
  }, [availableVars]);

  const testVal = useMemo(() => {
    if (!value.trim()) return null;
    return evaluateFormula(value, sampleContext);
  }, [value, sampleContext]);

  function insertVar(varKey: string) {
    const tag = `{{${varKey}}}`;
    if (!value) {
      onChange(tag);
    } else {
      onChange(`${value} ${tag}`);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calculator className="h-4 w-4 text-primary" /> {label}
        </label>
        {value.trim() && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              testVal !== null
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {testVal !== null ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Sintaxis Válida (Muestra: {testVal})
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Sintaxis incompleta o 0
              </>
            )}
          </span>
        )}
      </div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Operadores rápidos e Inserción de Variables */}
      <div className="space-y-2 pt-1 border-t border-border">
        <span className="text-[11px] font-bold uppercase text-muted-foreground block">
          Toca una variable para insertarla en la fórmula:
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
          {availableVars.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVar(v.key)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-primary/10 hover:border-primary transition"
              title={`Insertar {{${v.key}}}`}
            >
              <Plus className="h-3 w-3 text-primary" />
              <span>{v.label}</span>
              <code className="text-[10px] text-muted-foreground font-mono">({v.key})</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
