import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { SocialConnection } from "./social-engine.ts";
let queue: Promise<unknown> = Promise.resolve();
export async function transaction<T>(
  work: (connection: SocialConnection) => Promise<T>,
  readOnly = false,
): Promise<T> {
  await import("./sqlite-db.ts");
  const run = queue.then(async () => {
    const filename =
      process.env.DATABASE_PATH ||
      path.join(process.cwd(), ".data", "cerulean-crest.db");
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    const db = new Database(filename);
    db.pragma("foreign_keys=ON");
    db.pragma("busy_timeout=5000");
    db.exec(readOnly ? "BEGIN" : "BEGIN IMMEDIATE");
    try {
      const result = await work({
        query: async (sql, params = []) => {
          const statement = db.prepare(sql.replace(/\$\d+/g, "?"));
          return statement.reader
            ? (statement.all(...params) as Record<string, unknown>[])
            : (statement.run(...params), []);
        },
      });
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      db.close();
    }
  });
  queue = run.catch(() => {});
  return run;
}
