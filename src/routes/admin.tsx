import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wrench,
  Users,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AdminLayout,
});

type Role = "admin" | "staff";

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [email, setEmail] = useState("");
  
  const [mobileOpen, setMobileOpen] = useState(false);

  async function refreshRole() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      navigate({ to: "/auth" });
      return;
    }
    setEmail(userData.user.email ?? "");
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    setRoles((data?.map((r) => r.role) as Role[]) ?? []);
  }

  useEffect(() => {
    refreshRole();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (roles === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">
        Cargando panel…
      </div>
    );
  }

  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff");

  if (!isAdmin && !isStaff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <ShieldCheck className="h-10 w-10 text-[var(--brand-orange)]" />
          <h1 className="mt-4 text-2xl font-black">Sin permisos aún</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta ({email}) no tiene rol asignado.
          </p>
          <p className="mt-4 text-sm">
            Si eres el primer usuario del equipo, actívate como Super Admin con un clic:
          </p>
          <button
            onClick={claimAdmin}
            disabled={claiming}
            className="mt-4 w-full rounded-full bg-[var(--brand-wine)] px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {claiming ? "Activando…" : "Activarme como Super Admin"}
          </button>
          <button
            onClick={signOut}
            className="mt-3 w-full rounded-full border border-border px-5 py-3 text-sm font-semibold"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const allLinks = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, adminOnly: true },
    { to: "/admin/inventario", label: "Inventario", icon: Package, adminOnly: false },
    { to: "/admin/servicios", label: "Servicios 3D", icon: Wrench, adminOnly: true },
    { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart, adminOnly: false },
    { to: "/admin/clientes", label: "Clientes", icon: Users, adminOnly: false },
  ];
  const links = allLinks.filter((l) => isAdmin || !l.adminOnly);

  const NavItems = () => (
    <>
      {links.map((l) => {
        const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
        return (
          <Link
            key={l.to}
            to={l.to}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active ? "bg-[var(--brand-wine)] text-white" : "hover:bg-muted"
            }`}
          >
            <l.icon className="h-4 w-4" />
            {l.label}
          </Link>
        );
      })}
      <button
        onClick={signOut}
        className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground">{email}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: isAdmin ? "var(--brand-orange)" : "var(--brand-teal-deep)" }}>
          {isAdmin ? "Super Admin" : "Empleado"}
        </p>
      </div>
    </>
  );

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-24 space-y-1 rounded-3xl border border-border bg-card p-3">
          <NavItems />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <span className="text-sm font-black">Panel Admin</span>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-full border border-border p-2"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 h-full w-72 space-y-1 border-l border-border bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black">Menú</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavItems />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1 pt-14 md:pt-0">
        <Outlet />
      </div>
    </div>
  );
}
