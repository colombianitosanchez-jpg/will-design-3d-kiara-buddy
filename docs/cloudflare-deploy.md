# Guía de Despliegue 100 % Gratuito en Cloudflare Workers (sin tarjeta de crédito)

Esta guía explica cómo publicar **Will Design 3D** gratis en **Cloudflare Workers** conectado automáticamente a **GitHub** (Workers Builds), manteniendo funcionando el catálogo, carrito, cotizadores, SSR, tarjetas Open Graph (`og:image`), Telegram, Kiara IA y webhooks.

---

## 1. Requisitos previos (Costo: $0 · Sin tarjeta de crédito)

1. **Cuenta en GitHub** con este repositorio subido.
2. **Cuenta gratuita en Cloudflare** ([dash.cloudflare.com](https://dash.cloudflare.com)):
   - El plan **Workers Free** incluye **100.000 peticiones diarias**, ancho de banda estático ilimitado, SSL automático (`https://`) y despliegue continuo desde GitHub **sin ingresar tarjeta de crédito**.
3. **Proyecto en Supabase** ya activo (plan gratuito) con tus tablas y datos.

> **Importante:** Si Cloudflare te muestra en algún paso opciones pagas como *Workers Paid ($5/mes)*, selecciona siempre **Free ($0/month)**. No necesitas agregar método de pago.

---

## 2. Conectar GitHub con Cloudflare Workers Builds

1. Entra al panel de **Cloudflare** → **Compute (Workers)** → **Workers & Pages** → **Create** → **Import a repository** (conecta tu cuenta de GitHub y elige este repositorio).
2. En la configuración de compilación (**Build configuration**):
   - **Project name:** `will-design-3d` *(coincide con `wrangler.jsonc`)*
   - **Production branch:** `main` *(o la rama principal que uses)*
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Root directory:** `/` *(dejar vacío o en raíz)*
   - **Non-production branch builds (Previews):** Opcional (activado gratis para probar cambios antes de pasar a `main`).

> ¿Cómo sabe Wrangler dónde está el build de Nitro?
> Al ejecutar `npm run build`, Nitro lee `wrangler.jsonc`, genera el Worker en `.output/server/wrangler.json` y crea automáticamente `.wrangler/deploy/config.json` para que `npx wrangler deploy` despliegue el paquete SSR + assets estáticos sin pasos manuales.

---

## 3. Cargar Variables de Entorno antes del primer despliegue

En Cloudflare Workers existen **dos secciones** distintas de variables. Cárgalas desde la configuración del Worker:

### A. Variables de Build (**Settings → Build → Variables and secrets**)
Se incrustan en el frontend durante `npm run build`:

| Variable | Tipo | Valor |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Plaintext | URL de tu proyecto Supabase (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Plaintext | Clave pública (`anon` / `sb_publishable_...`) de Supabase |
| `VITE_SUPABASE_PROJECT_ID` | Plaintext | ID del proyecto Supabase |
| `VITE_SITE_URL` *(opcional)* | Plaintext | Ej. `https://will-design-3d.<tu-subdominio>.workers.dev` |
| `VITE_ELFSIGHT_INSTAGRAM_ID` *(opcional)* | Plaintext | Solo si usas widget Elfsight |
| `VITE_KIARA_CHAT_ENDPOINT` *(opcional)* | Plaintext | Dejar vacío para usar `/api/kiara` integrado |

### B. Variables y Secretos en Ejecución (**Settings → Variables and secrets**)
Se leen de forma segura en el servidor (Worker) en tiempo de ejecución:

| Variable | Tipo recomendado | Descripción |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Variable (Text) | URL de tu proyecto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Variable (Text) | Clave pública (`anon` / `sb_publishable_...`) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Clave `service_role` de Supabase *(solo servidor, nunca usar en `VITE_`)* |
| `PUBLIC_SITE_URL` *(opcional)* | Variable (Text) | URL pública del Worker mientras configuras dominio propio |
| `WOMPI_EVENTS_SECRET` *(si usas Wompi)* | **Secret** | Secreto de eventos de Wompi |
| `PAYMENT_WEBHOOK_SECRET` *(si aplica)* | **Secret** | Secreto para webhook genérico `/api/public/hooks/payment-webhook` |
| `NOTIFICATIONS_CRON_SECRET` *(si aplica)* | **Secret** | Secreto para `/api/public/hooks/process-notifications` |
| `TELEGRAM_BOT_TOKEN` *(opcional)* | **Secret** | Respaldo adicional si aún no se guarda en el panel `/panel` |
| `TELEGRAM_CHAT_ID` *(opcional)* | **Secret** | Respaldo adicional si aún no se guarda en el panel `/panel` |

> Las credenciales de Telegram guardadas desde `/panel` viven cifradas/protegidas en `integration_secrets` dentro de Supabase y funcionan automáticamente al desplegar.

---

## 4. Pasos obligatorios después del primer despliegue

Una vez Cloudflare termine el primer despliegue, te entregará tu URL gratuita, por ejemplo:
`https://will-design-3d.<tu-usuario>.workers.dev`

Completa estos 4 ajustes en menos de 5 minutos:

1. **Autorizar el inicio de sesión en Supabase (Panel `/panel`)**:
   - Entra a **Supabase Dashboard → Authentication → URL Configuration**.
   - En **Site URL**, coloca tu nueva URL (`https://will-design-3d.<tu-usuario>.workers.dev` o tu dominio propio).
   - En **Redirect URLs**, añade:
     - `https://will-design-3d.<tu-usuario>.workers.dev/**`
     - `https://tudominio.com/**` *(cuando conectes dominio propio)*
2. **Actualizar el dominio canónico dentro de la tienda**:
   - Inicia sesión en `/panel` → sección **Marca / SEO** y guarda el dominio canónico con la nueva URL (`https://...`).
   - Esto actualiza automáticamente el `sitemap.xml`, `robots.txt`, `/llms.txt` y los enlaces con tarjeta visual que se comparten por WhatsApp.
3. **Actualizar Webhook de Pagos (si tienes Wompi activo)**:
   - En el panel de Wompi, apunta la URL de eventos a:
     `https://<tu-dominio>/api/public/wompi-webhook`
4. **Verificación rápida en producción**:
   - Abre `/` y `/tienda` (valida carga SSR y estilos).
   - Prueba un enlace de producto o servicio en WhatsApp (valida `og:image`).
   - Envíate una prueba desde `/panel` o un pedido de prueba (valida Telegram + WhatsApp).
   - Escribe un mensaje en el chat de Kiara IA (`/api/kiara`).

---

## 5. Opciones recomendadas de dominio

| Opción | Costo aproximado | ¿Pide tarjeta? | Cómo conectarlo |
| :--- | :--- | :--- | :--- |
| **`will-design-3d.<usuario>.workers.dev`** | **$0** | **No** | Activo automáticamente al desplegar. Ideal para empezar hoy mismo. |
| **Subdominio comunitario (`is-a.dev` / `eu.org`)** | **$0** | **No** | Requiere solicitud/aprobación externa; se conecta por DNS gratuito en Cloudflare. |
| **Dominio `.com` en Cloudflare Registrar** | ~US$10–12 / año | Sí (solo al comprar dominio) | Compra al costo sin margen extra, con privacidad WHOIS gratis e integración en 1 clic. |
| **Dominio `.com.co` o `.com` en registrador colombiano** *(p. ej. Mi.com.co)* | ~$45.000–$75.000 COP / año | **No** (aceptan **PSE / Nequi**) | Compras el dominio con PSE/Nequi, agregas el sitio en Cloudflare (Plan Free), cambias los 2 nameservers y lo enlazas en **Workers → Settings → Domains & Routes**. |

---

## 6. Actualizaciones automáticas y pruebas locales

- **Publicar cambios:** Cada `git push` a `main` dispara automáticamente un nuevo build y despliegue en Cloudflare sin intervención manual.
- **Despliegue manual opcional desde consola:**
  ```bash
  npm run build
  npm run deploy
  ```
- **Vista previa local en runtime Cloudflare (opcional):** Crea un archivo `.dev.vars` local *(ignorado por Git)* con tus variables de servidor y ejecuta `npm run build && npx wrangler dev`.
