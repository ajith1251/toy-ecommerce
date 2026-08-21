import http from 'node:http';
import { createApp } from './app.js';
import { config, ConfigValidationError, validateProductionConfig } from './config.js';
import { startEmbeddedPg, stopEmbeddedPg, embeddedConnectionUrl } from './db/embedded.js';
import { runMigrations } from './db/migrations.js';
import { closePool, createPool, type DbPool } from './db/pool.js';
import { initLogger, log } from './observability/logger.js';
import { captureMessage } from './observability/errorTracking.js';

let pool: DbPool | null = null;
let server: http.Server | null = null;
let shuttingDown = false;

/** Grace period for in-flight requests before force-exit (container stop). */
const SHUTDOWN_TIMEOUT_MS = 20_000;

async function boot(): Promise<void> {
  initLogger(config);

  // Fail safe: refuse to start production with development-grade defaults.
  if (config.isProduction) {
    const problems = validateProductionConfig(config);
    if (problems.length > 0) throw new ConfigValidationError(problems);
  }

  let connectionString = config.databaseUrl;
  if (!connectionString && config.embedded.enabled) {
    log.info(`starting embedded PostgreSQL on :${config.embedded.port} (data: ${config.embedded.dataDir})`);
    await startEmbeddedPg(config.embedded);
    connectionString = embeddedConnectionUrl(config.embedded);
  }
  if (!connectionString) {
    throw new Error('No DATABASE_URL configured and embedded PostgreSQL is disabled');
  }

  pool = createPool({
    connectionString,
    max: config.db.poolMax,
    idleTimeoutMillis: config.db.idleTimeoutMs,
    connectionTimeoutMillis: config.db.connectionTimeoutMs,
  });
  await pool.query('SELECT 1');

  // Migrations run before the HTTP listener opens — traffic only ever hits
  // an up-to-date schema. Idempotent; each migration is transactional.
  const applied = await runMigrations(pool);
  if (applied.length > 0) log.info(`applied migrations: ${applied.join(', ')}`);

  const app = createApp({ pool, config });
  server = app.listen(config.port, () => {
    log.info(`ToyBox API listening on port ${config.port}`, { env: config.nodeEnv, port: config.port });
  });

  // Behind a reverse proxy: drop idle keep-alive sockets faster than the
  // proxy's timeout so restarts don't race in-flight keep-alive requests.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return; // A second signal must not double-run cleanup.
  shuttingDown = true;
  log.info(`${signal} received — shutting down`, { signal });

  // Hard exit if graceful draining stalls (hung socket, stuck query).
  const forceExit = setTimeout(() => {
    captureMessage('graceful shutdown timed out — forcing exit', { signal });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>(resolve => server?.close(() => resolve()));
    }
    if (pool) {
      await closePool(pool);
    }
    if (config.embedded.enabled && !config.databaseUrl) {
      await stopEmbeddedPg();
    }
  } catch (err) {
    captureMessage('error during shutdown cleanup', { signal, error: String(err) });
  }
  process.exit(0);
}

boot().catch(err => {
  if (err instanceof ConfigValidationError) {
    log.error(err.message, { code: 'config_validation_failed' });
  } else {
    // Some thrown values are Errors with no stack — always include message.
    log.error('fatal boot error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
  process.exit(1);
});

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// Unexpected process-level failures are reported through the tracking
// boundary; uncaughtException leaves no choice but to exit, but we log
// first so the failure is diagnosable.
process.on('unhandledRejection', reason => {
  captureMessage('unhandledRejection', { error: reason instanceof Error ? reason.stack : String(reason) });
});
process.on('uncaughtException', err => {
  captureMessage('uncaughtException', { error: err.stack });
  process.exit(1);
});
