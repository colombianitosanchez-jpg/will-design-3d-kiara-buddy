import { ProductMedia, isVideoUrl } from "@/components/ProductMedia";
import { StockIndicator } from "@/components/StockIndicator";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShareButton } from "@/components/ShareButton";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Calculator, MessageCircle, ShieldCheck, Truck, Loader2, ShoppingBag, X, CheckCircle2 } from "lucide-react";
import { createOrderRequest } from "@/lib/orders.functions";
import {
  formatCOP,
  gradientKeyFor,
  productBySlugQuery,
  productsQuery,
  siteContentQuery,
  getContactInfo,
  waLink,
  type Product,
} from "@/lib/catalog";

import { KiaraTip } from "@/components/KiaraTip";
import { ProductCard } from "@/components/ProductCard";
import { ProductButtons } from "@/components/ProductButtons";
import { effectiveButtons, variantGallery } from "@/lib/product-variants";
import { productPageUrl } from "@/lib/product-buttons";
import { FileDropzone3D, file3dWaNote, type Dims3D } from "@/components/FileDropzone3D";
import DOMPurify from "isomorphic-dompurify";

/** Solo etiquetas de formato seguras: nunca scripts ni atributos de eventos. */
function sanitizeRichText(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span", "a",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
  });
}

export const Route = createFileRoute("/tienda/$slug")({
  validateSearch: (search: Record<string, unknown>): { v?: string } =>
    typeof search.v === "string" && search.v ? { v: search.v.slice(0, 64) } : {},
  loaderDeps: ({ search }) => ({ v: search.v }),
  loader: async ({ params, context, deps }) => {
    const product = await context.queryClient.ensureQueryData(productBySlugQuery(params.slug));
    if (!product) throw notFound();
    context.queryClient.prefetchQuery(productsQuery());
    return { product, variantId: deps.v ?? null };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Producto no encontrado — Will Design 3D" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const base0 = loaderData.product;
    const v = base0.variants?.find((x) => x.id === loaderData.variantId) ?? null;
    const p = v
      ? { ...base0, name: `${base0.name} — ${v.name}`, image_url: v.image_url ?? base0.image_url, price_cop: v.price_cop ?? base0.price_cop, stock: v.stock ?? base0.stock }
      : base0;
    const url = `https://will-design-3d.lovable.app/tienda/${params.slug}`;
    const base = (p.short || p.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const description = (
      base.length >= 50
        ? base
        : `${p.name} disponible en Will Design 3D, Bogotá. ${base} Asesoría técnica y envíos a todo el país.`
    ).slice(0, 160);
    const rawImage = [p.image_url, ...(p.images ?? [])].find((u) => u && !isVideoUrl(u)) || null;
    const image = rawImage && /^https:\/\//i.test(rawImage) ? rawImage : null;
    return {
      meta: [
        { title: `${p.name} — Will Design 3D` },
        { name: "description", content: description },
        { property: "og:title", content: `${p.name} — Will Design 3D` },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description,
            ...(image ? { image: [image] } : {}),
            ...(p.sku ? { sku: p.sku } : {}),
            ...(p.brand?.name ? { brand: { "@type": "Brand", name: p.brand.name } } : {}),
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "COP",
              price: p.price_cop,
              availability:
                p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          }),
        },
      ],
    };
  },

  notFoundComponent: ProductNotFound,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl font-black">No pudimos cargar el producto</h1>
      <p className="mt-3 text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    </div>
  ),
  component: ProductPage,
});

function ProductNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-black">Producto no encontrado</h1>
      <p className="mt-3 text-muted-foreground">El producto que buscas no está disponible.</p>
      <Link to="/tienda" className="btn-primary mt-6 text-sm">
        Volver a la tienda
      </Link>
    </div>
  );
}

const GRADIENTS: Record<string, string> = {
  orange:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-orange) 30%, white), color-mix(in oklab, var(--brand-orange) 75%, white))",
  teal:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-teal) 30%, white), color-mix(in oklab, var(--brand-teal) 75%, white))",
  wine:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-wine) 30%, white), color-mix(in oklab, var(--brand-wine) 70%, white))",
};

