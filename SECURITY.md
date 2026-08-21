# Security Policy

## Supported configuration

ToyBox is a portfolio/engineering project and is **not deployed publicly**. Security review effort focuses on the code paths that would matter in production:

- Authentication & session handling (`server/src/services/authService.ts`, `server/src/middleware/auth.ts`)
- Payment verification & webhooks (`server/src/payments/`, `server/src/middleware/webhook.ts`)
- Admin authorization & audit logging (`server/src/routes/index.ts`, `server/src/repositories/auditLogRepository.ts`)

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Use GitHub's [private vulnerability reporting](https://github.com/ajith1251/toy-ecommerce/security/advisories/new) to report suspected vulnerabilities. Include a description, affected files/endpoints, and reproduction steps if possible.

## Notes for contributors

- Never commit real credentials. Configuration templates (`.env.example`, `.env.production.example`) must contain placeholder values only.
- Test fixtures use obviously fake data (`Password123!`, `4242 4242 4242 4242`, `example.com` addresses) — keep it that way.
- New admin mutations must write an audit-log entry.
- New endpoints require zod validation at the boundary and ownership checks derived server-side.
