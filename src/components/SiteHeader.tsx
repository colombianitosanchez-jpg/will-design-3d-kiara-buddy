import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, MessageCircle, ChevronDown } from "lucide-react";
import logoAsset from "@/assets/will_logo.asset.json";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { menuItemsQuery, menuHref, type MenuNodeData } from "@/lib/menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_BEFORE = [{ to: "/", label: "Inicio" }] as const;
const NAV_AFTER = [
  { to: "/galeria", label: "Galería" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
] as const;

const linkClass =
  "rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted hover:text-foreground";
const activeLinkClass =
  "rounded-full px-3 py-2 text-sm font-semibold bg-muted text-foreground";

/** Recursive renderer for dropdown content (desktop). */
function MenuNode({ node, onNavigate }: { node: MenuNodeData; onNavigate?: () => void }) {
  const href = menuHref(node);
  if (node.children.length > 0) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-sm font-medium">
          {node.label}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-48">
          {href && (
            <DropdownMenuItem asChild className="text-sm font-semibold">
              <a href={href} onClick={onNavigate}>
                Ver todo: {node.label}
              </a>
            </DropdownMenuItem>
          )}
          {node.children.map((child) => (
            <MenuNode key={child.id} node={child} onNavigate={onNavigate} />
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  if (!href) {
    return (
      <DropdownMenuItem disabled className="text-sm">
        {node.label}
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem asChild className="text-sm">
      <a href={href} onClick={onNavigate}>
        {node.label}
      </a>
    </DropdownMenuItem>
  );
}

function DesktopRoot({ node }: { node: MenuNodeData }) {
  const [open, setOpen] = useState(false);
  const href = menuHref(node);

  if (node.children.length === 0) {
    if (!href) {
      return <span className={`${linkClass} opacity-60`}>{node.label}</span>;
    }
    return (
      <a href={href} className={linkClass}>
        {node.label}
      </a>
    );
  }

  return (
    <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger className={`${linkClass} inline-flex items-center gap-1 outline-none`}>
          {node.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="min-w-52">
          {href && (
            <DropdownMenuItem asChild className="text-sm font-semibold">
              <a href={href} onClick={() => setOpen(false)}>
                Ver todo: {node.label}
              </a>
            </DropdownMenuItem>
          )}
          {node.children.map((child) => (
            <MenuNode key={child.id} node={child} onNavigate={() => setOpen(false)} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


/** Recursive accordion renderer (mobile). */
function MobileNode({
  node,
  depth = 0,
  onNavigate,
}: {
  node: MenuNodeData;
  depth?: number;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const href = menuHref(node);
  const pad = { paddingLeft: `${12 + depth * 14}px` };

  if (node.children.length > 0) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={pad}
          className="flex w-full items-center justify-between rounded-lg py-2 pr-3 text-left text-sm font-medium hover:bg-muted"
        >
          {node.label}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="flex flex-col gap-1">
            {node.children.map((child) => (
              <MobileNode key={child.id} node={child} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!href) {
    return (
      <span style={pad} className="block py-2 pr-3 text-sm text-muted-foreground">
        {node.label}
      </span>
    );
  }

  return (
    <a
      href={href}
      onClick={onNavigate}
      style={pad}
      className="block rounded-lg py-2 pr-3 text-sm font-medium hover:bg-muted"
    >
      {node.label}
    </a>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data: content } = useQuery(siteContentQuery());
  const { data: menu } = useQuery(menuItemsQuery());
  const contact = getContactInfo(content);
  const WHATSAPP_URL = waLink(contact.whatsapp, "Hola Will Design 3D");
  const roots = menu ?? [];

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
          {NAV_BEFORE.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className={linkClass}
              activeProps={{ className: activeLinkClass }}
            >
              {l.label}
            </Link>
          ))}

          {roots.map((node) => (
            <DesktopRoot key={node.id} node={node} />
          ))}

          {NAV_AFTER.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={linkClass}
              activeProps={{ className: activeLinkClass }}
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
          <nav className="mx-auto flex max-h-[75vh] max-w-7xl flex-col gap-1 overflow-y-auto px-4 py-3">
            {NAV_BEFORE.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}

            {roots.map((node) => (
              <MobileNode key={node.id} node={node} onNavigate={() => setOpen(false)} />
            ))}

            {NAV_AFTER.map((l) => (
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