function ProductPage() {
  const { product, variantId: initialVariantId } = Route.useLoaderData() as { product: Product; variantId: string | null };
  const { data: allProducts = [] } = useQuery(productsQuery());
  const related = allProducts
    .filter((p) => p.category?.slug === product.category?.slug && p.slug !== product.slug)
    .slice(0, 3);

  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);

  const gradient = GRADIENTS[gradientKeyFor(product.category?.slug)];
  const productGallery = useMemo(() => {
    const all = [product.image_url, ...(product.images ?? [])].filter(
      (u): u is string => !!u && u.trim().length > 0,
    );
    return Array.from(new Set(all));
  }, [product.image_url, product.images]);
  const [activeImage, setActiveImage] = useState(0);
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState<string | null>(
    (initialVariantId && variants.some((v) => v.id === initialVariantId) ? initialVariantId : null) ??
      variants[0]?.id ??
      null,
  );
  const selectedVariant = variants.find((v) => v.id === variantId) ?? null;
  const gallery = variantGallery(productGallery, selectedVariant);
  const shownPrice = selectedVariant?.price_cop ?? product.price_cop;
  const shownStock = selectedVariant?.stock ?? product.stock;
  const variantProduct: Product = selectedVariant
    ? {
        ...product,
        name: `${product.name} — ${selectedVariant.name}`,
        price_cop: shownPrice,
        stock: shownStock,
        image_url: selectedVariant.image_url ?? product.image_url,
      }
    : product;
  const shownButtons = effectiveButtons(product.custom_buttons, selectedVariant);
  const waHref = waLink(
    contact.whatsapp,
    `Hola Will Design 3D, me interesa el producto: ${variantProduct.name} (${formatCOP(shownPrice)}). ¿Está disponible?`,
  );
  function selectVariant(id: string) {
    setVariantId(id);
    setActiveImage(0);
  }
  function selectImage(i: number) {
    setActiveImage(i);
    // Mostrando la galería general: tocar la foto de una variante la selecciona.
    if (gallery === productGallery) {
      const v = variants.find((x) => x.images.length && x.images.includes(gallery[i]));
      if (v) {
        setVariantId(v.id);
        setActiveImage(Math.max(0, v.images.indexOf(gallery[i])));
      }
    }
  }
  const [orderOpen, setOrderOpen] = useState(false);
  const [file3dName, setFile3dName] = useState<string | null>(null);
  const [file3dDims, setFile3dDims] = useState<Dims3D | null>(null);


  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <Link
          to="/tienda"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la tienda
        </Link>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 md:grid-cols-2 md:py-12">
        <div>
          <div
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl text-5xl font-black text-white/90 shadow-lg"
            style={{ background: gradient }}
          >
            {gallery.length > 0 ? (
              <ProductMedia
                src={gallery[Math.min(activeImage, gallery.length - 1)]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{product.name.split(" ")[0]}</span>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {gallery.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => selectImage(i)}
                  aria-label={`Ver imagen ${i + 1} de ${product.name}`}
                  className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                    i === activeImage
                      ? "border-[var(--brand-orange)]"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <ProductMedia thumb src={url} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brand?.name && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {product.brand.name}
            </p>
          )}
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="text-3xl font-black sm:text-4xl">{product.name}</h1>
            <ShareButton
              title={variantProduct.name}
              text={product.custom_share_text}
              url={selectedVariant ? productPageUrl(product.slug, selectedVariant.id) : undefined}
              className="mt-1 h-9 w-9 shrink-0 text-muted-foreground"
            />
          </div>
          {/<[a-z][\s\S]*>/i.test(product.description ?? "") ? (
            <div
              className="rich-text mt-3 text-muted-foreground"
              // Contenido del editor visual del Panel, saneado antes de mostrarse.
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(product.description) }}
            />
          ) : (
            <p className="mt-3 text-muted-foreground">{product.description}</p>
          )}


          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {product.category?.name && (
              <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
                {product.category.name}
              </span>
            )}
            {product.attributes.map((a) => (
              <span
                key={a.attribute_slug + a.value_label}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground"
              >
                {a.color_hex && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
                    style={{ background: a.color_hex }}
                  />
                )}
                {a.attribute_name}: {a.value_label}
              </span>
            ))}
            {product.sku && (
              <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
                SKU: {product.sku}
              </span>
            )}
          </div>


          {product.quote_only ? (
            <p className="mt-6 text-2xl font-black text-[var(--brand-teal-deep)]">
              Sujeto a cotización
            </p>
          ) : (
            <p className="mt-6 text-4xl font-black text-[var(--brand-wine)]">
              {formatCOP(shownPrice)}
            </p>
          )}
          <StockIndicator stock={shownStock} />

          {variants.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {product.variant_label}: <span className="text-foreground">{selectedVariant?.name}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={product.variant_label}>
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={v.id === variantId}
                    onClick={() => selectVariant(v.id)}
                    className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition ${
                      v.id === variantId
                        ? "border-[var(--brand-orange)] bg-muted"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    {v.image_url && (
                      <ProductMedia thumb src={v.image_url} className="h-6 w-6 rounded-full object-cover" />
                    )}
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!product.quote_only && (
              <button type="button" onClick={() => setOrderOpen(true)} className="btn-primary">
                <ShoppingBag className="h-4 w-4" />
                Solicitar pedido
              </button>
            )}
            <a href={waHref} target="_blank" rel="noreferrer" className="btn-outline">
              <MessageCircle className="h-4 w-4" />
              {product.quote_only ? "Pedir cotización por WhatsApp" : "Consultar por WhatsApp"}
            </a>
            <Link
              to="/cotizador"
              search={{ servicio: "impresion-fdm" }}
              className="btn-outline"
            >
              <Calculator className="h-4 w-4" />
              Cotizar una impresión
            </Link>
          </div>

          {product.accepts_3d_file && (
            <FileDropzone3D
              fileName={file3dName}
              onFileChange={(name, d) => {
                setFile3dName(name);
                setFile3dDims(d ?? null);
              }}
              className="mt-6 max-w-md"
            />
          )}

          {shownButtons.length > 0 && (
            <ProductButtons
              product={variantProduct}
              buttons={shownButtons}
              variantName={selectedVariant?.name ?? null}
              variantId={selectedVariant?.id ?? null}
              className="mt-4"
              extraWhatsappNote={file3dWaNote(file3dName, file3dDims)}
              quoteOnly={product.quote_only}
            />
          )}

          <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[var(--brand-teal-deep)]" />
              Envíos a toda Colombia
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--brand-teal-deep)]" />
              Garantía y soporte técnico
            </li>
          </ul>

          {product.specs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Especificaciones
              </h2>
              <dl className="mt-3 divide-y divide-border rounded-2xl border border-border">
                {product.specs.map((s) => (
                  <div key={s.label} className="grid grid-cols-2 gap-2 p-3 text-sm">
                    <dt className="font-medium text-muted-foreground">{s.label}</dt>
                    <dd className="font-semibold">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.kiara_tip && (
            <div className="mt-6">
              <KiaraTip tip={product.kiara_tip} />
            </div>
          )}
        </div>
      </section>

      {orderOpen && (
        <OrderRequestModal product={product} variantName={selectedVariant?.name ?? null} onClose={() => setOrderOpen(false)} />
      )}

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <h2 className="text-2xl font-black">También te puede interesar</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function OrderRequestModal({ product, variantName, onClose }: { product: Product; variantName: string | null; onClose: () => void }) {
  const submit = useServerFn(createOrderRequest);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    quantity: 1,
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    shipping_city: "",
    notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await submit({ data: { ...form, notes: variantName ? `Variante: ${variantName}${form.notes ? `\n${form.notes}` : ""}` : form.notes, product_id: product.id, quantity: Number(form.quantity) || 1 } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message || "No pudimos enviar tu solicitud.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Solicitar pedido</h2>
            <p className="mt-1 text-sm text-muted-foreground">{product.name}{variantName ? ` — ${variantName}` : ""}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--brand-teal-deep)]" />
            <p className="mt-4 font-bold">¡Solicitud enviada!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Nuestro equipo la verá en el panel de pedidos y te contactará muy pronto.
            </p>
            <button onClick={onClose} className="btn-primary mt-6 text-sm">
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cantidad
              <input
                type="number"
                min={1}
                max={99}
                required
                value={form.quantity}
                onChange={(e) => set("quantity", Number(e.target.value))}
                className={inputCls}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nombre completo
              <input
                required
                value={form.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Correo
              <input
                type="email"
                required
                value={form.customer_email}
                onChange={(e) => set("customer_email", e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Teléfono / WhatsApp
              <input
                value={form.customer_phone}
                onChange={(e) => set("customer_phone", e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
              Dirección de envío
              <input
                required
                value={form.shipping_address}
                onChange={(e) => set("shipping_address", e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ciudad
              <input
                value={form.shipping_city}
                onChange={(e) => set("shipping_city", e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
              Notas (opcional)
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={inputCls}
              />
            </label>

            <p className="text-sm font-bold sm:col-span-2">
              Total estimado: {formatCOP(product.price_cop * (Number(form.quantity) || 1))}
            </p>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

            <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button disabled={sending} className="btn-primary text-sm disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {sending ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
