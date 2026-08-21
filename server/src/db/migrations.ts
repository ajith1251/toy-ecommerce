import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DbPool } from './pool.js';

/** Resolves the migrations directory (server/migrations) regardless of cwd/build layout. */
export function migrationsDir(): string {
  return path.resolve(process.cwd(), 'migrations');
}

/**
 * Applies every pending migration in filename order, each inside its own
 * transaction, recording progress in `schema_migrations`. Idempotent —
 * safe to run repeatedly.
 */
export async function runMigrations(pool: DbPool): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    integer PRIMARY KEY,
      name       text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const dir = migrationsDir();
  const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();
  const applied: string[] = [];

  for (const file of files) {
    const version = Number.parseInt(file.split('_')[0] ?? '0', 10);
    if (!Number.isFinite(version)) continue;

    const already = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
    if ((already.rowCount ?? 0) > 0) continue;

    const sql = await readFile(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [version, file]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      client.release();
    }
  }

  return applied;
}
