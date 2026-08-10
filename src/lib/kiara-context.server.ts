// Kiara — construcción de contexto con frontera de seguridad estricta.
// Dos caminos de ejecución completamente aislados: público (cliente web) e interno (equipo JACX).
// Este archivo es server-only (*.server.ts) y nunca llega al bundle del cliente.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PUBLIC_PROMPT = `Eres Kiara, la asistente oficial de Will Design 3D (una perrita Pastor Alemán, cálida y profesional, español colombiano, con algún guiño canino 🐾 ocasional).
Usa SOLO el catálogo público y la información pública proporcionada para ayudar a los clientes a comprar y a entender nuestros servicios.
NUNCA menciones datos internos, inventario, costos, pedidos de otros clientes ni información del equipo.
Cuando pidan un precio, usa SIEMPRE la herramienta quote_service con el slug del servicio cotizable más adecuado (pide primero los datos que falten, como gramos, tamaño o material). Nunca calcules precios a mano; si el cliente prefiere el formulario, invítalo a /cotizador.
No inventes precios, plazos ni stock. Responde en 1-3 párrafos cortos.`;

export const INTERNAL_PROMPT = `Eres Kiara, la asistente de operaciones del equipo de Will Design 3D.
Tienes acceso total y confidencial a pedidos, clientes, inventario base, cotizaciones y manuales internos.
Ayuda al empleado respondiendo con precisión técnica y operativa usando los datos de la base de datos adjunta.
Sé directo y breve; si falta información crítica, pregunta antes de recomendar. No inventes datos que no aparezcan en el contexto.`;

const RAG_RULES = `\n\nREGLAS DE USO DEL CONTEXTO:
- Responde usando ÚNICAMENTE la información entregada arriba.
- Si la respuesta no está en ese contexto, dilo claramente: "Todavía no tengo ese registro" e invita a registrarlo en la Base de Conocimiento del Panel (o a escribir por WhatsApp si es un visitante).
- No inventes datos, precios, plazos ni stock que no aparezcan en el contexto.`;

const MAX_KB_CHARS = 24_000;

export type AuthBoundary = { isInternalTeam: boolean; userId: string | null };

/**
 * Firewall de autenticación: solo un JWT válido cuyo usuario tenga rol
 * admin/staff en user_roles habilita el modo interno.
 */
export async function resolveAuthBoundary(
  authHeader: string | null,
): Promise<AuthBoundary> {
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token || token.split(".").length !== 3) {
    return { isInternalTeam: false, userId: null };
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  const userId = userData?.user?.id ?? null;
  if (error || !userId) return { isInternalTeam: false, userId: null };

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role, is_active")
    .eq("user_id", userId);

  // Roles vigentes del panel: super_admin y empleado (activos).
  const isInternalTeam = Boolean(
    roles?.some(
      (r) =>
        (r as { is_active?: boolean }).is_active !== false &&
        ["super_admin", "empleado", "admin", "staff"].includes(String(r.role)),
    ),
  );
  return { isInternalTeam, userId: isInternalTeam ? userId : null };
}


function trimBlock(parts: string[]) {
  let used = 0;
  const out: string[] = [];
  for (const p of parts) {
    if (used + p.length > MAX_KB_CHARS) break;
    used += p.length;
    out.push(p);
  }
  return out.join("\n\n");
}

async function knowledge(categories: string[]) {
  const { data } = await supabaseAdmin
    .from("knowledge_base")
    .select("title, content")
    .eq("is_active", true)
    .in("category", categories)
    .order("updated_at", { ascending: false })
    .limit(60);
  return (data ?? []).map(
    (r) => `### ${r.title}\n${String(r.content ?? "").trim()}`,
  );
}

const cop = (n: number) => `$${Number(n ?? 0).toLocaleString("es-CO")} COP`;

/**
 * Servicios cotizables tal como están configurados en Panel → Cotizador, con
 * sus preguntas y opciones, para que Kiara pueda llamar a quote_service.
 */
async function quoterBlock(): Promise<string> {
  const [{ data: services }, { data: fields }] = await Promise.all([
    supabaseAdmin
      .from("quoter_services")
      .select("id, slug, name, description, min_price_cop, allow_quantity")
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("quoter_fields")
      .select("service_id, key, label, input_type, unit, min_value, max_value, options")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  if (!services?.length) return "";

  const lines = services.map((s) => {
    const own = (fields ?? []).filter((f) => f.service_id === s.id);
    const qs = own.map((f) => {
      const opts = Array.isArray(f.options)
        ? (f.options as { value?: string }[]).map((o) => String(o?.value ?? "")).filter(Boolean)
        : [];
      const range =
        f.input_type === "slider" || f.input_type === "number"
          ? ` (${f.min_value}–${f.max_value}${f.unit ? ` ${f.unit}` : ""})`
          : opts.length
            ? ` (${opts.join(" | ")})`
            : "";
      return `    · ${f.key}: ${f.label}${range}`;
    });
    return `- slug: ${s.slug} — ${s.name} — desde ${cop(Number(s.min_price_cop))}${
      s.allow_quantity ? " — admite cantidad" : ""
    }\n  ${s.description ?? ""}${qs.length ? `\n  Datos que necesitas:\n${qs.join("\n")}` : ""}`;
  });

  return `## SERVICIOS COTIZABLES (usa la herramienta quote_service con estos slugs)\n${lines.join("\n")}`;
}

/** MODO PÚBLICO: solo catálogo activo + conocimiento público. Nada de pedidos/clientes/costos. */
async function buildPublicContext(): Promise<string> {
  const [{ data: products }, kb, quoter] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("name, slug, price_cop, short, stock, categories(name), brands(name)")
      .eq("active", true)
      .order("featured", { ascending: false })
      .limit(80),
    knowledge(["public_web", "all"]),
    quoterBlock(),
  ]);

  const catalog = (products ?? []).map((p) => {
    const cat = (p as { categories?: { name?: string } | null }).categories?.name ?? "General";
    const brand = (p as { brands?: { name?: string } | null }).brands?.name ?? "";
    const avail = (p.stock ?? 0) > 0 ? "disponible" : "bajo pedido";
    return `- ${p.name}${brand ? ` (${brand})` : ""} — ${cat} — ${cop(p.price_cop)} — ${avail} — /tienda/${p.slug}${p.short ? `\n  ${p.short}` : ""}`;
  });

  const blocks: string[] = [];
  if (quoter) blocks.push(quoter);
  if (catalog.length) blocks.push(`## CATÁLOGO PÚBLICO\n${catalog.join("\n")}`);
  if (kb.length) blocks.push(`## PREGUNTAS FRECUENTES E INFORMACIÓN PÚBLICA\n${kb.join("\n\n")}`);
  if (!blocks.length) return "";
  return `\n\n[INFORMACIÓN PÚBLICA DE WILL DESIGN 3D]\n${trimBlock(blocks)}\n[FIN DE LA INFORMACIÓN PÚBLICA]`;
}

