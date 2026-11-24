import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { MessageCircle, Phone, MapPin, Mail, Send, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { openExternalUrl } from "@/lib/whatsapp";
import { getCanonicalBaseUrl, resolvePageSeo } from "@/lib/seo";
import {
  parseContactBlocksOrder,
  parseContactChannels,
  parseSocialLinks,
  resolvePrimaryWhatsappChannel,
  type ContactBlockKey,
} from "@/lib/contact-config";
import { SOCIAL_PLATFORM_LABELS, SocialPlatformIcon } from "@/components/SocialPlatformIcon";

export const Route = createFileRoute("/contacto")({
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.ensureQueryData(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: { loaderData?: { siteContent?: Record<string, string> } }) => {
    const siteContent = loaderData?.siteContent;
    const baseUrl = getCanonicalBaseUrl(siteContent);
    const canonicalUrl = `${baseUrl}/contacto`;
    const seo = resolvePageSeo("contacto", siteContent);
    const businessName = siteContent?.site_business_name || "Will Design 3D";
    const areaServed = siteContent?.site_area_served || "";

    const metaTags: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: canonicalUrl },
    ];

    if (seo.image) {
      metaTags.push(
        { property: "og:image", content: seo.image },
        { name: "twitter:image", content: seo.image },
      );
    }

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: canonicalUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: businessName,
            url: `${baseUrl}/`,
            description: seo.description,
            address: {
              "@type": "PostalAddress",
              addressLocality: "Bogotá",
              addressCountry: "CO",
            },
            areaServed: areaServed,
          }),
        },
      ],
    };
  },

  component: ContactoPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(100),
  contact: z.string().trim().min(5, "Correo o teléfono válido").max(120),
  subject: z.string().trim().min(2, "Asunto obligatorio").max(120),
  message: z.string().trim().min(10, "Cuéntanos un poco más").max(1000),
});

function ContactoPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);

  const blocksOrder = parseContactBlocksOrder(content?.contact_blocks_order);
  const channels = parseContactChannels(content?.contact_channels, content);
  const socialLinks = parseSocialLinks(content?.contact_social_links, content);
  const primaryWa = resolvePrimaryWhatsappChannel(channels, contact.whatsapp);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      name: String(fd.get("name") ?? ""),
      contact: String(fd.get("contact") ?? ""),
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    const msg = `Hola ${content?.site_business_name || "Will Design 3D"}, soy ${parsed.data.name}.\nAsunto: ${parsed.data.subject}\nContacto: ${parsed.data.contact}\n\n${parsed.data.message}`;
    const targetWhatsapp = primaryWa.number || contact.whatsapp;
    const url = waLink(targetWhatsapp, msg);
    if (!url) {
      toast.error("Configura WhatsApp en /panel/marca");
      return;
    }
    openExternalUrl(url);
  };

  const renderBlock = (blockKey: ContactBlockKey): ReactNode => {
    switch (blockKey) {
      case "canales": {
        return (
          <section key="canales" aria-labelledby="contacto-canales-heading">
            <div className="mb-5">
              <h2 id="contacto-canales-heading" className="text-2xl font-black tracking-tight">
                Canales directos
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Comunícate directamente con nuestro equipo por el canal que prefieras.
              </p>
            </div>
            {channels.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                Aún no hay canales de contacto configurados.
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                {channels.map((ch) => {
                  const display = ch.displayValue || ch.value;
                  if (ch.type === "whatsapp") {
                    const href = waLink(ch.value) || "#";
                    return (
                      <li key={ch.id}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            const u = waLink(ch.value);
                            if (!u) {
                              e.preventDefault();
                              toast.error("Configura WhatsApp en /panel/marca");
                              return;
                            }
                            if (typeof window !== "undefined" && window.self !== window.top) {
                              e.preventDefault();
                              openExternalUrl(u);
                            }
                          }}
                          className="group flex h-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <span
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                            style={{
                              background: "color-mix(in oklab, var(--brand-orange) 15%, white)",
                              color: "var(--brand-orange)",
                            }}
                          >
                            <MessageCircle className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold truncate">{ch.label}</span>
                            <span className="block text-muted-foreground truncate">{display}</span>
                          </span>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition group-hover:opacity-100" />
                        </a>
                      </li>
                    );
                  }

                  if (ch.type === "phone") {
                    const cleanTel = ch.value.replace(/[^\d+]/g, "");
                    return (
                      <li key={ch.id}>
                        <a
                          href={`tel:${cleanTel}`}
                          className="group flex h-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <span
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                            style={{
                              background: "color-mix(in oklab, var(--brand-teal) 15%, white)",
                              color: "var(--brand-teal-deep)",
                            }}
                          >
                            <Phone className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold truncate">{ch.label}</span>
                            <span className="block text-muted-foreground truncate">{display}</span>
                          </span>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition group-hover:opacity-100" />
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={ch.id}>
                      <a
                        href={`mailto:${ch.value}`}
                        className="group flex h-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                          style={{
                            background: "color-mix(in oklab, var(--brand-wine) 12%, white)",
                            color: "var(--brand-wine)",
                          }}
                        >
                          <Mail className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold truncate">{ch.label}</span>
                          <span className="block text-muted-foreground truncate">{display}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition group-hover:opacity-100" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      }

      case "mapa": {
        if (!contact.location_text && !contact.map_embed_url) return null;
        return (
          <section key="mapa" aria-labelledby="contacto-mapa-heading">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
                <div className="flex items-center gap-3.5">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                    style={{
                      background: "color-mix(in oklab, var(--brand-wine) 12%, white)",
                      color: "var(--brand-wine)",
                    }}
                  >
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="contacto-mapa-heading" className="text-lg font-black">
                      Ubicación física
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {contact.location_text || contact.location_short || "Bogotá, Colombia"}
                    </p>
                  </div>
                </div>
              </div>
              {contact.map_embed_url && (
                <div className="p-3 sm:p-4">
                  <div className="overflow-hidden rounded-2xl border border-border">
                    <iframe
                      title="Ubicación"
                      src={contact.map_embed_url}
                      className="h-72 w-full sm:h-80"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      }

      case "redes": {
        if (socialLinks.length === 0) return null;
        return (
          <section key="redes" aria-labelledby="contacto-redes-heading">
            <div className="mb-5">
              <h2 id="contacto-redes-heading" className="text-2xl font-black tracking-tight">
                Redes sociales
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sigue nuestros proyectos recientes, impresiones y novedades del taller.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {socialLinks.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex h-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform group-hover:scale-105"
                      style={{
                        background: "color-mix(in oklab, var(--brand-teal) 15%, white)",
                        color: "var(--brand-teal-deep)",
                      }}
                    >
                      <SocialPlatformIcon platform={social.platform} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold truncate">
                        {SOCIAL_PLATFORM_LABELS[social.platform] || "Red social"}
                      </span>
                      <span className="block text-muted-foreground truncate">{social.label}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      }

      case "formulario": {
        return (
          <section key="formulario" aria-labelledby="contacto-form-heading">
            <form
              onSubmit={onSubmit}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <h2 id="contacto-form-heading" className="text-2xl font-black">
                Envíanos un mensaje
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Al enviar, te llevamos directo a WhatsApp{primaryWa.display ? ` (${primaryWa.display})` : ""} con tu mensaje listo.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre"
                  name="name"
                  placeholder="Tu nombre"
                  error={errors.name}
                />
                <Field
                  label="Correo o teléfono"
                  name="contact"
                  placeholder="tu@correo.com o +57 300 000 0000"
                  error={errors.contact}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Asunto"
                    name="subject"
                    placeholder="Ej: cotización impresión gran formato"
                    error={errors.subject}
                  />
                </div>
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-medium">Mensaje</span>
                  <textarea
                    name="message"
                    rows={5}
                    maxLength={1000}
                    className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Cuéntanos tu proyecto…"
                  />
                  {errors.message && (
                    <span className="text-xs text-destructive">
                      {errors.message}
                    </span>
                  )}
                </label>

                <div className="sm:col-span-2">
                  <button type="submit" className="btn-primary mt-2 w-full py-3">
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Enviar por WhatsApp
                  </button>
                </div>
              </div>
            </form>
          </section>
        );
      }
    }
  };

  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 md:py-20">
          <span className="chip-teal">Contacto</span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl md:text-6xl">
            Hablemos de tu{" "}
            <span style={{ color: "var(--brand-orange)" }}>proyecto</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Escríbenos por el canal que prefieras. Solemos responder el mismo
            día hábil.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-14 sm:px-6 md:py-20">
        {blocksOrder.map((blockKey) => renderBlock(blockKey))}
      </div>
    </>
  );
}

function Field({
  label,
  name,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  placeholder: string;
  error?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        maxLength={200}
        placeholder={placeholder}
        className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
