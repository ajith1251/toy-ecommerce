# Disaster Recovery

What breaks, how it is detected, and how it is recovered. Targets are
**project-level goals**, not enterprise guarantees.

## Recovery objectives

| Target | Value | Meaning |
|---|---|---|
| **RPO** | ≤ 24 h (≤ 5 min with PITR enabled) | max acceptable data loss = backup cadence |
| **RTO** | ≤ 2 h | max acceptable time from failure to restored service |

These depend on the hosting provider's snapshot/PITR capabilities; the
values assume the backup strategy in
[production-operations.md](production-operations.md).

## Scenario runbooks

### 1. Database failure / data loss

1. Stop the API (scale to zero) — prevents writes to a broken state.
2. Provision replacement PostgreSQL (provider restore or fresh instance).
3. Restore latest backup:
   - Managed provider: point-in-time restore to just before the incident.
   - Manual/logical: `tsx scripts/snapshot.ts restore <snapshot.json> --to postgres://…`
     (runs migrations into the target first, replays rows in FK order,
     resets identity sequences, verifies every table count).
4. Boot the API against the restored DB; check `/api/health/ready`.
5. Smoke test: products list, login, one test-mode checkout, admin dashboard.
6. Resume traffic.

**Executed drill (2026-08-21):** dev database snapshotted (17 tables /
168 rows incl. 54 products), restored into a *fresh* `toybox_restore`
database — migrations applied, counts verified, API booted on the restored
data and served `/api/products` with HTTP 200. PASS.

### 2. Application failure (bad deploy)

See [deployment.md → Rollback](deployment.md): redeploy previous image tag.
Migrations are backward-compatible by policy, so old code + new schema is a
supported state.

### 3. Payment webhook outage

Razorpay retries failed webhook deliveries automatically. The API validates
every signature and processes idempotently; orders stuck in `pending` can be
confirmed by the admin (Orders → status transition) once Razorpay confirms
capture in its dashboard. If Razorpay itself is down: card/UPI checkout
fails closed with a clear user-facing error — COD still works, no false
payment confirmation is possible (signature verification is mandatory).

### 4. Deployment failure

Compose/CI deploys are atomic per container; a failed healthcheck means do
not shift traffic (load balancer readiness probe uses
`/api/health/ready`). Roll forward by fixing, or roll back per scenario 2.

### 5. Secret compromise

Rotate per [production-operations.md → Secret rotation]. For session
tokens: revoke all sessions (`UPDATE sessions SET revoked_at = now()`) —
users simply log in again. For DB credentials: rotate + audit
`admin_audit_logs` for unexpected admin activity.

## Backup retention

| Artifact | Retention |
|---|---|
| DB snapshots / WAL | 30 days |
| Application logs | 30 days |
| Admin audit logs | ≥ 1 year |
| Restore-drill records | indefinitely (this file) |

## What is NOT covered (honest scope)

- No multi-region failover, no warm standby database.
- No automated restore drills — quarterly manual drill per the table above.
- RPO/RTO have never been measured against a real production incident;
  they are design targets until then.
