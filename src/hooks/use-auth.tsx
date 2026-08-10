import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PanelRole = "pending" | "empleado" | "super_admin";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: PanelRole | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  isEmployee: boolean;
  hasPanelAccess: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<PanelRole | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRole = useCallback(async (current: Session | null) => {
    if (!current?.user) {
      setRole(null);
      setIsActive(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role, is_active")
      .eq("user_id", current.user.id)
      .maybeSingle();

    if (!data) {
      // First sign-in: register the account as pending (no access until approved).
      await supabase.from("user_roles").insert({
        user_id: current.user.id,
        email: current.user.email ?? null,
        role: "pending",
        is_active: false,
      } as never);
      setRole("pending");
      setIsActive(false);
    } else {
      setRole((data.role as PanelRole) ?? "pending");
      setIsActive(Boolean((data as { is_active?: boolean }).is_active));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      void loadRole(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      setSession(next);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setLoading(true);
        void loadRole(next);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadRole]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await loadRole(data.session);
  }, [loadRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setIsActive(false);
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    role,
    isActive,
    isSuperAdmin: role === "super_admin" && isActive,
    isEmployee: role === "empleado" && isActive,
    hasPanelAccess: isActive && (role === "empleado" || role === "super_admin"),
    loading,
    refresh,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
