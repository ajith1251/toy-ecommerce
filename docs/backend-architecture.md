# Backend Architecture

ToyBox Phase 6 introduces a real REST backend and PostgreSQL persistence. The
application is now a full-stack foundation:

```
React (UI)
   ↓
Services (productService, orderService)
   ↓
API Client (src/lib/api/client.ts)          ← the single fetch boundary
   ↓
REST API (Express, server/)
   ↓
Backend Services (business rules: pricing, stock, order numbers)
   ↓
Repositories (parameterized SQL)
   ↓
PostgreSQL
```

## Layout

The backend lives in its own npm workspace (`server/`) with its own build,
lint (typecheck), test and database scripts. Root scripts delegate to it
(`npm run server:dev`, `npm run server:test`, `npm run db:migrate`, …).

```
server/
├── src/
│   ├── app.ts               Express app factory (pool injected — testable)
│   ├── server.ts            Bootstrap: embedded PG, migrations, listen, graceful shutdown
│   ├── config.ts            Environment configuration (dotenv)
│   ├── db/
│   │   ├── embedded.ts      Embedded PostgreSQL lifecycle (dev/test, no Docker required)
│   │   ├── pool.ts          Connection pool factory (one pool per process)
│   │   └── migrations.ts    Deterministic SQL migration runner (schema_migrations)
│   ├── errors.ts            ApiError + stable error codes, safe 500 mapping
│   ├── types.ts             Domain DTOs mirroring the frontend contracts
│   ├── schemas/             zod validation (orders, cart, wishlist, query params)
│   ├── repositories/        Parameterized SQL access (products, categories, brands, orders, cart, wishlist)
│   ├── services/            Business rules (catalog, orders, cart, wishlist)
│   ├── controllers/         HTTP concerns (thin)
│   ├── middleware/          validate (zod), requireClientId, logger, errorHandler
│   ├── routes/              REST route wiring
│   └── utils/               ids (order numbers), pricing (server-authoritative)
├── migrations/              *.sql applied in order, tracked in schema_migrations
├── seeds/seed.ts            Deterministic catalog seed (transforms src/data/products.ts)
├── scripts/                 db.ts CLI (migrate/seed/reset), e2e-start.mjs, stop-leftover-pg.mjs
└── tests/                   Vitest + supertest against a dedicated test database
```

## Layering rules

- **Controllers** parse/validate requests and shape responses — no SQL.
- **Services** contain business rules (server pricing, stock checks, order
  numbers, transactional order placement).
- **Repositories** own database access with parameterized queries — no raw
  user input is ever interpolated into SQL.
- The **API client** (`src/lib/api/client.ts`) is the only module in the
  frontend that calls `fetch()`.

## Server-authoritative order placement

`POST /api/orders` runs entirely server-side inside one database transaction:

1. Lock the requested product rows (`SELECT … FOR UPDATE`) so concurrent
   checkouts cannot oversell stock.
2. Validate existence, activity and stock against the **current** database
   state.
3. Recalculate `subtotal / discount / shipping / tax / grandTotal` from
   **current server prices** (never client-supplied totals, prices or
   discounts).
4. Generate a unique order number (`TBX-YYYYMMDD-XXXXXX`) with a DB UNIQUE
   constraint and a collision-retry loop.
5. Insert the order + item snapshots and decrement stock.
6. COMMIT — or ROLLBACK on any failure (no order without stock update, and
   vice versa).

## Anonymous client scoping

There is no authentication yet. Carts, wishlists and orders are scoped to an
anonymous browser id (`X-Client-Id` header) generated client-side and kept in
localStorage (`toybox-anon-id`). **This is not security** — it is a temporary
demo mechanism so a browser can see its own carts/orders. Phase 7 replaces it
with authenticated ownership.

## Databases

Three isolated PostgreSQL instances can run concurrently (all managed by the
same embedded-postgres runner — no Docker required):

| Database     | Port | Purpose                                   | Reset          |
| ------------ | ---- | ----------------------------------------- | -------------- |
| `toybox`     | 55432| Local development                          | `npm run db:reset` |
| `toybox_test`| 55433| Backend test suite (global setup)         | automatic per run |
| `toybox_e2e` | 55480+| Playwright full-stack suite                | automatic per run |

The embedded runner forces a UTF-8 cluster (`--locale=C --encoding=UTF8`), so
emoji-heavy catalog data round-trips on any host OS locale. When
`DATABASE_URL` is set, the server skips embedded management entirely and talks
to the external database (migrations/seed run explicitly via `db:*` scripts).

## Health, logging, errors

- `GET /api/health` reports API + database status (no internals exposed).
- Structured request logging: method, path, status, duration — **bodies are
  never logged** (checkout payloads contain payment data).
- All failures become `{ error: { code, message, details? } }`. Internal
  details (SQL errors, stack traces) are logged server-side only.
- Basic security hygiene: CORS allow-list (no wildcard), helmet headers,
  100 kb body limit, zod validation on every input, rate limiting on order
  placement, parameterized SQL, no secrets in source.

See [api.md](api.md), [database-schema.md](database-schema.md) and
[local-development.md](local-development.md).
