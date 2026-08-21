# ToyBox — Authentication Architecture

Phase 7 replaced the Phase 6 anonymous identity model (`X-Client-Id`) with
real customer accounts. This document explains how authentication, sessions,
ownership, and guest migration fit together. Security decisions and
threat-model notes live in [auth-security.md](auth-security.md); the account
data model is in [account-model.md](account-model.md).

## High-level flow

```
Anonymous User
      ↓
Register / Login        POST /api/auth/register | /api/auth/login
      ↓
Authenticated Session   HttpOnly cookie (toybox_session) + sessions row
      ↓
Authenticated User      server derives ownership from the session
      ↓
Profile · Addresses · Cart · Wishlist · Orders
```

On every request the API runs `optionalAuth` (resolve the cookie → session →
user, or continue as guest) followed by `sameOrigin` (reject cross-origin
mutations as CSRF defense-in-depth). Routes that require an account add
`requireAuth`, which answers `401` with the standard error envelope when no
valid session is present.

## Session architecture

- **Transport:** an opaque, 256-bit random token in an **HttpOnly**,
  **SameSite=Lax** cookie (`toybox_session`). JavaScript never sees it —
  nothing is stored in `localStorage`/`sessionStorage`.
- **Storage:** only a **SHA-256 hash of the token** is stored, in the
  `sessions` table (`token_hash`), with `user_id`, `created_at`, `expires_at`,
  `revoked_at`. The raw token is never persisted, so a database leak cannot
  be replayed.
- **Lifetime:** default 7 days; `POST /api/auth/refresh` rotates the token
  (revokes the old session, issues a new one — session-fixation protection)
  and slides the expiry forward. Browser reloads stay authenticated because
  the cookie rides along and `GET /api/auth/me` restores the session.
- **Revocation:** logout revokes the current session server-side; "log out
  everywhere" (`POST /api/auth/logout-all`) revokes every session for the
  user. After revocation the session's `revoked_at` is set and the token
  stops working.
- **Cookie configuration is environment-specific** (`server/src/config.ts`):
  `Secure` is forced in production (HTTPS) and off in local dev (HTTP);
  `SameSite=Lax` protects against cross-site CSRF while keeping the cookie
  available for top-level navigations.

## Password security

- Passwords are hashed with **Argon2id** (`@node-rs/argon2` — native,
  memory-hard, GPU-resistant). Plaintext or reversible encryption is never
  stored; hashes are never returned by any endpoint.
- Validation (server + client): minimum 8 characters, non-empty, and
  confirmation-match on registration. No arbitrary composition rules.
- Email is normalized (`trim().toLowerCase()`) before storage, and email
  uniqueness is enforced with a **unique index at the database level** (not
  just an application check) — `User@Example.com` and `user@example.com`
  cannot create duplicate accounts.

## Ownership model

Ownership is **always resolved server-side from the verified session** — the
client never supplies a user id. Carts and wishlists are keyed by an
`owner_key` column: `user:<id>` for authenticated users, `client:<id>` for
guests. Orders carry a nullable `user_id` (guests keep working via
`client_id`).

- `GET /api/orders` returns only the authenticated user's orders.
- `GET /api/orders/:id` returns `404` when the order belongs to another user
  (authorization-safe: no existence leak).
- Cart/wishlist mutations scoped to the session user; a user can never read
  or write another user's cart, wishlist, or addresses.
- `requireAuth` uses the session identity exclusively — request bodies,
  query strings, and route parameters are never trusted for ownership.

## Guest → account migration

When a guest registers or logs in, the frontend `ShopProvider` calls
`POST /api/auth/merge` once per user id:

1. The guest's **server-side** cart rows (`client:<id>`) are merged into the
   account cart: quantities are summed per product, **capped at current
   stock**, and the guest rows are deleted.
2. Client-supplied **localStorage** cart items are merged the same way.
3. The wishlist is **unioned by product id** — duplicates collapse to one.
4. Same-browser anonymous orders are **claimed** for the account
   (`orders.user_id` set), so Phase 6 order history is preserved when the
   anonymous identity can be matched.
5. The guest's localStorage cart/wishlist copies are retired immediately so a
   fast reload cannot merge them a second time (idempotent by construction:
   the server clears the guest rows, and the client clears its copies).

Merge policy (documented behavior): account cart is preserved, guest
quantities are added on top, combined quantities cap at stock, and the
response reports which items were capped so the UI can inform the user.
Nothing is silently deleted.

## Middleware & guards

| Middleware | Behavior |
| ---------- | -------- |
| `optionalAuth` | Resolves the session cookie; sets `res.locals.user` when valid, otherwise leaves the request anonymous |
| `requireAuth` | `401` + `{ error: { code: 'unauthorized' } }` when there is no valid session |
| `requireClientId` | Requires the `X-Client-Id` header (guest scoping; still required on cart/wishlist/order routes) |
| `sameOrigin` | Rejects non-GET cross-origin requests (CSRF defense-in-depth alongside SameSite=Lax) |

## Frontend auth state

- `AuthProvider` boots by calling `GET /api/auth/me`; state is
  `loading → authenticated | unauthenticated` with the `User` object.
  Protected pages render a session-check loader instead of flashing content.
- `useAuth()` exposes `status`, `user`, `login`, `register`, `logout`,
  `refreshAuth`. A guest-safe default lets components render outside the
  provider (tests) without crashing.
- `RequireAuth` wraps account routes: loading → loader; unauthenticated →
  redirect to `/login` with `returnTo` state; after login the user is
  returned to their original destination.
- `ShopProvider` switches cart/wishlist to **server-backed** mode when
  authenticated and back to localStorage on logout; `cartReady` prevents
  empty-cart redirects during server-cart hydration (e.g. reloading directly
  onto `/checkout/shipping`).
- The API client sends `credentials: 'include'` so the cookie rides along,
  and maps `401/403/409/422/429` responses to typed `ApiError`s.

## Password reset & email delivery

`POST /api/auth/forgot-password` creates a one-time token (stored only as a
SHA-256 hash, 30-min TTL, single-use) and **emails the reset link** — the API
response is `{ ok: true }` whether or not the account exists, and never
contains the token. Delivery is pluggable (`server/src/services/emailService.ts`):

| Transport | Use | Behavior |
| --------- | --- | -------- |
| `console` | dev (default) | Logs the reset link to the server console — zero-setup testing; the token appears only in server logs |
| `file`    | dev / E2E | Appends each email as JSONL to `EMAIL_OUTBOX_PATH` (mailpit-style inspection; the E2E suite reads it) |
| `smtp`    | production | Real delivery via nodemailer (`SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`, sender `MAIL_FROM`, link base `APP_BASE_URL`) |

`/reset-password?token=…` (frontend) submits the new password;
`reset-password` consumes the token and revokes the user's other sessions.
The `forgot-password` / `reset-password` pages live at `/forgot-password` and
`/reset-password` with a "Forgot password?" link on the login form.

## Rate limiting

Authentication endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`,
`/auth/forgot-password`, `/auth/reset-password`, `/auth/merge`) use a
stricter per-IP limiter (default 20 requests / 15 min, configurable via
`AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MS`). The E2E environment
raises the limit so parallel browser tests share one loopback IP without
tripping it — production keeps the strict default.
