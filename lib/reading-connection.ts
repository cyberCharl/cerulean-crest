import { Client } from "pg";
import type { ReadingConnection } from "./reading.ts";
import { requireOwner } from "./ownership.ts";

export async function readingTransaction<T>(owner: string, work: (c: ReadingConnection, owner: string) => Promise<T>): Promise<T> {
  owner = requireOwner(owner);
  if (!process.env.DATABASE_URL) {
    if (process.env.VERCEL) throw new Error("DATABASE_URL is required on Vercel");
    const sqlite = await import("./sqlite-social.ts");
    return sqlite.transaction(c => work(c, owner));
  }
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname.endsWith(".neon.tech")) url.searchParams.set("sslmode", "verify-full");
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    // Serialize this reader's exposure, retirement, intent changes and job claims.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('filtered-reading'),hashtext($1))", [owner]);
    const result = await work({ query: async (sql, params = []) => (await client.query(sql, params)).rows }, owner);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { await client.end(); }
}
