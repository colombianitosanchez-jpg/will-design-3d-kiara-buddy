import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { MessageCircle, Instagram, MapPin, Mail, Send } from "lucide-react";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { getSeo } from "@/lib/seo";

export const Route = createFileRoute("/contacto")({
  loader: async ({ context }) => {
    const siteContent = await context.queryClient.ensureQueryData(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const seo = getSeo(
      {
        title: siteContent?.site_title ? `Contacto · ${siteContent.site_title}` : "Contacto — Will Design 3D",
      },
      siteContent
    );
    const businessName = siteContent?.site_business_name || "Will Design 3D";
    const areaServed = siteContent?.site_area_served || "";

    const metaTags: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: "https://willdesign3d.com/contacto" },
    ];

    if (seo.image) {
      metaTags.push(
        { property: "og:image", content: seo.image },
        { name: "twitter:image", content: seo.image }
      );
    }

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: "https://willdesign3d.com/contacto" }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: businessName,
            url: "https://willdesign3d.com/",
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
    const msg = `Hola Will Design 3D, soy ${parsed.data.name}.\nAsunto: ${parsed.data.subject}\nContacto: ${parsed.data.contact}\n\n${parsed.data.message}`;
    window.open(waLink(contact.whatsapp, msg), "_blank");
  };


  return (
    <>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
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

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_1.2fr] md:py-20">
        <div>
          <h2 className="text-xl font-black">Canales directos</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                href={waLink(contact.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-full"
                  style={{
                    background: "color-mix(in oklab, var(--brand-orange) 15%, white)",
                    color: "var(--brand-orange)",
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold">WhatsApp</span>
                  <span className="text-muted-foreground">{contact.whatsapp_display}</span>
                </span>
              </a>
            </li>
            <li>
              <a
                href={contact.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-full"
                  style={{
                    background: "color-mix(in oklab, var(--brand-teal) 15%, white)",
                    color: "var(--brand-teal-deep)",
                  }}
                >
                  <Instagram className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold">Instagram</span>
                  <span className="text-muted-foreground">{contact.instagram_handle}</span>
                </span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-full"
                  style={{
                    background: "color-mix(in oklab, var(--brand-wine) 12%, white)",
                    color: "var(--brand-wine)",
                  }}
                >
                  <Mail className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold">Correo</span>
                  <span className="text-muted-foreground">{contact.email}</span>
                </span>
              </a>
            </li>
            <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <span
                className="grid h-10 w-10 place-items-center rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--brand-wine) 12%, white)",
                  color: "var(--brand-wine)",
                }}
              >
                <MapPin className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-bold">Ubicación</span>
                <span className="text-muted-foreground">{contact.location_text}</span>
              </span>
            </li>
          </ul>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <iframe
              title="Ubicación"
              src={contact.map_embed_url}
              className="h-64 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>


        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-xl font-black">Envíanos un mensaje</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Al enviar, te llevamos directo a WhatsApp con tu mensaje listo.
          </p>

          <div className="mt-6 grid gap-4">
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
            <Field
              label="Asunto"
              name="subject"
              placeholder="Ej: cotización impresión gran formato"
              error={errors.subject}
            />
            <label className="grid gap-1 text-sm">
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

            <button type="submit" className="btn-primary mt-2 w-full py-3">
              <Send className="h-4 w-4" />
              Enviar por WhatsApp
            </button>
          </div>
        </form>
      </section>
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
