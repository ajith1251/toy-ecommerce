# Local Development

## Prerequisites

- Node.js ≥ 20 (Node 24 used in development)
- npm ≥ 10 (the repo is an npm workspace: `server` is a workspace package)

**No PostgreSQL installation or Docker required.** The backend manages its own
embedded PostgreSQL 18 binary (per-OS packages downloaded at `npm install`).
If you prefer, point `DATABASE_URL` at any PostgreSQL ≥ 14 and the server will
use it instead (migrations/seed then run explicitly).

## One-time setup

```bash
npm install          # installs frontend + server workspaces
npx playwright install chromium   # E2E browser (one-time)
```

## Start everything (two terminals)

```bash
# Terminal 1 — backend (embedded PG + migrations + seed-if-empty + API :4000)
npm run server:dev

# Terminal 2 — frontend dev server (:5173, proxies nothing — API base is absolute)
npm run dev
```

Open http://localhost:5173. The app loads the catalog from
http://localhost:4000/api (set `VITE_API_BASE_URL` to override).

## Development workflow

```
Create database   → automatic (embedded PG + toybox db on first server:dev)
Configure .env    → copy server/.env.example to server/.env (optional)
Run migrations    → automatic on server:dev; manual: npm run db:migrate
Run seed          → automatic when catalog empty; manual: npm run db:seed
Start backend     → npm run server:dev
Start frontend    → npm run dev
```

## Database scripts (root)

| Command            | What it does                                                    |
| ------------------ | -------------------------------------------------------------- |
| `npm run db:migrate` | Applies pending migrations (idempotent)                       |
| `npm run db:seed`    | Seeds 52 categories / 53 brands / 54 products (idempotent)    |
| `npm run db:reset`   | ⚠️ **Destroys all development data**, then migrate + seed      |

## Testing

| Command                    | What it runs                                        |
| -------------------------- | --------------------------------------------------- |
| `npm test`                 | Frontend unit/component suite (Vitest + jsdom)       |
| `npm run test:coverage`    | Frontend suite with coverage thresholds enforced     |
| `npm run server:test`      | Backend suite (Vitest + supertest against `toybox_test`) |
| `npm run test:e2e`         | Full-stack Playwright suite (API + DB + frontend build) |
| `npm run verify`           | Frontend lint + unit + build (fast pre-commit gate)  |
| `npm run server:build`     | Backend typecheck + build (`server/dist`)            |
| `npm run server:lint`      | Backend typecheck (`tsc --noEmit`)                   |

`npm run test:e2e` starts both web servers itself: the backend (fresh
`toybox_e2e` database — drop, migrate, seed — then API on :4000) and the
production frontend build (`vite preview` on :4173). Every run starts from
the same deterministic catalog with full stock. A cleanup step kills any
leftover embedded PostgreSQL from an aborted run.

## Environment variables

See `server/.env.example` for the full list. Key ones:

| Variable            | Default                                  | Purpose                          |
| ------------------- | ---------------------------------------- | -------------------------------- |
| `PORT`              | `4000`                                   | API port                         |
| `DATABASE_URL`      | *(unset → embedded PG)*                  | External PostgreSQL connection   |
| `EMBEDDED_PG_PORT`  | `55432` (dev)                            | Embedded instance port           |
| `DB_NAME`           | `toybox`                                 | Database name                    |
| `CORS_ORIGINS`      | `localhost:5173,localhost:4173,127.0.0.1` | Allowed browser origins (no `*`) |
| `VITE_API_BASE_URL` | `http://localhost:4000/api` (frontend)   | API base the browser calls       |

### Razorpay Payment Setup

For payment integration, you'll need a Razorpay account. For development/testing, use Razorpay Test Mode:

1. Sign up at https://razorpay.com and create a test account
2. Get your Test API keys from the Razorpay Dashboard → Settings → API Keys
3. Add to `server/.env`:
   ```bash
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_test_secret
   RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret
   ```
4. For webhook testing locally, use ngrok or similar:
   ```bash
   ngrok http 4000
   ```
   Then configure the webhook URL in Razorpay Dashboard: `https://your-ngrok-url.ngrok.io/api/webhooks/razorpay`

Never commit real secrets; `.env` files are gitignored.
