/**
 * Applies supabase/migrations/*.sql (and optionally seed.sql) to a Postgres
 * database over a direct connection.
 *
 *   $env:DATABASE_URL = "postgresql://..."   # PowerShell
 *   node scripts/db-push.mjs                 # apply migrations
 *   node scripts/db-push.mjs --seed          # also run seed.sql
 *   node scripts/db-push.mjs --check         # connect and list tables only
 *
 * The connection string is read from the environment and is never written to
 * disk. Each file runs as a single multi-statement query, so Postgres wraps it
 * in one implicit transaction — a failure anywhere rolls the whole file back.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

const client = new pg.Client({
  connectionString,
  // Supabase terminates TLS at the pooler with a chain Node doesn't ship.
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120_000,
});

async function listTables() {
  const { rows } = await client.query(
    `select table_name
       from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`,
  );
  return rows.map((r) => r.table_name);
}

await client.connect();

try {
  const { rows: version } = await client.query("select version()");
  console.log(version[0].version.split(",")[0]);

  const before = await listTables();
  console.log(
    `public schema before: ${before.length ? before.join(", ") : "(empty)"}`,
  );

  if (args.has("--check")) {
    process.exit(0);
  }

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`applying ${file} ... `);
    await client.query(sql);
    console.log("ok");
  }

  if (args.has("--seed")) {
    const seed = await readFile(path.join(process.cwd(), "supabase", "seed.sql"), "utf8");
    process.stdout.write("applying seed.sql ... ");
    await client.query(seed);
    console.log("ok");
  }

  const after = await listTables();
  console.log(`public schema after: ${after.join(", ")}`);
} catch (error) {
  console.error("\nFAILED:", error.message);
  if (error.position) console.error("at character", error.position);
  if (error.detail) console.error("detail:", error.detail);
  if (error.hint) console.error("hint:", error.hint);
  process.exitCode = 1;
} finally {
  await client.end();
}
