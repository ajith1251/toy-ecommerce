/**
 * Zero-dependency full-stack dev runner for ToyBox.
 *
 * `npm run dev:all` boots the API (embedded PostgreSQL + migrations + seed)
 * and the Vite dev server together in one command. Ctrl-C (or SIGTERM)
 * gracefully stops both — plus any leftover embedded PostgreSQL — so
 * nothing is left running afterwards.
 *
 * No runtime dependencies: only Node built-ins (child_process, fetch).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const API_READY_URL = 'http://localhost:4000/api/health/ready';
const API_READY_TIMEOUT_MS = 120_000;

const children = new Map(); // label -> child
let stopping = false;
let apiReady = false;
let webUrl = '';

function log(message) {
  console.log(`[dev:all] ${message}`);
}

function start(label, cmd, args, { captureStdout = false } = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    env: process.env,
    stdio: captureStdout ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    detached: true, // own process group so we can kill the whole tree on exit
  });

  if (captureStdout) {
    let buffer = '';
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        process.stdout.write(`${line}\n`);
        const match = line.match(/Local:\s+(https?:\/\/localhost:\d+)\//);
        if (match && !webUrl) {
          webUrl = match[1];
          log(`Vite is up → ${webUrl}`);
        }
      }
    });
  }

  child.on('error', err => {
    log(`failed to start ${label}: ${err.message}`);
    stopEverything();
  });

  child.on('exit', (code, signal) => {
    children.delete(label);
    if (!stopping) {
      log(`${label} exited unexpectedly (code ${code ?? 'null'}, signal ${signal ?? 'null'}) — shutting everything down.`);
      stopEverything();
    }
  });

  children.set(label, child);
  return child;
}

async function waitForApi() {
  const deadline = Date.now() + API_READY_TIMEOUT_MS;
  while (!stopping && Date.now() < deadline) {
    try {
      const res = await fetch(API_READY_URL);
      if (res.status === 200) {
        apiReady = true;
        log('API ready (db up) → http://localhost:4000');
        return;
      }
    } catch {
      // API not up yet — keep polling.
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function cleanupEmbeddedPg() {
  return new Promise(resolve => {
    const proc = spawn(process.execPath, [path.resolve(root, 'server/scripts/stop-leftover-pg.mjs')], {
      cwd: root,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    proc.on('exit', () => resolve());
    proc.on('error', () => resolve());
  });
}

function stopEverything(code = 0) {
  if (stopping) return;
  stopping = true;

  log('stopping everything…');
  for (const child of children.values()) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }

  // Give the API a moment to run its graceful shutdown
  // (it stops embedded PostgreSQL via stopEmbeddedPg), then force-kill and
  // sweep for any orphaned PostgreSQL before exiting.
  setTimeout(async () => {
    for (const child of children.values()) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        // Already gone.
      }
    }
    await cleanupEmbeddedPg();
    log('done — nothing left running.');
    process.exit(code);
  }, 6000);
}

process.on('SIGINT', () => stopEverything(130));
process.on('SIGTERM', () => stopEverything(0));
process.on('unhandledRejection', err => {
  log(`unhandled rejection: ${err instanceof Error ? err.message : String(err)}`);
  stopEverything(1);
});

log('starting API (embedded PostgreSQL + migrations + seed) and Vite…');
start('api', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'server:dev']);
start('web', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], { captureStdout: true });

void waitForApi().then(() => {
  if (!stopping && webUrl) {
    log(`✓ Full stack is up: ${webUrl}  (API → http://localhost:4000)`);
  }
});