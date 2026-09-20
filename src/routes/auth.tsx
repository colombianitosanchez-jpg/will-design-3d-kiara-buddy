import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Acceso al panel · Will Design 3D" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/panel" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/panel` },
        });
        if (error) throw error;
        setMsg(
          "Revisa tu correo para confirmar la cuenta (o inicia sesión si el email ya está activo).",
        );
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-black">
          Panel de <span style={{ color: "var(--brand-orange)" }}>Will Design 3D</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Ingresa con tu cuenta del equipo." : "Crea una cuenta del equipo."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Correo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {msg && <p className="rounded-lg bg-muted p-3 text-sm">{msg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--brand-wine)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Procesando…" : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-semibold text-foreground underline"
          >
            {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
          </button>
          <Link to="/" className="text-muted-foreground hover:underline">
            Volver
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          El primer usuario que ingrese al panel podrá activarse como administrador con un clic.
        </p>
      </div>
    </div>
  );
}
