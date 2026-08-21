/**
 * Database backup/restore via application-level logical snapshots.
 *
 * Production backups should use the managed provider's native tooling
 * (pg_dump / PITR snapshots — see docs/disaster-recovery.md). This script
 * exists so the restore procedure itself can be exercised end-to-end in any
 * environment (including dev, where pg_dump binaries are not bundled):
 *
 *   tsx scripts/snapshot.ts backup  [outfile]        # default: backups/snapshot-<ts>.json
 *   tsx scripts/snapshot.ts restore <infile> [--to <connection-url>]
 *
 * The snapshot captures every public table in foreign-key dependency order;
 * a restore runs migrations into the (possibly empty) target first, wipes
 * data tables, replays rows (overriding identity columns), and resets every
 * identity sequence so newly created rows cannot collide with restored ids.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config.js';
import { startEmbeddedPg, stopEmbeddedPg, embeddedConnectionUrl } from '../src/db/embedded.js';
import { runMigrations } from '../src/db/migrations.js';
import { closePool, createPool, type DbPool } from '../src/db/pool.js';

interface Snapshot {
  format: 'toybox-snapshot';
  version: 1;
  createdAt: string;
  source: string;
  tables: Record<string, Record<string, unknown>[]>;
}

async function connect(): Promise<{ pool: DbPool; embedded: boolean }> {
  let connectionString = config.databaseUrl;
  let embedded = false;
  if (!connectionString && config.embedded.enabled) {
    await startEmbeddedPg(config.embedded);
    connectionString = embeddedConnectionUrl(config.embedded);
    embedded = true;
  }
  if (!connectionString) throw new Error('No DATABASE_URL configured and embedded PostgreSQL is disabled');
  return { pool: createPool({ connectionString }), embedded };
}

/** All user tables in the public schema. */
async function listTables(pool: DbPool): Promise<string[]> {
  const res = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return res.rows.map(r => r.table_name as string);
}

/**
 * Topologically orders tables so referenced (parent) tables come before
 * referencing (child) tables — required for FK-respecting inserts.
 */
async function dependencyOrder(pool: DbPool, tables: string[]): Promise<string[]> {
  const edges = await pool.query(
    `SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent
     FROM pg_constraint
     WHERE contype = 'f' AND connamespace = 'public'::regnamespace`
  );
  const deps = new Map<string, Set<string>>(tables.map(t => [t, new Set()]));
  for (const row of edges.rows) {
    const child = String(row.child).replace(/^public\./, '');
    const parent = String(row.parent).replace(/^public\./, '');
    if (deps.has(child) && deps.has(parent) && child !== parent) deps.get(child)!.add(parent);
  }
  const ordered: string[] = [];
  const remaining = new Set(tables);
  while (remaining.size > 0) {
    const ready = [...remaining].filter(t => [...deps.get(t)!].every(d => !remaining.has(d)));
    if (ready.length === 0) throw new Error(`Circular foreign-key dependency among: ${[...remaining].join(', ')}`);
    for (const t of ready) {
      ordered.push(t);
      remaining.delete(t);
    }
  }
  return ordered;
}

/** Tables whose id is GENERATED ALWAYS AS IDENTITY (need OVERRIDING on insert). */
async function identityTables(pool: DbPool): Promise<Set<string>> {
  const res = await pool.query(
    `SELECT DISTINCT table_name FROM information_schema.columns
     WHERE table_schema = 'public' AND is_identity = 'YES'`
  );
  return new Set(res.rows.map(r => r.table_name as string));
}

async function backup(outfile?: string): Promise<void> {
  const { pool, embedded } = await connect();
  try {
    const tables = await dependencyOrder(pool, await listTables(pool));
    const snap: Snapshot = {
      format: 'toybox-snapshot',
      version: 1,
      createdAt: new Date().toISOString(),
      source: config.databaseUrl ? 'external' : 'embedded',
      tables: {},
    };
    let totalRows = 0;
    for (const table of tables) {
      const res = await pool.query(`SELECT * FROM "${table}"`);
      snap.tables[table] = res.rows;
      totalRows += res.rowCount ?? 0;
      console.log(`[backup] ${table}: ${res.rowCount} rows`);
    }
    const file = outfile ?? path.resolve('backups', `snapshot-${Date.now()}.json`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(snap));
    console.log(`[backup] wrote ${totalRows} rows across ${tables.length} tables → ${file}`);
  } finally {
    await closePool(pool);
    if (embedded) await stopEmbeddedPg();
  }
}

