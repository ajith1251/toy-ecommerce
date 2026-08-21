# ToyBox — Authentication Security

Security decisions and threat-model notes for the Phase 7 account system.
Architecture (sessions, ownership, migration) is in
[auth-architecture.md](auth-architecture.md).

## Password storage

- **Argon2id** via `@node-rs/argon2` (native bindings). Default parameters:
  memory cost 64 MB, 3 iterations, 4 lanes.
- Plaintext and reversible encryption are never used. `password_hash` is the
  only password-related column and is never selected into any API response.
- Passwords are never logged; server logs contain no secrets or tokens.

## Sessions

- Opaque random token in an **HttpOnly, SameSite=Lax** cookie; `Secure` in
  production. JavaScript cannot read the token, and it is never written to
  `localStorage`/`sessionStorage`.
- Only the **SHA-256 hash** of the token is stored in `sessions`, so a
  database dump cannot be replayed. `revoked_at` enables immediate
  revocation (logout, "log out everywhere", password change).
- **Session fixation:** login/register always create a brand-new session
  (never upgrade an anonymous one); `POST /api/auth/refresh` rotates the
  token on every use.
- Password change revokes every **other** session — the current browser
  stays signed in.

## Ownership & isolation

- The authenticated identity comes exclusively from the verified session
  (`requireAuth`). User ids in bodies/query/params are never trusted for
  ownership.
- Cross-user access is authorization-safe: another user's order/cart/
  wishlist/address is indistinguishable from one that does not exist
  (`404` / scoped queries with `WHERE user_id = $1`).
- Enforced at the database level with foreign keys
  (`orders.user_id`, `carts.user_id`, `wishlists.user_id`,
  `addresses.user_id`, `sessions.user_id`) and appropriate indexes.
- Mandatory isolation tests: user A cannot see/read user B's orders, carts,
  wishlists, or addresses (backend + E2E).

## Account enumeration

- Login returns the generic **"Invalid email or password"** whether the
  email exists or not.
- `POST /api/auth/forgot-password` returns an identical response shape
  whether or not the account exists, and never reveals existence.

## CSRF

Cookie-based auth means CSRF must be considered explicitly. Two layers:

1. **SameSite=Lax** on the session cookie (primary defense) — cross-site
   POSTs do not carry the cookie.
2. **`sameOrigin` middleware** (defense-in-depth) — non-GET requests from a
   different origin are rejected with `403` before they reach any handler.
   In local dev the allowed origin list comes from `CORS_ORIGINS`.

`HttpOnly` alone does not prevent CSRF — that is why both layers exist.

## Rate limiting

- Auth endpoints get a stricter per-IP limiter (default **20 req / 15 min**,
  configurable): login, register, refresh, forgot-password, reset-password,
  and merge. `429` responses use the standard error envelope
  (`code: 'rate_limited'`).
- The general API limiter (default 60 req / 15 min) covers everything else.
- The E2E environment raises both limits so parallel localhost browsers do
  not trip them; production defaults stay strict.

## Other controls (preserved from Phase 6, no regressions)

- **Helmet** security headers, CORS restricted to configured origins.
- **Body limits**, **parameterized SQL** everywhere (repositories only),
  **zod validation** on every input, centralized **error sanitization**
  (SQL/stack details never reach the client).
- Password reset tokens are single-use, TTL-limited (30 min), and stored
  only as hashes. The link is delivered **by email only** — the API response
  never contains the token, so there is no client-side secret to leak.

## Known limitations

- `X-Client-Id` remains for guest carts/wishlists/orders — it is anonymous
  scoping, not authentication, and Phase 8 auth for guest data inherits it.
- Email delivery defaults to a **console log** in development (zero setup)
  and a JSONL **file outbox** in E2E; real SMTP requires `EMAIL_TRANSPORT=smtp`
  and `SMTP_*` env vars. SPF/DKIM and transactional-templating are left to
  the chosen SMTP provider.
- No OAuth/social login, MFA, or admin roles (future phases, explicitly out
  of scope for Phase 7).
