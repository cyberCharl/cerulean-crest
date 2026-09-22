import { Client } from "pg";
import type { SocialConnection } from "./social-engine.ts";
export async function transaction<T>(
  work: (connection: SocialConnection) => Promise<T>,
  readOnly = false,
): Promise<T> {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname.endsWith(".neon.tech"))
    url.searchParams.set("sslmode", "verify-full");
  const client = new Client({
    connectionString: url.toString(),
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  try {
    await client.query(
      readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN",
    );
    // All social mutations share a transaction lock, including opt-out and friendship removal.
    if (!readOnly)
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('daybook-social'))",
      );
    const result = await work({
      query: async (sql, params = []) => (await client.query(sql, params)).rows,
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
