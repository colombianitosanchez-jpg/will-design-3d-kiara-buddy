import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, MessageCircle } from "lucide-react";
import logoAsset from "@/assets/will_logo.asset.json";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";


const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/tienda", label: "Tienda" },
  { to: "/servicios", label: "Servicios" },
  { to: "/galeria", label: "Galería" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);
  const WHATSAPP_URL = waLink(contact.whatsapp, "Hola Will Design 3D");
  return (

    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src={logoAsset.url}
            alt="Will Design 3D"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-black tracking-tight sm:text-lg">
              Will Design{" "}
              <span style={{ color: "var(--brand-orange)" }}>3D</span>
            </p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Impresión 3D · Bogotá
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted hover:text-foreground"
              activeProps={{
                className:
                  "rounded-full px-3 py-2 text-sm font-semibold bg-muted text-foreground",
              }}
            >
              {l.label}
            </Link>
          ))}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-primary ml-2 text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </nav>

        <button
          aria-label="Abrir menú"
          className="rounded-full border border-border p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="btn-primary mt-2 text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
