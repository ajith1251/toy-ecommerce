import { startEmbeddedPg, stopEmbeddedPg } from '../src/db/embedded.js';
import { runMigrations } from '../src/db/migrations.js';
import { closePool, createPool } from '../src/db/pool.js';
import { TEST_DB, testConnectionUrl } from './helpers.js';

/**
 * One-time test bootstrap: start the dedicated embedded PostgreSQL,
 * recreate the schema, apply migrations, and seed the deterministic
 * catalog. Tests only ever see this isolated test database.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  await startEmbeddedPg(TEST_DB);
  const pool = createPool({ connectionString: testConnectionUrl() });

  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');
  const applied = await runMigrations(pool);

  const { seedDatabase } = await import('../seeds/seed.ts');
  const seeded = await seedDatabase(pool);
  console.log(
    `[test-db] ready: migrations ${applied.join(', ') || '(none)'}; seeded ${seeded.products} products`
  );

  await closePool(pool);

  return async () => {
    await stopEmbeddedPg();
  };
}
