import { useState, useEffect } from "react";
import { Link, useMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, MessageCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";
import { siteContentQuery, categoriesQuery, getContactInfo, waLink } from "@/lib/catalog";
import { openExternalUrl } from "@/lib/whatsapp";
import { siteServicesQuery } from "@/routes/servicios";

export function SiteFooter() {
  const [year, setYear] = useState(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  const matches = useMatches() as any[];
  const rootLoaderData = matches.find((m) => m.routeId === "__root__")?.loaderData;
  const { data: content } = useQuery({
    ...siteContentQuery(),
    initialData: rootLoaderData?.siteContent,
  });
  const { data: dbServices = [] } = useQuery({
    ...siteServicesQuery(),
    initialData: rootLoaderData?.siteServices,
  });
  const { data: allCategories = [] } = useQuery({
    ...categoriesQuery(),
    initialData: rootLoaderData?.categories,
  });

  const contact = getContactInfo(content);
  const logoUrl = content?.site_logo_url?.trim();
  const businessName = content?.site_business_name?.trim() || "Will Design 3D";
  const footerDesc = content?.site_description?.trim() || "";

  const publishedServices = dbServices.filter((s: any) => s.is_active !== false).slice(0, 6);
  const publishedCategories = allCategories
    .filter((c) => c.is_active && !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 6);

  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={businessName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
            <p className="text-base font-black">
              {businessName}
            </p>
          </div>
          {footerDesc && (
            <p className="mt-3 text-sm text-muted-foreground">
              {footerDesc}
            </p>
          )}
          <p className="mt-4 text-sm font-medium">
            Supervisado por Kiara <span aria-hidden>🐾</span>
          </p>
        </div>

        {publishedServices.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Servicios
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {publishedServices.map((s: any) => (
                <li key={s.id || s.slug}>
                  <Link
                    to="/servicios"
                    hash={s.slug || undefined}
                    className="hover:underline"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {publishedCategories.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tienda
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {publishedCategories.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/tienda"
                    search={{ categoria: c.slug }}
                    className="hover:underline"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Contacto
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            <li>
              <a
                href={waLink(contact.whatsapp) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  const url = waLink(contact.whatsapp);
                  if (!url) {
                    e.preventDefault();
                    toast.error("Configura WhatsApp en /panel/marca");
                    return;
                  }
                  if (typeof window !== "undefined" && window.self !== window.top) {
                    e.preventDefault();
                    openExternalUrl(url);
                  }
                }}
                className="inline-flex items-center gap-2 font-semibold hover:underline"
              >
                <MessageCircle className="h-4 w-4 text-[var(--brand-orange)]" />
                {contact.whatsapp_display}
              </a>
            </li>
            <li>
              <a
                href={contact.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold hover:underline"
              >
                <Instagram className="h-4 w-4 text-[var(--brand-teal-deep)]" />
                {contact.instagram_handle}
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--brand-wine)]" />
              {contact.location_short}
            </li>
            <li>
              <ShareButton
                title="Will Design 3D"
                label="Compartir esta página"
                className="h-auto gap-2 p-0 text-sm font-semibold hover:bg-transparent hover:underline"
              />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {year} Will Design 3D. Todos los derechos reservados.</p>
          <p className="flex items-center gap-3">
            <Link to="/panel" className="hover:underline">Panel</Link>
            <span>· Hecho con 🐾 en Bogotá</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
