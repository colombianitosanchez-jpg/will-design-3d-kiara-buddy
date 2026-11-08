import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PaymentMethodType =
  | "manual_transfer"
  | "gateway"
  | "gateway_redirect"
  | "cash_on_delivery"
  | "cash_point"
  | "crypto";

/** Ajustes variables según el tipo de método. Nunca guarda secretos. */
export type PaymentMethodConfig = {
  payment_url?: string;
  allowed_zones?: string;
};

export type PublicPaymentMethod = {
  id: string;
  name: string;
  type: PaymentMethodType;
  instructions: string;
  display_order: number;
  qr_image_url: string | null;
  config: PaymentMethodConfig;
};

/** Método de pago para el Panel: incluye si tiene credenciales, nunca sus valores. */
export type AdminPaymentMethod = PublicPaymentMethod & {
  is_active: boolean;
  has_credentials: boolean;
};

const upsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    type: z.enum([
      "manual_transfer",
      "gateway",
      "gateway_redirect",
      "cash_on_delivery",
      "cash_point",
      "crypto",
    ]),
    instructions: z.string().trim().max(4000).optional().default(""),
    qr_image_url: z.string().trim().max(500).optional().default(""),
    display_order: z.number().int().min(0).max(999).optional().default(0),
    is_active: z.boolean().optional().default(false),
    config: z
      .object({
        payment_url: z.string().trim().url().max(500).optional(),
        allowed_zones: z.string().trim().max(300).optional(),
      })
      .partial()
      .optional()
      .default({}),
    /** Pares clave/valor. Si viene vacío en una edición, se conservan las credenciales guardadas. */
    credentials: z
      .array(z.object({ key: z.string().trim().min(1).max(80), value: z.string().max(2000) }))
      .max(20)
      .optional()
      .default([]),
  })
  .superRefine((val, ctx) => {
    const needsUrl =
      val.type === "gateway" || val.type === "gateway_redirect" || val.type === "crypto";
    if (needsUrl && !val.config?.payment_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["config", "payment_url"],
        message: "Indica la URL de pago / link de checkout",
      });
    }
  });

async function assertSuperAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: string,
        ) => { maybeSingle: () => Promise<{ data: { role: string; is_active: boolean } | null }> };
      };
    };
  };
  const { data } = await supabase
    .from("user_roles")
    .select("role, is_active")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data || !data.is_active || data.role !== "super_admin") {
    throw new Error("Solo un Super Admin puede gestionar los métodos de pago");
  }
}

/** Métodos de pago activos para el checkout público (sin credenciales). */
export const listPublicPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const { data, error } = await client
    .from("payment_methods")
    .select("id, name, type, instructions, display_order, qr_image_url, config")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) return [] as PublicPaymentMethod[];
  return (data ?? []).map((m) => ({
    ...m,
    config: (m.config ?? {}) as PaymentMethodConfig,
  })) as PublicPaymentMethod[];
});

/** Lista completa para el Panel (Super Admin). No devuelve valores de credenciales. */
export const listAdminPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payment_methods")
      .select(
        "id, name, type, instructions, display_order, is_active, credentials, qr_image_url, config",
      )
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((m) => {
      const creds = (m.credentials ?? {}) as Record<string, unknown>;
      const { credentials: _drop, ...rest } = m as typeof m & { credentials?: unknown };
      return {
        ...rest,
        config: (m.config ?? {}) as PaymentMethodConfig,
        has_credentials: Object.keys(creds).length > 0,
      } as AdminPaymentMethod;
    });
  });

/** Crea o actualiza un método de pago (solo Super Admin). */
export const savePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => upsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const creds: Record<string, string> = {};
    for (const c of data.credentials) if (c.value.trim()) creds[c.key] = c.value.trim();

    const cfg: PaymentMethodConfig = {};
    if (data.config?.payment_url) cfg.payment_url = data.config.payment_url;
    if (data.config?.allowed_zones) cfg.allowed_zones = data.config.allowed_zones;

    const base = {
      name: data.name,
      type: data.type,
      instructions: data.instructions,
      qr_image_url: data.qr_image_url || null,
      display_order: data.display_order,
      is_active: data.is_active,
      config: cfg,
    };

    if (data.id) {
      const patch = Object.keys(creds).length ? { ...base, credentials: creds } : base;
      const { error } = await supabaseAdmin
        .from("payment_methods")
        .update(patch)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }

    const { data: row, error } = await supabaseAdmin
      .from("payment_methods")
      .insert({ ...base, credentials: creds })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id };
  });

export const togglePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payment_methods")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deletePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payment_methods").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
