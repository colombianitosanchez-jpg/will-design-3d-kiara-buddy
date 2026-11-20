import { productShareLink } from "@/lib/product-share";
import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart";
import { useSiteContent } from "@/hooks/use-site-content";
import { getContactInfo, waLink, formatCOP, type Product } from "@/lib/catalog";
import { openExternalUrl } from "@/lib/whatsapp";
import { getActiveTheme } from "@/lib/theme";
import { cartLineKey } from "@/lib/payment-rules";
import { OrderQuickCaptureModal } from "@/components/OrderQuickCaptureModal";
import {
  buildButtonWhatsappText,
  ICON_SHAPE_CLIP_PATHS,
  type ProductButton,
  type ButtonIconShape,
} from "@/lib/product-buttons";
import {
  getBestAccessibility,
  productButtonToUnified,
  type UnifiedButtonStyle,
} from "@/lib/unifiedButton";

export function getIconShapeStyle(shape?: ButtonIconShape): { className: string; style?: React.CSSProperties } {
  switch (shape) {
    case "square":
      return { className: "rounded-none object-cover" };
    case "rounded":
      return { className: "rounded-md object-cover" };
    case "original":
      return { className: "object-contain" };
    case "hexagon":
    case "diamond":
    case "star":
    case "shield":
    case "octagon": {
      const clip = ICON_SHAPE_CLIP_PATHS[shape];
      return {
        className: "object-cover",
        style: clip
          ? {
              clipPath: clip,
              WebkitClipPath: clip,
            }
          : undefined,
      };
    }
    case "circle":
    default:
      return { className: "rounded-full object-cover" };
  }
}

type LottieComponentType = React.ComponentType<{ animationData: unknown; loop?: boolean; className?: string }>;

