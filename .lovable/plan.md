# Plan: Header overlap fix and full responsiveness

## Goal
Fix the logo/text overlap in `SiteHeader` and make the navbar fully responsive on mobile, tablet, and desktop by tightening the layout breakpoints and replacing the inline mobile dropdown with a shadcn Sheet drawer.

## What will change

### 1. Logo container (prevent squishing / overlap)
- In `src/components/SiteHeader.tsx`, update the logo `Link` wrapper so it keeps its intrinsic width and never wraps:
  - Add `flex-shrink-0 min-w-max whitespace-nowrap` to the logo container.
  - Keep the existing image + text layout inside.
  - Ensure a safe gap between the logo block and the rest of the header (e.g. `gap-8` on the parent or `mr-8` on the logo).

### 2. Desktop navigation layout
- Change the main header inner wrapper from the current `grid` to `flex items-center justify-between w-full`.
- Remove the explicit "Inicio" link; the logo already links to `/`, so only the dynamic menu roots (`Accesorios`, etc.), `Galería`, `Nosotros`, and `Contacto` remain in the center nav.
- Wrap the center navigation links in a container with:
  - `hidden lg:flex items-center gap-4 xl:gap-6`
  - This forces the horizontal menu to hide on smaller viewports instead of breaking the row.
- Keep the cart icon and WhatsApp CTA inside the desktop nav area.

### 3. Mobile / tablet hamburger menu (Sheet drawer)
- Replace the current inline dropdown mobile menu with the existing shadcn `Sheet` component (`src/components/ui/sheet.tsx`).
- Add a hamburger toggle button visible only below the `lg` breakpoint: `flex lg:hidden`.
- Keep the cart icon and WhatsApp button visible on mobile, positioned to the right of the hamburger toggle.
- Render all navigation links inside the Sheet side drawer, including the recursive dynamic menu items (reuse the existing `MobileNode` accordion renderer).
- Close the Sheet automatically when a link is clicked.

## Files to edit
- `src/components/SiteHeader.tsx` — layout and mobile menu refactor.

## Out of scope
- No changes to logo image, brand text, or route definitions.
- No backend or cart logic changes.

## Verification
- Build/typecheck after edits.
- Visually verify the header at 320 px, 768 px, and 1440 px viewports: logo must not wrap or overlap, desktop nav must collapse to hamburger below `lg`, and the Sheet drawer must open/close smoothly.
