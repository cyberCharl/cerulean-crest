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
    const ddl = `CREATE TABLE IF NOT EXISTS social_profiles (owner_subject TEXT PRIMARY KEY, username TEXT UNIQUE, enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)));
CREATE TABLE IF NOT EXISTS social_friendships (id TEXT PRIMARY KEY, member_a TEXT NOT NULL REFERENCES social_profiles(owner_subject), member_b TEXT NOT NULL REFERENCES social_profiles(owner_subject), requester TEXT NOT NULL REFERENCES social_profiles(owner_subject), status TEXT NOT NULL CHECK(status IN('pending','accepted')), UNIQUE(member_a,member_b), CHECK(member_a<member_b), CHECK(requester=member_a OR requester=member_b));
CREATE TABLE IF NOT EXISTS social_shares (id TEXT PRIMARY KEY, friendship_id TEXT NOT NULL REFERENCES social_friendships(id) ON DELETE CASCADE, sender TEXT NOT NULL REFERENCES social_profiles(owner_subject), recipient TEXT NOT NULL REFERENCES social_profiles(owner_subject), url TEXT NOT NULL, title TEXT NOT NULL, note TEXT NOT NULL, recommend INTEGER NOT NULL CHECK(recommend IN(0,1)), dismissed INTEGER NOT NULL DEFAULT 0 CHECK(dismissed IN(0,1)), created_at TEXT NOT NULL, UNIQUE(sender,recipient,url), CHECK(sender<>recipient));
CREATE INDEX IF NOT EXISTS social_shares_recipient ON social_shares(recipient, dismissed);
`;
    db.exec(ddl);
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
