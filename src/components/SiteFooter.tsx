import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, MessageCircle, MapPin } from "lucide-react";
import logoAsset from "@/assets/will_logo.asset.json";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";

export function SiteFooter() {
  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);

  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Will Design 3D"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover"
            />
            <p className="text-base font-black">
              Will Design{" "}
              <span style={{ color: "var(--brand-orange)" }}>3D</span>
            </p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Tu socio integral en impresión 3D en Colombia. Diseño, producción y
            asesoría técnica.
          </p>
          <p className="mt-4 text-sm font-medium">
            Supervisado por Kiara <span aria-hidden>🐾</span>
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Servicios
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/servicios" className="hover:underline">
                Impresión 3D a pedido
              </Link>
            </li>
            <li>
              <Link to="/servicios" className="hover:underline">
                Diseño 3D personalizado
              </Link>
            </li>
            <li>
              <Link to="/servicios" className="hover:underline">
                Mantenimiento y upgrades
              </Link>
            </li>
            <li>
              <Link to="/servicios" className="hover:underline">
                Post-procesado y pintura
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tienda
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/tienda" className="hover:underline">
                Impresoras 3D
              </Link>
            </li>
            <li>
              <Link to="/tienda" className="hover:underline">
                Filamentos y resinas
              </Link>
            </li>
            <li>
              <Link to="/tienda" className="hover:underline">
                Escáners y accesorios
              </Link>
            </li>
            <li>
              <Link to="/tienda" className="hover:underline">
                Repuestos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Contacto
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            <li>
              <a
                href={waLink(contact.whatsapp)}
                target="_blank"
                rel="noreferrer"
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

          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Will Design 3D. Todos los derechos reservados.</p>
          <p className="flex items-center gap-3">
            <Link to="/panel" className="hover:underline">Panel</Link>
            <span>· Hecho con 🐾 en Bogotá</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
