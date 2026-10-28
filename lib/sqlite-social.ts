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
          // PostgreSQL placeholders may repeat or appear out of order. Expand
          // each occurrence when translating to SQLite's positional binding.
          const ordered: unknown[] = [];
          const statement = db.prepare(sql.replace(/\$(\d+)/g, (_match, index) => {
            ordered.push(params[Number(index) - 1]);
            return "?";
          }));
          return statement.reader
            ? (statement.all(...ordered) as Record<string, unknown>[])
            : (statement.run(...ordered), []);
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
