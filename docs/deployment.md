# Deployment

How ToyBox is built, configured, migrated, deployed, and rolled back.

> **Status (Phase 10):** the deployment architecture and all operational
> controls are implemented and verified locally/staging. The application has
> **not yet been deployed to a live production environment** — see
> [production-readiness.md](production-readiness.md) for the honest checklist.

## Production architecture

```
                    INTERNET
                       │
                 HTTPS (platform LB / reverse proxy, TLS termination)
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
  web container                  api container
  (nginx: static SPA + /api proxy)   (node dist/server.js)
                                      │
                                      ↓
                                 PostgreSQL (external, private network)
                                        ↑
  Razorpay ── webhook HTTPS ────────────┘  (POST /api/payments/webhook)
```

- The browser talks **same-origin** to nginx; nginx proxies `/api/*` to the
  API container. Cookies stay first-party; CORS is a single explicit origin.
- PostgreSQL is never exposed publicly. Razorpay remains fully external.
- No Kubernetes, no microservices — two containers and a database.

## Build & run

### Local production mode (no Docker)

```bash
# frontend
npm run build && npm run preview          # serves dist/ on :4173

# backend (against external PG or embedded dev cluster)
cd server
DATABASE_URL=postgres://… NODE_ENV=production node dist/server.js
```

Never use `npm run dev` (Vite/tsx watch) to simulate production.

### Docker

```bash
docker compose up --build      # web :8080 → api → postgres (internal)
```

| Image | Dockerfile | Runtime base | Notes |
|---|---|---|---|
| `web` | `Dockerfile.web` | `nginx:1.27-alpine` | multi-stage Vite build; SPA fallback; `/api` proxy; immutable asset caching |
| `api` | `Dockerfile.server` | `node:22-alpine` | multi-stage tsc build; prod deps only; non-root `node` user; no embedded PG |

Both images are build-verified in CI (`docker` job). `.dockerignore` keeps
`.env*`, tests, local databases and docs out of the build context.

## Environment configuration

Templates: [.env.example](../.env.example) (frontend),
[.env.production.example](../.env.production.example) (API).

Rules:

- Secrets live in the platform's secret store — never in git, images, logs,
  or compose files.
- `VITE_API_BASE_URL` is a **build-time** constant (`/api` for same-origin).
- **Fail-safe startup:** with `NODE_ENV=production` the API refuses to boot
  unless `DATABASE_URL`, explicit non-localhost `CORS_ORIGINS`,
  `SESSION_COOKIE_SECURE`, Razorpay credentials + webhook secret, and SMTP
  email are configured (`validateProductionConfig` in
  `server/src/config.ts`). Missing values produce one clear error listing
  every problem.

## Database migrations

- Migrations run automatically at API startup, before the HTTP listener
  opens (`server/src/server.ts`) — traffic only ever hits an up-to-date
  schema. Each migration is transactional and recorded in
  `schema_migrations`; re-running is a no-op.
- For multi-instance deployments prefer running migrations as a separate
  step/job before rolling out new instances.
- `db:reset` is **blocked when `NODE_ENV=production`** — destructive resets
  are a reviewed, manual operation only.
- Schema changes should follow the expand → migrate → contract pattern so
  the previous application version keeps working during rollout (see
  [disaster-recovery.md](disaster-recovery.md) → Rollback).

## Health checks

| Endpoint | Meaning | Use |
|---|---|---|
| `GET /api/health/live` | process alive (no dependency checks) | container liveness / restart decisions |
| `GET /api/health/ready` | process + PostgreSQL reachable | load balancer routing |
| `GET /api/health` | legacy combined check | existing monitors |

Neither endpoint exposes secrets or internals. Docker `HEALTHCHECK`s use
them natively.

## Logging & correlation

- Production logs are JSON lines (`LOG_FORMAT=json`): `time`, `level`,
  `msg`, plus request metadata (`requestId`, `method`, `path`, `status`,
  `durationMs`, `userId`).
- Every request gets an `X-Request-Id` (honoured from trusted proxies,
  generated otherwise), echoed in responses and embedded in error envelopes
  (`error.requestId`) so customer reports are greppable.
- Never logged: passwords, session tokens, payment credentials, webhook
  secrets. Bodies are never logged at all.

## Error tracking

Provider-agnostic boundary: server `server/src/observability/errorTracking.ts`,
client `src/lib/errorTracking.ts`. Default sink is structured console
output; wire Sentry (or any provider) by calling `setErrorTracker` /
`setErrorReporter` once at boot — no other code changes. Contexts carry
metadata only (request id, route); never PII or payment data.

## Smoke test after deployment

```bash
curl -f https://<host>/                      # frontend served
curl -f https://<host>/api/health/live       # liveness
curl -f https://<host>/api/health/ready      # readiness (DB up)
curl -f "https://<host>/api/products?limit=1"
```

Then manually: register → login → browse → cart → checkout (Razorpay
**Test Mode**) → order appears → admin dashboard loads. Real payments are
never executed automatically.

## Rollback

1. Redeploy the previous image tag/digest (keep at least the last known-good).
2. Migrations are append-only and backward-compatible by policy; if a
   release shipped a migration, verify the previous app version tolerates
   the new schema (it must, per the expand/contract rule above).
3. If a migration itself must be undone, that is a reviewed manual
   operation — never automatic.

## Known limitations

- Docker builds are verified in CI but were **not executed locally**
  (Docker is not installed on the development machine).
- No CDN, no horizontal scaling story beyond "run more api containers" —
  deliberate scope for this project size.
