import { readFile } from "node:fs/promises";
import postgres from "postgres";

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("POSTGRES_URL_NON_POOLING or POSTGRES_URL is required");
}

const migrationName = process.argv[2] || "001_initial_schema.sql";
if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(migrationName)) {
  throw new Error("Migration name must be a file from supabase/migrations.");
}
const migration = await readFile(
  new URL(`../supabase/migrations/${migrationName}`, import.meta.url),
  "utf8",
);

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  connect_timeout: 20,
});

try {
  await sql.unsafe(migration);
  console.log(`KodiFlow database migration completed: ${migrationName}`);
} finally {
  await sql.end();
}
