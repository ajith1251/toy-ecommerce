# Contributing

This is a personal engineering project, but the repo is kept in a state where anyone can build, test, and extend it. If you'd like to poke at it:

## Setup

```bash
npm install
npm run server:dev   # API on :4000 (embedded PostgreSQL, auto-migrated + seeded)
npm run dev          # frontend on :5173
```

See the [README](README.md) for environment variables and the full script table.

## Ground rules

- **Run the gates before proposing changes:** `npm run verify` (lint + unit + build). Backend changes additionally need `npm run server:test`; behavior changes deserve a Playwright spec.
- **Respect the layering** (see [docs/frontend-architecture.md](docs/frontend-architecture.md) and [docs/backend-architecture.md](docs/backend-architecture.md)):
  - Frontend: pages → hooks → services → API client. Pages never call `fetch()` or touch `localStorage` directly.
  - Backend: routes → controllers → services → repositories. Business decisions (pricing, stock, ownership) stay server-side.
- **Validate at the boundary** with zod schemas; return structured error envelopes.
- **Admin mutations write audit logs.**
- **No secrets in the repo.** Use `.env.example` files for variable documentation; keep real values out of git.

## Schema changes

Add a numbered SQL migration under `server/migrations/` (never edit applied ones) and update [docs/database-schema.md](docs/database-schema.md).

## Commit style

Short imperative subject lines, e.g. `Add low-stock filter to admin inventory`. Larger changes should update the relevant doc in `docs/` in the same commit.
