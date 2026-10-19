# Multi-Agent Architectural Decision Record (ADR) & Control Ecosystem Architecture

**Project:** Will Design 3D - Unified Quoter & Calculator Control Ecosystem
**Date:** October 2026
**Architects / Virtual Agents:**
- **UX/UI Lead Agent:** Admin Usability & Visual Clarity
- **Business & E-Commerce Logic Agent:** Pricing Engine & Decoupled Product/Service Quoters
- **QA & Anti-Regression Agent:** Decoupling, Database Safety & WhatsApp Fallback Flow

---

## 1. Multi-Agent & QA Virtual Discussion Summary

### UX/UI Lead Agent
> "Admin users were previously forced to switch between 'Price Rules', 'Calculators', and 'Content Settings' in three different tabs or panel screens to configure a single service or pricing model.
>
> **Consensus:** We are consolidating these into a single Unified Quoter Control Panel (`/panel/cotizador`). Every calculator, service anchor, global pricing variable, tiered volume discount bracket, and option media preview can be configured from one single intuitive hub. Furthermore, step ordering must support both drag/move controls AND direct numeric index inputs (1, 2, 3...) so admins can instantly reorder fields without tedious clicking."

### Business & E-Commerce Logic Agent
> "A service is not always a calculator, and a calculator is not always a service. For instance, a customer buying 50 kg of PETG filamento needs a wholesale volume discount calculator linked directly to the product catalog, whereas a 'Mantenimiento de impresoras' service might not need sliders or options—it should immediately offer a direct WhatsApp conversation pre-filled with the service title, target variant, URL, and contextual message.
>
> **Consensus:** We will decouple Services, Calculators, and Products. Services without an active calculator module will bypass calculation UIs and open a direct `wa.me` WhatsApp flow with a rich pre-filled message template. For products and volume discounts, we support Tiered Volume Discount rules (e.g. 1–5 units = 100%, 6–20 units = 10% discount, 21+ units = custom wholesale rate) and media attribute previews (GIFs/Videos/Images) for options like metallic, silk, or rainbow filament sheens."

### QA & Anti-Regression Agent
> "Database migrations must be strictly backwards compatible with existing Supabase JSONB structures and `quoter_services` / `quoter_fields` schemas. No existing column can be dropped.
>
> **Consensus:** New capabilities (tiered volume discounts, media previews, direct WhatsApp mode) will use optional columns and backwards-compatible JSONB attributes. We will preserve full type safety (`bun x tsc --noEmit`) and run all automated unit tests (`bun test`) to ensure zero regressions for active quotes, Kiara AI tool execution, and store cart calculations."

---

## 2. Core Architectural Principles & Decisions

1. **Decoupled Architecture:**
   - **Service with Calculator:** Displays step-by-step interactive calculator, calculates live price estimation, supports cart adding and WhatsApp quotes.
   - **Service without Calculator:** Bypasses calculation UI, rendering a direct friction-free WhatsApp action pre-filled with service title, URL, image, and custom inquiry message.
   - **Tiered Volume Pricing:** Supports quantity-based discounts calculated in the core mathematical engine (`quoter-core.ts`).

2. **Unified Control Panel:**
   - Global Quoting Variables (`fdm_gram_cost`, `resin_ml_cost`, `machine_hour_rate`, `labor_hour_rate`, `failure_rate_percentage`, `default_margin`).
   - Service & Calculator Management with site anchors, media attachment, volume discount thresholds, and direct numeric sorting.
   - Field & Step Builder supporting input types (slider, select, toggle, number, text), price sources, and option media previews (GIFs, WebM/MP4, images).

3. **Universal Media Preview:**
   - Options and steps can include media URLs (`media_url`, `media_type`: `'image' | 'video' | 'gif'`) to render interactive visual previews for materials and finishes.
