import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart";
import { useSiteContent } from "@/hooks/use-site-content";
import { getContactInfo, waLink, formatCOP, type Product } from "@/lib/catalog";
import { openExternalUrl } from "@/lib/whatsapp";
import { cartLineKey } from "@/lib/payment-rules";
import {
  buildButtonWhatsappText,
  type ProductButton,
} from "@/lib/product-buttons";
import {
  getBestAccessibility,
  productButtonToUnified,
  type UnifiedButtonStyle,
} from "@/lib/unifiedButton";

function LottiePlayer({ url, className }: { url: string; className?: string }) {
  const [data, setData] = useState<any>(null);
  const [LottieComp, setLottieComp] = useState<any>(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    Promise.all([
      fetch(url).then((res) => res.json()),
      import("lottie-react").then((m: any) => m.Lottie || m.default),
    ])
      .then(([json, Comp]) => {
        if (isMounted) {
          setData(json);
          setLottieComp(() => Comp);
        }
      })
      .catch(() => {
        if (isMounted) {
          setData(null);
          setLottieComp(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!data || !LottieComp) return null;
  const Component = LottieComp;
  return <Component animationData={data} loop={true} className={className} />;
}

export interface UnifiedButtonProps {
  button: ProductButton;
  styleOverride?: Partial<UnifiedButtonStyle>;
  product?: Product;
  className?: string;
  extraWhatsappNote?: string;
  quoteOnly?: boolean;
  variantName?: string | null;
  variantId?: string | null;
  onClick?: () => void;
}

export function UnifiedButton({
  button,
  styleOverride,
  product,
  className = "",
  extraWhatsappNote,
  quoteOnly = false,
  variantName,
  variantId,
  onClick,
}: UnifiedButtonProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { content, getText } = useSiteContent();
  const fallbackWhatsapp = getContactInfo(content).whatsapp;
  const globalDefaultMessage = getText("whatsapp_default_message", "");

  const [mediaFailed, setMediaFailed] = useState(false);

  // Fusionar estilo legado con estilo unificado y override de accesibilidad
  const baseUnified = productButtonToUnified(button);
  const unifiedStyle: UnifiedButtonStyle = {
    ...baseUnified,
    ...styleOverride,
  };

  const a11y = getBestAccessibility(
    unifiedStyle,
    button.text,
    button.action_type,
  );

  const isFillMedia =
    (unifiedStyle.type === "imageFill" ||
      unifiedStyle.type === "videoFill" ||
      unifiedStyle.type === "lottieFill" ||
      Boolean(unifiedStyle.bgImageUrl)) &&
    !mediaFailed;

  function cartPayload() {
    if (!product)
      return { product_id: "", slug: "", name: "", price_cop: 0, image_url: null };
    return {
      product_id: cartLineKey(product.id, variantId),
      slug: product.slug,
      name: product.name,
      price_cop: product.price_cop,
      image_url: product.image_url,
    };
  }

  function handleAction(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (onClick) onClick();

    switch (button.action_type) {
      case "link": {
        const val = button.action_value.trim();
        if (!val) return;
        if (/^https?:\/\//i.test(val)) {
          window.open(val, "_blank", "noopener,noreferrer");
        } else {
          router.navigate({ to: val.startsWith("/") ? val : `/${val}` });
        }
        return;
      }
      case "whatsapp": {
        const number = button.action_value.trim() || fallbackWhatsapp;
        const msg = (button.whatsapp_message || globalDefaultMessage || "").replaceAll(
          "{{variante}}",
          variantName ?? "",
        );
        const text = buildButtonWhatsappText(
          { ...button, whatsapp_message: msg },
          {
            name: product?.name ?? (button.text || ""),
            slug: product?.slug ?? "",
            image_url: product?.image_url ?? button.media_url ?? null,
            images: product?.images ?? [],
            price: product ? formatCOP(product.price_cop) : "",
            variant_id: variantId ?? null,
          },
          extraWhatsappNote ?? "",
          globalDefaultMessage
        );

        const url = waLink(number, text);
        if (!url) {
          toast.error("Configura WhatsApp en /panel/marca");
          return;
        }
        openExternalUrl(url);
        return;
      }
      case "add_to_cart": {
        if (!product || quoteOnly) return;
        addItem(cartPayload());
        toast.success(`${product.name} se añadió al carrito`);
        return;
      }
      case "checkout": {
        if (!product || quoteOnly) return;
        addItem(cartPayload());
        router.navigate({ to: "/carrito" });
        return;
      }
    }
  }

  // Resolver clase de animación o resplandor neón/pulso
  const animClass =
    button.animation_style && button.animation_style !== "none"
      ? `theme-anim-${button.animation_style}`
      : "";

  // Construcción de estilos dinámicos de fondo
  let bgStyle: React.CSSProperties = {};
  if (!isFillMedia) {
    if (unifiedStyle.type === "gradient" && unifiedStyle.gradientFrom) {
      const angle = unifiedStyle.gradientAngle ?? 135;
      const toCol = unifiedStyle.gradientTo || "#f97316";
      bgStyle.background = `linear-gradient(${angle}deg, ${unifiedStyle.gradientFrom}, ${toCol})`;
    } else if (unifiedStyle.background) {
      bgStyle.backgroundColor = unifiedStyle.background;
    } else if (button.custom_hex) {
      bgStyle.backgroundColor = button.custom_hex;
    } else if (button.color_id) {
      bgStyle.backgroundColor = `var(--theme-color-${button.color_id})`;
    }
  }

  const roundedClass = unifiedStyle.rounded
    ? `rounded-${unifiedStyle.rounded}`
    : "rounded-xl";

  const widthClass = button.width === "full" ? "w-full" : "w-auto";

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className={`${widthClass} inline-block`}
    >
      <button
        type="button"
        aria-label={a11y.ariaLabel || button.text}
        onClick={handleAction}
        style={{ ...bgStyle, color: a11y.textColor }}
        className={`relative overflow-hidden cursor-pointer select-none border border-black/10 shadow-md transition-all ${widthClass} ${roundedClass} ${a11y.tapTargetClass} ${a11y.focusClass} ${animClass} ${className}`}
      >
        {/* CAPA DE FONDO VIVO (VIDEO, GIF O IMAGEN DE FONDO COMPLETO) */}
        {isFillMedia && unifiedStyle.bgImageUrl && (
          <>
            {unifiedStyle.type === "videoFill" || button.animation_type === "video" ? (
              <video
                src={unifiedStyle.bgImageUrl}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setMediaFailed(true)}
                className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
              />
            ) : unifiedStyle.type === "lottieFill" || button.animation_type === "lottie" ? (
              <div className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-80">
                <LottiePlayer url={unifiedStyle.bgImageUrl} className="h-full w-full" />
              </div>
            ) : (
              <img
                src={unifiedStyle.bgImageUrl}
                alt=""
                onError={() => setMediaFailed(true)}
                className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
              />
            )}

            {/* OVERLAY OSCURO AUTOMÁTICO PARA ACCESIBILIDAD WCAG */}
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-black transition-opacity"
              style={{ opacity: a11y.overlayOpacity / 100 }}
            />
          </>
        )}

        {/* CAPA DE CONTENIDO: TEXTO CON DROP-SHADOW + ÍCONO OPCIONAL */}
        <span
          className={`relative z-10 flex items-center justify-center gap-2 ${a11y.textShadowClass}`}
        >
          {unifiedStyle.iconPosition === "left" && unifiedStyle.iconUrl && (
            <img
              src={unifiedStyle.iconUrl}
              alt=""
              className="h-5 w-5 rounded-full object-cover shrink-0"
            />
          )}

          <span className="truncate">{button.text}</span>

          {unifiedStyle.iconPosition === "right" && unifiedStyle.iconUrl && (
            <img
              src={unifiedStyle.iconUrl}
              alt=""
              className="h-5 w-5 rounded-full object-cover shrink-0"
            />
          )}
        </span>
      </button>
    </motion.div>
  );
}
