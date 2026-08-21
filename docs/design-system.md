# Design System

## Approach

Tailwind CSS v4 is the token system — no custom design-token framework was
introduced. The palette is the Tailwind default (brand reds `red-*`, neutrals
`slate-*`, accents `amber-*`/`green-*`), with dark mode via the `dark` class
on `<html>` (`@custom-variant dark`). Shared values like the currency symbol
(`$`) and checkout business constants live in `src/constants/checkout.ts`.

## Primitives (`components/ui/`)

| Component       | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `Button`        | Variants: primary / secondary / outline / ghost / danger; sizes sm/md/lg; `loading` prop; focus-visible ring; dark-mode aware |
| `Input`         | Labeled input with error/hint states, `aria-invalid` + `role="alert"` errors |
| `Badge`         | Product flags: `new` / `bestseller` / `sale`                   |
| `Modal`         | `role="dialog"`, `aria-modal`, Escape-to-close, initial focus, aria-label |
| `Skeleton`      | `Skeleton` + `ProductCardSkeleton` (loading placeholders)      |
| `PageLoader`    | Centered page-level spinner (for future async routes)          |
| `EmptyState`    | Standardized empty/not-found states (title, icon, description, actions, heading level) |
| `ErrorState`    | User-friendly error state with optional retry — never raw stack traces |
| `Breadcrumbs`   | Route-aware crumbs with Home link                               |
| `Toast`         | Success / error / info toasts                                   |
| `SortSelect`, `FilterDropdown`, `SearchBar`, `ActiveFilters` | Filter bar building blocks |

## Empty & error states

Every empty/not-found case uses `EmptyState`: empty cart, empty wishlist,
no orders, no search results, no products, and product/category/brand/order
not-found pages. Heading level is `h1` on standalone pages and `h2`/`h3`
where the page already has an `h1`. The app is wrapped in an `ErrorBoundary`
whose fallback uses `ErrorState` with a "Try again" reset.

## Conventions

- **Consistent API**: typed props, `className` passthrough via `cn()`.
- **Accessibility**: visible labels, `aria-*` on interactive elements,
  keyboard support (Escape for dialogs/menus), focus-visible rings,
  `aria-current` on pagination.
- **Dark/light**: every primitive ships both palettes.
- **Responsive**: grid-based layouts (1 → 2 → 4 columns), drawer/modal
  variants on mobile, sticky filter bar.

## Design tokens (reference)

| Token          | Value(s)                                |
| -------------- | --------------------------------------- |
| Brand          | `red-500` (#ef4444), hover `red-600`    |
| Neutrals       | `slate-50`–`slate-950` (dark: `slate-800`+ surfaces) |
| Accents        | `amber-500` (bestseller), `green-500` (sale/in-stock) |
| Radius         | `rounded-2xl` cards, `rounded-full` pills/buttons, `rounded-xl` controls |
| Shadows        | `shadow-lg`/`shadow-2xl` with `dark:shadow-*-900/30` variants |
| Motion         | Framer Motion: 0.15–0.5s, spring for modals/drawers |
| Breakpoints    | Tailwind defaults (sm 640, md 768, lg 1024) |
| Currency       | `CURRENCY` in `constants/checkout.ts`; format with `formatMoney()` |
