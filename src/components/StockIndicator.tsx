import { cn } from "@/lib/utils";

/** Muestra el stock solo si es mayor a 0; con 0, null o undefined no renderiza nada. */
export function StockIndicator({
  stock,
  className,
}: {
  stock: number | null | undefined;
  className?: string;
}) {
  if (!(typeof stock === "number" && stock > 0)) return null;
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Disponible · {stock} en stock
    </p>
  );
}
