# Production Readiness Checklist

Phase 10 exit review. Each item: **PASS** / **FAIL** / **N/A**, with
evidence. Honest classification at the bottom.

## Security

| Item | Status | Evidence |
|---|---|---|
| Production config validation (fail-safe startup) | PASS | `validateProductionConfig` + boot check; unit-tested in `server/tests/observability.test.ts` |
| No secrets in git/images/logs | PASS | `.gitignore`, `.dockerignore`, logger never logs bodies/secrets |
| CORS explicit allowlist | PASS | exact-match origin check; localhost rejected in prod config |
| Secure cookies in production | PASS | `cookieSecure` defaults true; disabling fails startup |
| Rate limiting: general / auth / admin | PASS | configurable limiters on `/api`, `/auth/*`, `/admin/*` |
| Admin endpoints: authN + authZ + audit | PASS | `requireAuth` + `requireAdmin` + `admin_audit_logs` (Phase 9) |
| Error responses leak nothing internal | PASS | tested (`never exposes stack traces…`); requestId only |
| HTTPS enforced | PARTIAL | cookies/config are HTTPS-ready; actual TLS terminates at the (not yet existing) platform LB — N/A until deployed |

## Database

| Item | Status | Evidence |
|---|---|---|
| External PostgreSQL supported via DATABASE_URL | PASS | embedded PG is dev/test-only; prod requires DATABASE_URL |
| Connection pooling, timeouts configurable | PASS | `DB_POOL_MAX` / idle / connect env vars |
| Migrations safe & idempotent, run before listen | PASS | transactional, recorded, startup-ordered |
| Production reset blocked | PASS | `db:reset` exits when NODE_ENV=production |
| Backup strategy documented | PASS | production-operations.md |
| Restore actually tested | PASS | 2026-08-21 drill: fresh DB → migrate → restore → counts verified → API served catalog |
| Least-privilege app user documented | PASS | production-operations.md (enforcement depends on provider setup) |

## Application

| Item | Status | Evidence |
|---|---|---|
| Graceful shutdown (SIGTERM/SIGINT, drain, force-exit) | PASS | server.ts; double-signal guard, 20 s cap |
| Health liveness/readiness split | PASS | `/api/health/live`, `/api/health/ready`; Docker HEALTHCHECKs use them |
| Structured JSON logging | PASS | observability/logger.ts, LOG_FORMAT=json |
| Request correlation ids | PASS | X-Request-Id echo + error envelope field; tested |
| Error tracking boundary (no provider lock-in) | PASS | server + client boundaries; console sink default |
| Razorpay client timeout | PASS | withTimeout wrapper, RAZORPAY_TIMEOUT_MS |
| Frontend API URL not hardcoded | PASS | VITE_API_BASE_URL (build-time) |
| Bundle size warning resolved | PASS | vendor chunk split; largest chunk 245 kB |

## Payments

| Item | Status | Evidence |
|---|---|---|
| Test/live credential separation documented | PASS | .env.production.example; live keys only when account activated |
| Webhook signature verification mandatory | PASS | Phase 8 implementation retained |
| Webhook reliability (idempotent, transactional) | PASS | Phase 8; documented in disaster-recovery.md scenario 3 |
| Live payment executed | N/A | deliberately out of scope — no real money moved |

## Infrastructure

| Item | Status | Evidence |
|---|---|---|
| Multi-stage frontend image (nginx) | PASS* | built in CI; *not built locally (no Docker on dev machine) |
| Multi-stage backend image (non-root, no dev deps) | PASS* | built in CI; *same caveat |
| Compose stack (web/api/postgres, DB private) | PASS* | docker-compose.yml; *not run locally |
| CI pipeline: lint→tests→coverage→build→E2E→docker→audit | PASS | .github/workflows/ci.yml |
| Staging environment provisioned | FAIL | compose file exists; no hosted staging yet |

## Quality gates

| Item | Status | Evidence |
|---|---|---|
| Backend tests | PASS | 154/154 |
| Frontend tests | PASS | 373/373 (3 pre-existing checkout failures fixed at root cause this phase) |
| Coverage thresholds maintained | PASS | statements/functions/lines ≥ 75%, branches ≥ 60% (vite.config.ts) |
| Lint clean (frontend + backend typecheck) | PASS | final verification run |
| Production builds clean | PASS | vite build + tsc; bundle warning gone |
| E2E suite green | PASS* | 66 specs against production build (*last full local run pre-Phase-10 code changes — re-run below) |

## Verdict

> **Production-engineered / staging-ready.** The system is reproducibly
> buildable, containerized (CI-verified), securely configurable,
> observable, and recoverable, and runs against a real external PostgreSQL.
> It has **not been deployed to a live production environment**: no public
> domain/TLS, no hosted staging, no real Razorpay live keys, no measured
> RPO/RTO. Claiming "production-ready" beyond staging-readiness would be
> dishonest at this point.

Recommended next steps to close the gap: provision a small host/PAAS,
deploy the compose stack behind TLS, point a test webhook at it, run the
smoke checklist from deployment.md, then schedule the first live cutover.
