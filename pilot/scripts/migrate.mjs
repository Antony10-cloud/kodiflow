import { readFile } from "node:fs/promises";
import postgres from "postgres";

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("POSTGRES_URL_NON_POOLING or POSTGRES_URL is required");
}

const migration = await readFile(
  new URL("../supabase/migrations/001_initial_schema.sql", import.meta.url),
  "utf8",
);

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  connect_timeout: 20,
});

try {
  await sql.unsafe(migration);
  console.log("KodiFlow database migration completed.");
} finally {
  await sql.end();
}
