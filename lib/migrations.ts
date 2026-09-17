import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";

export async function migrate(connectionString: string): Promise<string[]> {
  const connection = new URL(connectionString);
  if (connection.hostname.endsWith(".neon.tech")) connection.searchParams.set("sslmode", "verify-full");
  const client = new Client({ connectionString: connection.toString(), connectionTimeoutMillis: 15_000 });
  await client.connect();
  const applied: string[] = [];
  try {
    // One connection holds this lock through the journal check and all DDL.
    await client.query("SELECT pg_advisory_lock(hashtext('cerulean-crest-migrations'))");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    const directory = new URL("../migrations/", import.meta.url);
    const files = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query<{ checksum: string }>("SELECT checksum FROM schema_migrations WHERE name = $1", [name]);
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration ${name} was modified; add a new migration instead`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [name, checksum]);
        await client.query("COMMIT");
        applied.push(name);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    // Explicit configured identity only; never claim legacy content on first signup.
    if (process.env.CERULEAN_OWNER_SUBJECT) {
      await client.query("UPDATE issues SET owner_subject = $1 WHERE owner_subject IS NULL", [process.env.CERULEAN_OWNER_SUBJECT]);
    }
    return applied;
  } finally {
    // Closing the connection also releases the advisory lock after failures.
    await client.end();
  }
}