const BATCH_ROWS = 200;

async function restore(infile: string, toUrl?: string): Promise<void> {
  const raw = JSON.parse(await readFile(infile, 'utf8')) as Snapshot;
  if (raw.format !== 'toybox-snapshot' || raw.version !== 1) {
    throw new Error(`${infile} is not a valid ToyBox snapshot`);
  }

  // Target: --to URL wins; otherwise the standard resolution (DATABASE_URL
  // or the embedded cluster). A fresh target database is migrated first.
  let pool: DbPool | null = null;
  let embedded = false;
  try {
    if (toUrl) {
      pool = createPool({ connectionString: toUrl });
    } else {
      const conn = await connect();
      pool = conn.pool;
      embedded = conn.embedded;
    }
    const target = pool;

    // 1. Schema up to date before any data lands.
    const applied = await runMigrations(target);
    if (applied.length > 0) console.log(`[restore] applied migrations: ${applied.join(', ')}`);

    const tables = await dependencyOrder(target, await listTables(target));
    const identities = await identityTables(target);

    // 2. Wipe existing transactional data (schema_migrations is kept).
    const dataTables = tables.filter(t => t !== 'schema_migrations').reverse();
    if (dataTables.length > 0) {
      await target.query(`TRUNCATE ${dataTables.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
    }

    // 3. Replay rows parent-first, overriding identity columns.
    // schema_migrations is skipped: runMigrations just recorded the applied
    // set in the target, which is authoritative (and identical).
    let totalRows = 0;
    for (const table of tables) {
      if (table === 'schema_migrations') continue;
      const rows = raw.tables[table] ?? [];
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0]);
      const overriding = identities.has(table) ? ' OVERRIDING SYSTEM VALUE' : '';
      for (let i = 0; i < rows.length; i += BATCH_ROWS) {
        const batch = rows.slice(i, i + BATCH_ROWS);
        const values: unknown[] = [];
        const tuples = batch.map(row => {
          return `(${cols.map(col => {
            values.push(row[col]);
            return `$${values.length}`;
          }).join(', ')})`;
        });
        await target.query(
          `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')})${overriding} VALUES ${tuples.join(', ')}`,
          values
        );
      }
      totalRows += rows.length;
      console.log(`[restore] ${table}: ${rows.length} rows`);

      // 4. Push identity sequences past the restored ids.
      if (identities.has(table)) {
        await target.query(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
        );
      }
    }

    // 5. Verify: every table's row count matches the snapshot.
    let mismatches = 0;
    for (const table of tables) {
      const expected = (raw.tables[table] ?? []).length;
      const res = await target.query(`SELECT COUNT(*)::int AS n FROM "${table}"`);
      const actual = res.rows[0].n as number;
      if (actual !== expected) {
        mismatches++;
        console.error(`[restore] MISMATCH ${table}: expected ${expected}, got ${actual}`);
      }
    }
    if (mismatches > 0) throw new Error(`${mismatches} table(s) failed count verification`);
    console.log(`[restore] verified ${tables.length} tables, ${totalRows} rows — restore OK`);
  } finally {
    if (pool) await closePool(pool);
    if (embedded) await stopEmbeddedPg();
  }
}

async function main(): Promise<void> {
  const [action, arg] = process.argv.slice(2);
  const toFlagIdx = process.argv.indexOf('--to');
  const toUrl = toFlagIdx >= 0 ? process.argv[toFlagIdx + 1] : undefined;

  switch (action) {
    case 'backup':
      await backup(arg);
      break;
    case 'restore':
      if (!arg) throw new Error('Usage: tsx scripts/snapshot.ts restore <infile> [--to <url>]');
      await restore(arg, toUrl);
      break;
    default:
      console.error('Usage: tsx scripts/snapshot.ts <backup|restore> [file] [--to <url>]');
      process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('[snapshot] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
