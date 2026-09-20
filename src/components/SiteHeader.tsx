import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, MessageCircle, ChevronDown, ShoppingCart } from "lucide-react";
import logoAsset from "@/assets/will_logo.asset.json";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { ShareButton, DEFAULT_SHARE_TEXT } from "@/components/ShareButton";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_AFTER = [
  { to: "/galeria", label: "Galería" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
] as const;

const linkClass =
  "rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted hover:text-foreground";
const activeLinkClass = "rounded-full px-3 py-2 text-sm font-semibold bg-muted text-foreground";

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
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="flex flex-col gap-1">
            {href && (
              <a
                href={href}
                onClick={onNavigate}
                style={{ paddingLeft: `${12 + (depth + 1) * 14}px` }}
                className="block rounded-lg py-2 pr-3 text-sm font-semibold hover:bg-muted"
              >
                Ver todo: {node.label}
              </a>
            )}
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

function CartLink({ className }: { className?: string }) {
  const { count: cartCount } = useCart();
  return (
    <Link
      to="/carrito"
      aria-label={`Carrito (${cartCount})`}
      className={`relative rounded-full border border-border p-2 hover:bg-muted ${className ?? ""}`}
    >
      <ShoppingCart className="h-5 w-5" />
      {cartCount > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--brand-orange)] px-1 text-[10px] font-bold text-white">
          {cartCount}
        </span>
      )}
    </Link>
  );
}

function WhatsAppLink({ url, className }: { url: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`btn-primary text-sm ${className ?? ""}`}
    >
      <MessageCircle className="h-4 w-4" />
      WhatsApp
    </a>
  );
}

function MobileNav({ roots, whatsappUrl }: { roots: MenuNodeData[]; whatsappUrl: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Abrir menú"
          className="flex lg:hidden rounded-full border border-border p-2"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-3/4 max-w-sm flex-col">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base font-black tracking-tight">
            Will Design <span style={{ color: "var(--brand-orange)" }}>3D</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1 overflow-y-auto">
          {roots.map((node) => (
            <MobileNode key={node.id} node={node} onNavigate={close} />
          ))}
          {NAV_AFTER.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={close}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={close}
            className="btn-primary mt-4 text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <div onClick={close} className="mt-2">
            <ShareButton
              title="Will Design 3D"
              text={DEFAULT_SHARE_TEXT}
              label="Compartir esta página"
              className="w-full justify-start rounded-lg px-3 text-sm font-medium"
            />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function SiteHeader() {
  const { data: content } = useQuery(siteContentQuery());
  const { data: menu } = useQuery(menuItemsQuery());
  const contact = getContactInfo(content);
  const WHATSAPP_URL = waLink(contact.whatsapp, "Hola Will Design 3D");
  const roots = menu ?? [];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex flex-shrink-0 min-w-max items-center gap-3 whitespace-nowrap">
          <img
            src={logoAsset.url}
            alt="Will Design 3D"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
          <div className="leading-tight">
            <p className="text-base font-black tracking-tight sm:text-lg">
              Will Design <span style={{ color: "var(--brand-orange)" }}>3D</span>
            </p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Impresión 3D · Bogotá
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 xl:gap-6 lg:flex">
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
          <ShareButton
            title="Will Design 3D"
            text={DEFAULT_SHARE_TEXT}
            className="ml-1 rounded-full border border-border text-foreground/80 hover:bg-muted"
          />
          <CartLink className="ml-1" />
          <WhatsAppLink url={WHATSAPP_URL} className="ml-2" />
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <ShareButton
            title="Will Design 3D"
            text={DEFAULT_SHARE_TEXT}
            className="rounded-full border border-border"
          />
          <CartLink />
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="btn-primary inline-flex h-9 w-9 items-center justify-center rounded-full p-0 sm:hidden"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <WhatsAppLink url={WHATSAPP_URL} className="hidden sm:flex" />
          <MobileNav roots={roots} whatsappUrl={WHATSAPP_URL} />
        </div>
      </div>
    </header>
  );
}
