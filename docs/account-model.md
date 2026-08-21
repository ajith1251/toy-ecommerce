# ToyBox — Account Model

The customer-account data model added by Phase 7. Table definitions live in
`server/migrations/004_create_auth.sql`; the full schema is in
[database-schema.md](database-schema.md).

## Users

```
users
├── id              serial PK
├── email           text UNIQUE (normalized: trim + lowercase)
├── password_hash   text (Argon2id — never exposed)
├── first_name      text
├── last_name       text
├── phone           text
├── status          'active' | 'suspended'  (default 'active')
├── created_at      timestamptz
├── updated_at      timestamptz
└── last_login_at   timestamptz
```

- Email uniqueness is a **database constraint** (`UNIQUE` index) — never
  only an application-level check.
- Suspended accounts are rejected at login with a generic
  "This account has been suspended" response.
- `GET /api/auth/me` returns only safe fields: `id`, `email`, `firstName`,
  `lastName`, `phone`, `createdAt`.

## Sessions

```
sessions
├── id              serial PK
├── user_id         FK → users.id
├── token_hash      text UNIQUE (SHA-256 of the opaque cookie token)
├── created_at      timestamptz
├── expires_at      timestamptz
└── revoked_at      timestamptz NULL
```

- Multiple sessions per user (multiple devices); each row is one session.
- "Log out everywhere" = `UPDATE sessions SET revoked_at = now() WHERE user_id = $1`.
- Refresh = revoke the current row, insert a new one (rotation).

## Addresses

```
addresses
├── id            serial PK
├── user_id       FK → users.id
├── label         text        (e.g. "Home", "Work")
├── first_name, last_name, phone
├── line1, line2, city, state, postal_code, country
├── is_default    boolean     (exactly one per user at any time)
├── created_at, updated_at
```

- The first saved address automatically becomes the default; "Set default"
  clears the previous default (single UPDATE pair, scoped to `user_id`).
- Ownership is always `user_id` from the session — never client-supplied.

## Password reset tokens

```
password_resets
├── id            serial PK
├── user_id       FK → users.id
├── token_hash    text UNIQUE (SHA-256 of the one-time token)
├── created_at    timestamptz
├── expires_at    timestamptz (30 min)
└── used_at       timestamptz NULL
```

- Raw tokens are never persisted; single use (set `used_at`); expired rows
  are rejected.

## Ownership columns on existing tables

- `orders.user_id` — nullable FK; guests keep `client_id` (Phase 6 model),
  authenticated users own the order. Anonymous orders are claimed on merge.
- `carts.owner_key` / `wishlists.owner_key` — `user:<id>` or `client:<id>`
  (single lookup column replaces the previous client-only scoping). The
  client-scoped queries additionally require `user_id IS NULL` for orders so
  a claimed order leaves the anonymous scope.
- All ownership columns have indexes for the scoped lookups
  (`WHERE user_id = $1` / `WHERE owner_key = $1`).

## Safe fields

Endpoints never return `password_hash`, session token hashes, or any
internal fields. Profile updates (`PATCH /api/account/profile`) accept only
`firstName`, `lastName`, `phone` — id, email, status, and hashes are not
mutable through it.
