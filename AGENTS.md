<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Derive homepage editor group order through `getHomeEditorGroups` from `home_sections_order`, keeping stable group keys and existing field renderers; this synchronizes controls without resetting their state or duplicating ordering logic.
- Parse About collections with `parseStatItems`, never Hero legacy fallbacks; explicit arrays are authoritative to prevent deleted content from returning.
- Render About collection controls through `StatCollection` and resolve scoped positional share keys with `resolveStatShareImage`; unscoped legacy stat IDs belong only to Hero to prevent cross-section image collisions.
- Resolve variant data with `resolveVariantProduct` on public surfaces and freeze source inheritance before hierarchy moves; explicit false and empty custom button arrays must not become parent defaults.
- Persist product ordering and hierarchy moves through the atomic, Super Admin-only `apply_product_move` RPC and undo through its timestamp-checked history; absorbed records stay inactive outside panel lists so order references and original attributes survive.
- Preserve variant IDs across moves and flatten parent conversion into sibling variants; ID collisions must fail instead of generating a duplicate identity.
- Use `firstStaticShareImage` for share-image selection across WhatsApp payloads and public metadata; galleries retain their original animated media.
- Product editors group legacy fallback actions separately and keep inheritance freezing internal; optional commercial booleans use explicit overrides while heavyweight variant editors mount only in expanded sections to preserve behavior without crowding the editor.
- Use `productSummary` for plain-text card and quick-view excerpts; product details render short and full descriptions independently so either field remains visible.
- Use the shared quote engine and canonical field validation for simulation, public quote requests and service checkout; recalculate with the actual quantity and block review-required checkout to keep displayed and charged prices consistent.
- Keep service cart quantities locked to their quote and replace repeated service additions; reject unsupported quantities at checkout instead of silently dropping units, because quantity changes can alter quoted pricing.
- Evaluate quote formulas through the restricted jsep arithmetic tree, never dynamic JavaScript execution, so formulas also work in the published Worker runtime.
- Use Radix dialogs and radio groups for service editing and quote selections to preserve keyboard navigation and focus management.
- Store integration credentials (Telegram bot token/chat id) only in `integration_secrets` (service-role only, no RLS policies); never inside staff-readable settings JSON.
- Gateway webhooks mark orders paid only when the reported amount covers `total_cop` and never downgrade an already paid order.
- Validate Kiara checkout through the shared `kiara-checkout` rules with global quoting variables, and hide internal cost breakdowns; chat and website must charge consistently.
- Route default service WhatsApp purchase actions through UnifiedButton and quick capture; service requests must be recorded before opening the external chat.
