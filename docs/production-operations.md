# Production Operations

Day-2 operations: monitoring, alerts, backups, secret rotation, database
access, and the production readiness checklist pointer.

> **Status (Phase 10):** controls are implemented and verified
> locally/staging; nothing here has been exercised against a live
> production deployment yet.

## Monitoring

Baseline metrics to watch (platform dashboards or log-based):

| Metric | Why |
|---|---|
| Request rate & error rate (4xx/5xx) | traffic health, regressions |
| p95 latency per route | user experience, saturation |
| DB connection pool usage | `DB_POOL_MAX` sizing, leaks |
| Payment creation/verification failures | revenue path |
| Webhook failures / non-2xx from Razorpay retries | order finalization risk |
| Order creation failures (`insufficient_stock`, 5xx) | inventory integrity |

The API exposes no public metrics endpoint; scrape logs
(JSON lines, `LOG_FORMAT=json`) or add a protected `/api/metrics` later if
a Prometheus stack is introduced. Do not build a large observability
platform for this project size.

### Suggested alerts (low-noise)

- 5xx rate > 1% over 5 minutes
- `/api/health/ready` failing ≥ 1 minute
- payment webhook failures > 0 in 15 minutes
- order creation failure spike (> 3× baseline)
- disk usage > 80% (DB host)

## Logs

- Format: JSON lines in production. Ship stdout/stderr to the platform's
  log service; retain 30 days (application logs).
- Every line carries `requestId`; error envelopes expose it to customers.
- `admin_audit_logs` (in-database) is the audit trail for admin mutations —
  retain ≥ 1 year (compliance-sensitive).

## Backups

**Primary:** managed PostgreSQL automated snapshots + point-in-time
recovery (PITR/WAL archiving), daily full + continuous WAL, retention 30
days.

**Verification:** a backup that has not been restored is not a backup —
see [disaster-recovery.md](disaster-recovery.md) for the restore procedure
and the executed test. Re-run the restore drill quarterly and record the
date here:

| Date | Method | Result |
|---|---|---|
| 2026-08-21 | logical snapshot (`server/scripts/snapshot.ts`) into fresh DB + API boot | PASS (17 tables, counts verified, catalog served) |

Monitor backups: alert when the latest snapshot is older than 25 h or its
size deviates sharply from the rolling average.

## Secret rotation

All of these are environment values — rotation never requires code changes
or rebuilds (restart with new env only):

| Secret | Rotation steps |
|---|---|
| Database credentials | create new user → grant → update `DATABASE_URL` → rolling restart → drop old user |
| Razorpay API keys | rotate in Razorpay dashboard → update env → restart (in-flight checkouts use short-lived orders; do it in low traffic) |
| Razorpay webhook secret | update dashboard + env together → restart |
| Session cookies | sessions are opaque random tokens stored server-side (no signing secret); "rotate" = mass-revoke via `sessions` table / logout-all if ever needed |

## Database access (production)

- Prefer the provider's console/SQL editor, or a bastion/VPN tunnel.
- The application connects as a **least-privilege app user** (CRUD on the
  toybox schema only) — never as superuser. Migrations run with the same
  user; DDL statements are plain SQL and need only schema ownership.
- Direct psql access from developer machines should go through the bastion;
  PostgreSQL is never exposed publicly.

## Dependency & image security

- CI runs `npm audit` (report-only) on every push; findings are triaged in
  this repo — breaking major upgrades are deliberate, planned work.
- Base images are pinned by major version (`node:22-alpine`,
  `nginx:1.27-alpine`); bump deliberately, watch for distro CVE bulletins.
- Images run as non-root where practical (API: `node` user) and contain no
  secrets (`.dockerignore` excludes `.env*`).

## Rate limits (production defaults)

| Scope | Default | Env override |
|---|---|---|
| General API | 1000 / 15 min / IP | `RATE_LIMIT_*` |
| Auth (login/register/reset) | 20 / 15 min / IP | `AUTH_RATE_LIMIT_*` |
| Admin operations | 100 / 15 min / IP | `ADMIN_RATE_LIMIT_*` |

Review after real traffic data exists; tighten general limits first.

## Privacy checklist

- Passwords: Argon2id hashes only; never logged, never in error contexts.
- Payments: card numbers/CVV/UPI credentials never stored (Razorpay token
  + last4 snapshot at most); webhook payloads not persisted raw.
- Error tracking contexts: metadata only (requestId, route, userId).
- Customer data minimization: accounts hold email/name/phone/addresses —
  export/delete requests are manual DB operations until a privacy tooling
  phase exists (documented limitation).
