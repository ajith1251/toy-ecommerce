/**
 * Playwright webServer entry point. Resets a dedicated `toybox_e2e`
 * database (drop → migrate → seed) on its own embedded PostgreSQL instance,
 * then starts the API against it. Every E2E run starts from the same
 * deterministic catalog with full stock.
 *
 * The embedded PostgreSQL port is chosen per-run so a force-killed previous
 * run (Playwright terminates the web server) can never leave a stuck socket
 * that blocks the next run.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runSync(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', [script, ...args], {
      cwd: serverRoot,
      env: process.env,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code}`))));
  });
}

// 55480–55579 — well clear of the fixed dev (55432), test (55433) ports.
const pgPort = 55480 + (process.pid % 100);

const e2eEnv = {
  ...process.env,
  DB_NAME: 'toybox_e2e',
  PORT: '4000',
  EMBEDDED_PG_PORT: String(pgPort),
  EMBEDDED_PG_DATA_DIR: '.pgdata-e2e',
  NODE_ENV: 'development',
  // E2E browsers share one loopback IP, so all workers drain a single
  // per-IP budget. The limiters stay ACTIVE (429s still possible); only
  // the ceilings are raised for this harness. Production keeps the strict
  // defaults from config.ts.
  AUTH_RATE_LIMIT_MAX: '200',
  RATE_LIMIT_MAX: '100000',
  ADMIN_RATE_LIMIT_MAX: '5000',
  // Deliver password-reset emails to a JSONL outbox the specs can read
  // (mailpit-style) instead of real SMTP.
  EMAIL_TRANSPORT: 'file',
  EMAIL_OUTBOX_PATH: '.outbox-e2e.jsonl',
  APP_BASE_URL: 'http://localhost:4173',
};

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', [script, ...args], {
      cwd: serverRoot,
      env: e2eEnv,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code}`))));
  });
}

async function main() {
  // A previous force-killed run may have orphaned the embedded PostgreSQL
  // daemon for the e2e data dir — stop it so the reset starts clean.
  console.log('[e2e] cleaning up any leftover embedded PostgreSQL…');
  await runSync('tsx', ['scripts/stop-leftover-pg.mjs']);

  // Reset the email outbox so the password-reset spec starts clean.
  rmSync(path.resolve(serverRoot, '.outbox-e2e.jsonl'), { force: true });

  console.log(`[e2e] resetting toybox_e2e database on PG port ${pgPort} (drop → migrate → seed)…`);
  await run('tsx', ['scripts/db.ts', 'reset']);
  console.log('[e2e] starting API on :4000…');
  const api = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: serverRoot,
    env: e2eEnv,
    stdio: 'inherit',
    shell: true,
  });
  api.on('exit', code => {
    console.log(`[e2e] API exited with code ${code ?? 0}`);
    process.exit(code ?? 0);
  });
}

main().catch(err => {
  console.error('[e2e] startup failed:', err);
  process.exit(1);
});
