/**
 * Development entry point (`npm run dev`). Boots the database (embedded
 * PostgreSQL unless DATABASE_URL is set), applies migrations, seeds the
 * catalog when empty, then starts the API via src/server.ts.
 */
import { config } from '../src/config.js';
import { startEmbeddedPg, embeddedConnectionUrl } from '../src/db/embedded.js';
import { runMigrations } from '../src/db/migrations.js';
import { createPool, closePool, type DbPool } from '../src/db/pool.js';

async function prepareDatabase(): Promise<DbPool> {
  let connectionString = config.databaseUrl;
  if (!connectionString && config.embedded.enabled) {
    console.log(`[db] starting embedded PostgreSQL on :${config.embedded.port} (data: ${config.embedded.dataDir})`);
    await startEmbeddedPg(config.embedded);
    connectionString = embeddedConnectionUrl(config.embedded);
  }
  if (!connectionString) throw new Error('No DATABASE_URL configured and embedded PostgreSQL is disabled');

  const pool = createPool({ connectionString });
  await pool.query('SELECT 1');

  const applied = await runMigrations(pool);
  if (applied.length > 0) console.log(`[db] applied migrations: ${applied.join(', ')}`);

  const res = await pool.query('SELECT count(*)::int AS count FROM products');
  if ((res.rows[0]?.count ?? 0) === 0) {
    const { seedDatabase } = await import('../seeds/seed.ts');
    const result = await seedDatabase(pool);
    console.log(`[db] seeded catalog: ${result.categories} categories, ${result.brands} brands, ${result.products} products`);
  }

  return pool;
}

// Prepare the database, then hand off to the API server. The pool created
// here is intentionally not closed — src/server.ts manages its own pool.
await prepareDatabase().catch(err => {
  console.error('[dev] database setup failed:', err);
  process.exit(1);
});
await import('../src/server.ts');
