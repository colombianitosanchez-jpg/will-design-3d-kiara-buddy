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
