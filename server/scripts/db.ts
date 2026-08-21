/**
 * Database CLI: `tsx scripts/db.ts <migrate|seed|reset>`
 * Boots the same database (embedded PostgreSQL unless DATABASE_URL is set),
 * so scripts behave identically in dev and against an external database.
 */
import { config } from '../src/config.js';
import { startEmbeddedPg, stopEmbeddedPg, embeddedConnectionUrl } from '../src/db/embedded.js';
import { runMigrations } from '../src/db/migrations.js';
import { closePool, createPool } from '../src/db/pool.js';

const action = process.argv[2];

async function connect() {
  let connectionString = config.databaseUrl;
  if (!connectionString && config.embedded.enabled) {
    await startEmbeddedPg(config.embedded);
    connectionString = embeddedConnectionUrl(config.embedded);
  }
  if (!connectionString) throw new Error('No DATABASE_URL configured and embedded PostgreSQL is disabled');
  return createPool({ connectionString });
}

async function main(): Promise<void> {
  const pool = await connect();

  switch (action) {
    case 'migrate': {
      const applied = await runMigrations(pool);
      console.log(applied.length > 0 ? `[db] applied: ${applied.join(', ')}` : '[db] no pending migrations');
      break;
    }
    case 'seed': {
      const { seedDatabase } = await import('../seeds/seed.ts');
      const result = await seedDatabase(pool);
      console.log(
        `[db] seeded: ${result.categories} categories, ${result.brands} brands, ${result.products} products`
      );
      break;
    }
    case 'reset': {
      // Production databases must never be wiped by a CLI convenience
      // command — reset is a development-only operation.
      if (config.isProduction) {
        console.error('✖ db:reset is blocked when NODE_ENV=production. Destructive operations on production data require manual, reviewed intervention.');
        process.exit(1);
      }
      console.warn('⚠️  db:reset destroys ALL data in the ToyBox database (dev only).');
      await pool.query('DROP SCHEMA public CASCADE');
      await pool.query('CREATE SCHEMA public');
      const applied = await runMigrations(pool);
      const { seedDatabase } = await import('../seeds/seed.ts');
      const result = await seedDatabase(pool);
      console.log(
        `[db] reset complete: migrations ${applied.join(', ') || '(none pending)'}; seeded ${result.products} products`
      );
      break;
    }
    default:
      console.error('Usage: tsx scripts/db.ts <migrate|seed|reset>');
      process.exitCode = 1;
  }

  await closePool(pool);
  if (config.embedded.enabled && !config.databaseUrl) {
    await stopEmbeddedPg();
  }
}

main().catch(err => {
  console.error('[db] failed:', err);
  process.exit(1);
});
