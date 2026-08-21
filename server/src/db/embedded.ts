import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import EmbeddedPostgres from 'embedded-postgres';
import { SERVER_ROOT } from '../config.js';

const { Client } = pg;

export interface EmbeddedPgOptions {
  port: number;
  dbName: string;
  user: string;
  password: string;
  dataDir: string;
}

let instance: EmbeddedPostgres | null = null;
let activeOpts: EmbeddedPgOptions | null = null;

function createInstance(opts: EmbeddedPgOptions): EmbeddedPostgres {
  return new EmbeddedPostgres({
    databaseDir: opts.dataDir,
    user: opts.user,
    password: opts.password,
    port: opts.port,
    persistent: true,
    // Force a UTF-8 cluster regardless of the host OS locale so emoji-heavy
    // catalog data round-trips correctly (Windows defaults to WIN1252).
    initdbFlags: ['--locale=C', '--encoding=UTF8'],
    trustLocalhost: true,
  } as never);
}

/** True when the data dir already holds an initialized cluster. */
function clusterExists(opts: EmbeddedPgOptions): boolean {
  return existsSync(opts.dataDir) && readdirSync(opts.dataDir).length > 0;
}

/** True when something is already serving this port (a leftover server). */
async function canConnect(opts: EmbeddedPgOptions): Promise<boolean> {
  const client = new Client({
    host: '127.0.0.1',
    port: opts.port,
    user: opts.user,
    password: opts.password,
    database: opts.dbName,
    connectionTimeoutMillis: 2000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * Starts (or reuses) the embedded PostgreSQL server and ensures the
 * database exists. Persistent clusters are initialized once. If a server is
 * already serving the port (left over from an aborted run) it is reused —
 * never two servers on one data directory.
 */
export async function startEmbeddedPg(opts: EmbeddedPgOptions): Promise<void> {
  if (!instance) {
    instance = createInstance(opts);
    activeOpts = opts;
    if (!clusterExists(opts)) {
      await instance.initialise();
    }
    try {
      await instance.start();
    } catch (err) {
      if (!(await canConnect(opts))) {
        throw err;
      }
      // A leftover server is already serving this cluster — reuse it.
    }
  }
  try {
    await instance.createDatabase(opts.dbName);
  } catch {
    // Database already exists — that is fine.
  }
}

/** Resolves the pg_ctl binary shipped with the embedded PostgreSQL package. */
function pgCtlPath(): string {
  const arch = process.arch;
  const platformPkg =
    process.platform === 'win32'
      ? 'windows-x64'
      : process.platform === 'darwin'
        ? arch === 'arm64'
          ? 'darwin-arm64'
          : 'darwin-x64'
        : arch === 'arm64'
          ? 'linux-arm64'
          : 'linux-x64';
  let pgRoot: string;
  try {
    // embedded-postgres' exports map does not expose package.json — resolve
    // it directly from the (hoisted) npm layout as a fallback.
    pgRoot = path.dirname(require.resolve('embedded-postgres/package.json'));
  } catch {
    pgRoot = path.resolve(SERVER_ROOT, '..', 'node_modules', 'embedded-postgres');
  }
  return path.join(pgRoot, '..', '@embedded-postgres', platformPkg, 'native', 'bin', process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
}

/** Graceful stop: `pg_ctl stop -m fast -w` releases the cluster cleanly. */
function gracefulStop(dataDir: string): void {
  const pgCtl = pgCtlPath();
  execFileSync(pgCtl, ['stop', '-D', path.resolve(dataDir), '-m', 'fast', '-w'], {
    stdio: 'ignore',
    timeout: 20_000,
  });
}

/**
 * Force-kills any postgres process belonging to the embedded cluster. Matches
 * the data dir AND the embedded binary path — orphaned io_worker children
 * carry the binary path but not the data-dir argument.
 */
function killPostgresForDataDir(dataDir: string): void {
  const dataDirPath = path.resolve(dataDir);
  if (process.platform === 'win32') {
    const pgRoot = path.dirname(require.resolve('embedded-postgres/package.json'));
    const binaryFrag = path.join(pgRoot, '@embedded-postgres').replace(/\\/g, '\\\\');
    const script = `
$targets = Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" |
  Where-Object { $_.CommandLine -like '*${dataDirPath.replace(/\\/g, '\\\\')}*' -or $_.CommandLine -like '*${binaryFrag}*' }
foreach ($p in $targets) {
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}`;
    const dir = mkdtempSync(path.join(os.tmpdir(), 'toybox-stop-pg-'));
    const file = path.join(dir, 'stop.ps1');
    writeFileSync(file, script);
    try {
      execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file], {
        encoding: 'utf8',
        stdio: 'ignore',
      });
    } catch {
      // No matching processes — nothing to clean.
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } else {
    try {
      execFileSync('pkill', ['-f', dataDirPath], { stdio: 'ignore' });
      execFileSync('pkill', ['-f', 'embedded-postgres'], { stdio: 'ignore' });
    } catch {
      // No matching processes — nothing to clean.
    }
  }
}

/**
 * Stops the embedded PostgreSQL server (idempotent). Uses a graceful
 * `pg_ctl stop -m fast` (which releases the cluster's shared memory on
 * Windows) instead of force-killing — a force-killed postmaster leaves a
 * zombie shared-memory block that blocks the next run. Force-kill is only a
 * last resort.
 */
export async function stopEmbeddedPg(): Promise<void> {
  if (!instance) return;
  const opts = activeOpts;
  instance = null;
  activeOpts = null;
  if (opts) {
    try {
      gracefulStop(opts.dataDir);
    } catch {
      // Server may already be stopped — fall through to the liveness check.
    }
  }
  if (opts && (await canConnect(opts))) {
    killPostgresForDataDir(opts.dataDir);
    // Wait for the port to actually free up.
    for (let i = 0; i < 10 && (await canConnect(opts)); i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

export function isEmbeddedRunning(): boolean {
  return instance !== null;
}

/** Connection URL for the embedded instance. */
export function embeddedConnectionUrl(opts: EmbeddedPgOptions): string {
  return `postgres://${opts.user}:${opts.password}@127.0.0.1:${opts.port}/${opts.dbName}`;
}
