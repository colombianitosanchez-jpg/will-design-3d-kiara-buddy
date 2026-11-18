import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { canEditCartQuantity, mergeCartLine } from "./cart-quantity";

export type CartItem = {
  /** Clave del artículo: id del producto, o "svc:<slug>:<hash>" para servicios cotizados. */
  product_id: string;
  slug: string;
  name: string;
  price_cop: number;
  image_url: string | null;
  quantity: number;
  /** "service" cuando la línea viene del cotizador (no es un producto de la tienda). */
  kind?: "product" | "service";
  service_slug?: string;
  answers?: Record<string, string>;
  detail?: string;
};

const STORAGE_KEY = "wd3d_cart_v1";
const MAX_QTY = 99;

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i: any) => i && typeof i.product_id === "string" && typeof i.name === "string")
      .map((i: any) => ({
        product_id: i.product_id,
        slug: typeof i.slug === "string" ? i.slug : "",
        name: i.name,
        price_cop: Number(i.price_cop) || 0,
        image_url: typeof i.image_url === "string" ? i.image_url : null,
        quantity: Math.min(MAX_QTY, Math.max(1, Number(i.quantity) || 1)),
        kind: i.kind === "service" ? ("service" as const) : ("product" as const),
        service_slug: typeof i.service_slug === "string" ? i.service_slug : undefined,
        answers:
          i.answers && typeof i.answers === "object" && !Array.isArray(i.answers)
            ? (i.answers as Record<string, string>)
            : undefined,
        detail: typeof i.detail === "string" ? i.detail : undefined,
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === item.product_id);
      if (found) {
        return prev.map((i) =>
          i.product_id === item.product_id
            ? mergeCartLine(i, { ...item, quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(quantity))) })
            : i,
        );
      }
      return [...prev, { ...item, quantity: Math.min(MAX_QTY, Math.max(1, quantity)) }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.product_id !== productId)
        : prev.map((i) =>
            i.product_id === productId && canEditCartQuantity(i)
              ? { ...i, quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(quantity))) }
              : i,
          ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      total: items.reduce((n, i) => n + i.price_cop * i.quantity, 0),
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, addItem, setQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