/** MODO INTERNO: contexto operativo completo (pedidos, clientes, inventario, cotizaciones, manuales). */
async function buildInternalContext(): Promise<string> {
  const [
    { data: products },
    { data: orders },
    { data: quotes },
    kb,
    quoter,
  ] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("name, sku, price_cop, stock, active, categories(name), brands(name)")
      .order("stock", { ascending: true })
      .limit(120),
    supabaseAdmin
      .from("orders")
      .select(
        "id, customer_name, customer_email, customer_phone, shipping_city, status, total_cop, notes, created_at, order_items(product_name, quantity, unit_price_cop)",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    supabaseAdmin
      .from("quotes")
      .select(
        "customer_name, customer_email, customer_phone, service_name, estimated_total_cop, quantity, design_state, size_label, material, finish, status, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    knowledge(["internal_team", "all"]),
    quoterBlock(),
  ]);

  const inventory = (products ?? []).map((p) => {
    const cat = (p as { categories?: { name?: string } | null }).categories?.name ?? "General";
    const brand = (p as { brands?: { name?: string } | null }).brands?.name ?? "";
    return `- ${p.name}${brand ? ` (${brand})` : ""} | SKU ${p.sku ?? "—"} | ${cat} | precio ${cop(p.price_cop)} | stock ${p.stock ?? 0} | ${p.active ? "activo" : "inactivo"}`;
  });

  const orderLines = (orders ?? []).map((o) => {
    const items = ((o as { order_items?: { product_name: string; quantity: number; unit_price_cop: number }[] }).order_items ?? [])
      .map((i) => `${i.quantity}x ${i.product_name} @ ${cop(i.unit_price_cop)}`)
      .join("; ");
    const date = new Date(o.created_at).toISOString().slice(0, 10);
    return `- [${o.status}] ${date} | ${o.customer_name} (${o.customer_email}${o.customer_phone ? `, ${o.customer_phone}` : ""})${o.shipping_city ? ` | ${o.shipping_city}` : ""} | total ${cop(o.total_cop)} | ${items || "sin ítems"}${o.notes ? ` | notas: ${o.notes}` : ""}`;
  });

  const quoteLines = (quotes ?? []).map((q) => {
    const date = new Date(q.created_at).toISOString().slice(0, 10);
    return `- [${q.status}] ${date} | ${q.customer_name} (${q.customer_email}${q.customer_phone ? `, ${q.customer_phone}` : ""}) | servicio: ${q.service_name || q.design_state || "—"} | estimado ${cop(Number(q.estimated_total_cop))} x${q.quantity ?? 1} | detalle: ${q.size_label || "—"} | material: ${q.material || "—"} | acabado: ${q.finish || "—"}${q.notes ? ` | notas: ${q.notes}` : ""}`;
  });

  const blocks: string[] = [];
  if (quoter) blocks.push(quoter);
  if (kb.length) blocks.push(`## MANUALES Y CONOCIMIENTO INTERNO\n${kb.join("\n\n")}`);
  if (inventory.length) blocks.push(`## INVENTARIO Y PRECIOS (stock ascendente)\n${inventory.join("\n")}`);
  if (orderLines.length) blocks.push(`## PEDIDOS RECIENTES Y CLIENTES\n${orderLines.join("\n")}`);
  if (quoteLines.length) blocks.push(`## COTIZACIONES 3D RECIENTES\n${quoteLines.join("\n")}`);
  if (!blocks.length) return "";
  return `\n\n[DATOS OPERATIVOS CONFIDENCIALES — SOLO EQUIPO]\n${trimBlock(blocks)}\n[FIN DE LOS DATOS CONFIDENCIALES]`;
}

/**
 * Devuelve el system prompt final. Los dos caminos son mutuamente exclusivos:
 * el modo público nunca ejecuta consultas a orders/quotes/inventario interno.
 */
export async function buildKiaraSystemPrompt(
  isInternalTeam: boolean,
  overrides: { publicPrompt?: string; internalPrompt?: string },
): Promise<string> {
  if (isInternalTeam) {
    const base = overrides.internalPrompt?.trim() || INTERNAL_PROMPT;
    return `${base}${await buildInternalContext()}${RAG_RULES}`;
  }
  const base = overrides.publicPrompt?.trim() || PUBLIC_PROMPT;
  return `${base}${await buildPublicContext()}${RAG_RULES}`;
}
