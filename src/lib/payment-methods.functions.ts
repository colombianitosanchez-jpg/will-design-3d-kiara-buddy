import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  sanitizePublicPaymentConfig,
  type ExtendedPaymentMethodConfig,
} from "@/lib/payment-config";

export type PaymentMethodType =
  | "manual_transfer"
  | "gateway"
  | "gateway_redirect"
  | "cash_on_delivery"
  | "cash_point"
  | "crypto";

/** Ajustes variables según el tipo de método. Nunca guarda secretos. */
export type PaymentMethodConfig = ExtendedPaymentMethodConfig;

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
        is_wompi: z.boolean().optional(),
        wompi_public_key: z.string().trim().max(200).optional(),
        wompi_env: z.enum(["sandbox", "production"]).optional(),
        bank_name: z.string().trim().max(120).optional(),
        account_number: z.string().trim().max(120).optional(),
        account_holder: z.string().trim().max(120).optional(),
        require_proof: z.boolean().optional(),
        wallet_address: z.string().trim().max(200).optional(),
        crypto_network: z.enum(["TRC20", "BEP20", "ERC20", "Polygon"]).optional(),
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
    const isGateway = val.type === "gateway" || val.type === "gateway_redirect";
    const hasWompiKey = Boolean(val.config?.is_wompi && val.config?.wompi_public_key?.trim());
    if (isGateway && !val.config?.payment_url && !hasWompiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["config", "payment_url"],
        message: "Indica la URL de pago / link de checkout o tu Llave Pública de Wompi",
      });
    }
    if (val.type === "crypto" && !val.config?.payment_url && !val.config?.wallet_address?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["config", "wallet_address"],
        message: "Indica la dirección de billetera (wallet) o el enlace de pago cripto",
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
  const url = process.env["SUPABASE_URL"] || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [] as PublicPaymentMethod[];
  const client = createClient(url, key, {
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
    config: sanitizePublicPaymentConfig((m.config ?? {}) as Record<string, unknown>),
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
        config: sanitizePublicPaymentConfig((m.config ?? {}) as Record<string, unknown>),
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

    const cfg = sanitizePublicPaymentConfig((data.config ?? {}) as Record<string, unknown>);

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
      let mergedCreds: Record<string, string> | undefined;
      if (Object.keys(creds).length) {
        const { data: existing } = await supabaseAdmin
          .from("payment_methods")
          .select("credentials")
          .eq("id", data.id)
          .maybeSingle();
        const prevCreds = ((existing?.credentials ?? {}) as Record<string, string>) || {};
        mergedCreds = { ...prevCreds, ...creds };
      }
      const { error } = await supabaseAdmin
        .from("payment_methods")
        .update(mergedCreds ? { ...base, credentials: mergedCreds } : base)
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

export const reorderPaymentMethods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ ordered_ids: z.array(z.string().uuid()).min(1).max(100) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      data.ordered_ids.map((id, index) =>
        supabaseAdmin
          .from("payment_methods")
          .update({ display_order: index })
          .eq("id", id),
      ),
    );
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
