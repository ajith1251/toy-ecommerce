# ADR-002: localStorage as the persistence layer

**Status:** Accepted (Phase 1, hardened in Phase 4)

## Context

ToyBox is frontend-only with no backend. The full shopping journey (cart,
wishlist, recently viewed, theme, filters, checkout drafts, orders) must
survive refreshes on the device where it was used.

## Decision

Persist all app state in `localStorage`, keyed by a single centralized key
registry (`src/constants/storage.ts`), and **only through the safe wrapper**
(`src/lib/storage.ts`). No component or hook touches `localStorage` directly.

- Reads are JSON-parsed defensively, validated by type guards where practical,
  and fall back to safe defaults — malformed or legacy data is migrated or
  dropped, never crashed on.
- Writes never throw (quota / private-mode failures degrade silently).
- Sensitive checkout data (CVV, full card numbers) is never persisted.

## Consequences

- Data lives only on the device that created it; orders are not shared.
- The storage boundary is a single seam: swapping to a real API later only
  changes services, not UI.
- Keys are versionable; the checkout draft already carries a `version` field.
