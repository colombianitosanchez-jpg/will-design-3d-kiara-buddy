import kiaraAsset from "@/assets/kiara.asset.json";

export function KiaraTip({ tip }: { tip: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
      <img
        src={kiaraAsset.url}
        alt="Kiara"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[var(--brand-orange)]"
      />
      <div
        className="relative flex-1 rounded-xl px-3 py-2 text-sm"
        style={{
          background: "color-mix(in oklab, var(--brand-orange) 10%, white)",
        }}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-orange)]">
          Consejo de Kiara 🐾
        </p>
        <p className="mt-1 text-foreground">{tip}</p>
      </div>
    </div>
  );
}
