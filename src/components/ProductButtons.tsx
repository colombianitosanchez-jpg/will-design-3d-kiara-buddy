import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useSiteContent } from "@/hooks/use-site-content";
import { getContactInfo, waLink, type Product } from "@/lib/catalog";
import { type ProductButton, type ButtonPosition } from "@/lib/product-buttons";

const ROW_ALIGN: Record<ButtonPosition, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const ORDER: ButtonPosition[] = ["left", "center", "right"];

export function ProductButtons({
  product,
  buttons,
  className = "",
  extraWhatsappNote,
  quoteOnly = false,
}: {
  product: Product;
  buttons: ProductButton[];
  className?: string;
  extraWhatsappNote?: string;
  /** Producto "solo cotización": se desactivan las acciones de compra. */
  quoteOnly?: boolean;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { content } = useSiteContent();
  const fallbackWhatsapp = getContactInfo(content).whatsapp;

  if (!buttons.length) return null;

  const isCartAction = (b: ProductButton) =>
    b.action_type === "add_to_cart" || b.action_type === "checkout";

  function cartPayload() {
    return {
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      price_cop: product.price_cop,
      image_url: product.image_url,
    };
  }

  function handleButtonAction(button: ProductButton) {
    switch (button.action_type) {
      case "link": {
        const value = button.action_value.trim();
        if (!value) return;
        if (/^https?:\/\//i.test(value)) {
          window.open(value, "_blank", "noopener,noreferrer");
        } else {
          router.navigate({ to: value.startsWith("/") ? value : `/${value}` });
        }
        return;
      }
      case "whatsapp": {
        const number = button.action_value.trim() || fallbackWhatsapp;
        const text = buildButtonWhatsappText(
          button,
          {
            name: product.name,
            image_url: product.image_url,
            images: product.images,
            price: formatCOP(product.price_cop),
          },
          extraWhatsappNote ?? "",
        );
        window.open(waLink(number, text), "_blank", "noopener,noreferrer");
        return;
      }

      case "add_to_cart": {
        addItem(cartPayload());
        toast.success(`${product.name} se añadió al carrito`);
        return;
      }
      case "checkout": {
        addItem(cartPayload());
        router.navigate({ to: "/carrito" });
        return;
      }
    }
  }

  const groups = ORDER.map((position) => ({
    position,
    list: buttons.filter((b) => b.position === position),
  })).filter((g) => g.list.length > 0);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {groups.map(({ position, list }) => (
        <div key={position} className={`flex flex-wrap items-center gap-2 ${ROW_ALIGN[position]}`}>
          {list.map((b) => (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={b.variant}
              className={b.width === "full" ? "w-full" : "w-auto"}
              disabled={quoteOnly && isCartAction(b)}
              title={quoteOnly && isCartAction(b) ? "Producto sujeto a cotización" : undefined}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (quoteOnly && isCartAction(b)) return;
                handleButtonAction(b);
              }}
            >
              {b.text}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