function LottiePlayer({ url, className }: { url: string; className?: string }) {
  const [data, setData] = useState<unknown>(null);
  const [LottieComp, setLottieComp] = useState<LottieComponentType | null>(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    Promise.all([
      fetch(url).then((res) => res.json()),
      import("lottie-react").then((m) => {
        const mod = m as unknown as { default?: LottieComponentType; Lottie?: LottieComponentType };
        return mod.Lottie || mod.default || null;
      }),
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
  /** Original catalog record, before selected-variant presentation overrides. */
  shareProduct?: Product;
  className?: string;
  extraWhatsappNote?: string;
  quoteOnly?: boolean;
  variantName?: string | null;
  variantId?: string | null;
  onClick?: () => void;
  children?: React.ReactNode;
  interactive?: boolean;
}

export function UnifiedButton({
  button,
  styleOverride,
  product,
  shareProduct,
  className = "",
  extraWhatsappNote,
  quoteOnly = false,
  variantName,
  variantId,
  onClick,
  children,
  interactive = true,
}: UnifiedButtonProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { content, getText } = useSiteContent();
  const fallbackWhatsapp = getContactInfo(content).whatsapp;
  const globalDefaultMessage = getText("whatsapp_default_message", "");

  const [mediaFailed, setMediaFailed] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  // Fusionar estilo legado con estilo unificado y override de accesibilidad
  const activeTheme = getActiveTheme(content);
  const baseUnified = productButtonToUnified(button);
  const hasLocalMedia = Boolean(
    baseUnified.bgImageUrl ||
      styleOverride?.bgImageUrl ||
      button.animation_type === "image" ||
      button.animation_type === "video" ||
      button.animation_type === "lottie",
  );
  const themeBtnMedia = !hasLocalMedia ? activeTheme.buttonStyle.mediaUrl?.trim() : "";
  const themeBtnMediaType = activeTheme.buttonStyle.mediaType ?? "image";
  const themeUnifiedMediaOverride: Partial<UnifiedButtonStyle> = themeBtnMedia
    ? {
        bgImageUrl: themeBtnMedia,
        type:
          themeBtnMediaType === "video"
            ? "videoFill"
            : themeBtnMediaType === "lottie"
              ? "lottieFill"
              : "imageFill",
      }
    : {};

  const unifiedStyle: UnifiedButtonStyle = {
    ...baseUnified,
    ...themeUnifiedMediaOverride,
    ...styleOverride,
    ...(typeof button.shade === "number" ? { shade: button.shade } : {}),
  };

  const a11y = getBestAccessibility(
    unifiedStyle,
    button.text,
    button.action_type,
  );

  const effectiveButtonOverlay =
    !hasLocalMedia &&
    themeBtnMedia &&
    typeof activeTheme.buttonStyle.overlayOpacity === "number"
      ? activeTheme.buttonStyle.overlayOpacity
      : a11y.overlayOpacity;

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

    if (onClick) {
      onClick();
      return;
    }

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
        const hasValidDigits =
          Boolean(button.action_value && button.action_value.replace(/\D/g, "").length >= 7);
        const number = hasValidDigits ? button.action_value.trim() : fallbackWhatsapp;

        if (product && !quoteOnly && button.capture_order !== false) {
          if (!number) {
            toast.error("Configura WhatsApp en /panel/marca");
            return;
          }
          setQuickCaptureOpen(true);
          return;
        }

        const text = buildButtonWhatsappText(
          button,
          {
            name: product?.name ?? (button.text || ""),
            slug: product?.slug ?? "",
            image_url: product?.image_url ?? button.media_url ?? null,
            images: product?.images ?? [],
            price: product ? formatCOP(product.price_cop) : "",
            variant_id: variantId ?? null,
            variant_name: variantName ?? null,
            ...(product ? { share_url: productShareLink(shareProduct ?? product, variantId ?? null, button.id) } : {}),
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
      case "order_request": {
        if (!product || quoteOnly) return;
        if (typeof window !== "undefined" && window.location.pathname === `/tienda/${product.slug}`) {
          window.dispatchEvent(new CustomEvent("wd3d:order-request"));
        } else {
          router.navigate({ to: "/tienda/$slug", params: { slug: product.slug }, search: { pedir: "1", ...(variantId ? { v: variantId } : {}) } });
        }
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

  const globalButtonAnim =
    typeof document !== "undefined" ? document.documentElement.dataset.themeAnimation : undefined;
  const effectiveAnim =
    button.animation_style && button.animation_style !== "none"
      ? button.animation_style
      : globalButtonAnim && globalButtonAnim !== "none"
        ? globalButtonAnim
        : "none";

  // Resolver clase de animación o resplandor neón/pulso
  const animClass =
    effectiveAnim !== "none" ? `theme-anim-${effectiveAnim}` : "";

  // Construcción de estilos dinámicos de fondo
  const bgStyle: React.CSSProperties = {};
  {
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
    : "rounded-[var(--btn-radius,0.75rem)]";

  const widthClass = button.width === "full" ? "w-full" : "w-auto";
  const effectiveMediaFit = !hasLocalMedia && themeBtnMedia
    ? (activeTheme.buttonStyle.mediaFit ?? "cover")
    : button.media_fit;
  const fitClass =
    effectiveMediaFit === "contain"
      ? "object-contain"
      : effectiveMediaFit === "fill"
      ? "object-fill"
      : "object-cover";
  const iconShapeConfig = getIconShapeStyle(button.icon_shape);
  const solidShade = !isFillMedia ? a11y.overlayOpacity : 0;
  function renderIcon() {
    const url = unifiedStyle.iconUrl;
    if (!url) return null;
    const className = `h-5 w-5 shrink-0 ${iconShapeConfig.className}`;
    if (/\.json($|\?)/i.test(url)) return <span className={`${className} overflow-hidden`} style={iconShapeConfig.style}><LottiePlayer url={url} className="h-full w-full" /></span>;
    if (/\.(mp4|webm|mov)($|\?)/i.test(url)) return <video src={url} autoPlay loop muted playsInline style={iconShapeConfig.style} className={className} />;
    return <img src={url} alt="" width={20} height={20} loading="lazy" decoding="async" style={iconShapeConfig.style} className={className} />;
  }

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className={`${widthClass} inline-block`}
    >
      <button
        type="button"
        aria-label={a11y.ariaLabel || button.text}
        disabled={!interactive}
        onClick={handleAction}
        style={{
          color:
            !button.text_color && !styleOverride?.textColor && activeTheme.buttonStyle.textColor
              ? activeTheme.buttonStyle.textColor
              : a11y.textColor,
        }}
        className={`unified-theme-btn relative overflow-hidden cursor-pointer select-none border border-black/10 shadow-md transition-all ${widthClass} ${roundedClass} ${a11y.tapTargetClass} ${a11y.focusClass} ${animClass} ${className}`}
      >
        {/* CAPA DE COLOR DE FONDO: la opacidad solo afecta al fondo, nunca al texto */}
        {/* Siempre presente: respaldo bajo el fondo vivo (se ve en modo 'contain' o si el video falla) */}
        {(
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={bgStyle}
          />
        )}
        {!isFillMedia && solidShade > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-black"
            style={{ opacity: solidShade / 100 }}
          />
        )}
        {/* CAPA DE FONDO VIVO (VIDEO, GIF O IMAGEN DE FONDO COMPLETO) */}
        {isFillMedia && unifiedStyle.bgImageUrl && (
          <span aria-hidden className="pointer-events-none absolute inset-0 z-0 block overflow-hidden rounded-[inherit]">
            {unifiedStyle.type === "videoFill" || button.animation_type === "video" ? (
              <video
                src={unifiedStyle.bgImageUrl}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setMediaFailed(true)}
                className={`pointer-events-none absolute inset-0 z-0 h-full w-full object-center ${fitClass}`}
              />
            ) : unifiedStyle.type === "lottieFill" || button.animation_type === "lottie" ? (
              <div className="pointer-events-none absolute inset-0 z-0 h-full w-full flex items-center justify-center overflow-hidden opacity-80">
                <LottiePlayer url={unifiedStyle.bgImageUrl} className="h-full w-full" />
              </div>
            ) : (
              <img
                src={unifiedStyle.bgImageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setMediaFailed(true)}
                className={`pointer-events-none absolute inset-0 z-0 h-full w-full object-center ${fitClass}`}
              />
            )}

            {/* OVERLAY OSCURO AUTOMÁTICO PARA ACCESIBILIDAD WCAG */}
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-black transition-opacity"
              style={{ opacity: effectiveButtonOverlay / 100 }}
            />
          </span>
        )}

        {/* CAPA DE CONTENIDO: TEXTO CON DROP-SHADOW + ÍCONO OPCIONAL */}
        <span
          className={`relative z-10 flex items-center justify-center gap-2 ${a11y.textShadowClass}`}
        >
          {unifiedStyle.iconPosition === "left" && unifiedStyle.iconUrl && (
            renderIcon()
          )}

          {children || <span className="truncate">{button.text}</span>}

          {unifiedStyle.iconPosition === "right" && unifiedStyle.iconUrl && (
            renderIcon()
          )}
        </span>
      </button>
      {product && !quoteOnly && button.action_type === "whatsapp" && button.capture_order !== false && (
        <OrderQuickCaptureModal
          open={quickCaptureOpen}
          onOpenChange={setQuickCaptureOpen}
          product={product}
          variantId={variantId}
          variantName={variantName}
          whatsappNumber={
            button.action_value && button.action_value.replace(/\D/g, "").length >= 7
              ? button.action_value.trim()
              : fallbackWhatsapp
          }
          shareUrl={productShareLink(shareProduct ?? product, variantId ?? null, button.id)}
          customNote={extraWhatsappNote}
        />
      )}
    </motion.div>
  );
}
