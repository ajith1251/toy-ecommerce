import pg from 'pg';

const { Pool } = pg;

export type DbPool = pg.Pool;

export interface PoolOptions {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  /** Schema prefix to sandbox a pool inside a single test database. */
  schema?: string;
}

/**
 * Creates a reusable connection pool. One pool per process — never a new
 * connection per request. Limits are env-tunable (DB_POOL_MAX,
 * DB_IDLE_TIMEOUT_MS, DB_CONNECT_TIMEOUT_MS) so production sizing does not
 * require code changes.
 */
export function createPool(opts: PoolOptions): DbPool {
  return new Pool({
    connectionString: opts.connectionString,
    max: opts.max ?? 10,
    idleTimeoutMillis: opts.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: opts.connectionTimeoutMillis ?? 10_000,
    // The embedded Windows PostgreSQL cluster defaults to the OS locale;
    // force UTF-8 so catalog data (emojis) round-trips correctly.
    options: '-c client_encoding=UTF8',
  });
}

/** Closes the pool and releases every connection (for graceful shutdown). */
export async function closePool(pool: DbPool): Promise<void> {
  await pool.end();
}

/** Runs a trivial query to verify connectivity. */
export async function ping(pool: DbPool): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
