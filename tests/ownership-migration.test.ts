import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { sqliteSchema } from "../lib/sqlite-schema.ts";

const directory = mkdtempSync(path.join(tmpdir(), "cerulean-legacy-"));
process.env.DATABASE_PATH = path.join(directory, "legacy.db");
const original = new Database(process.env.DATABASE_PATH);
original.exec(sqliteSchema.replace("  owner_subject TEXT,\n", "").replace("issue_date TEXT NOT NULL,", "issue_date TEXT NOT NULL UNIQUE,").replace(",\n  UNIQUE(owner_subject, issue_date)", ""));
original.exec("INSERT INTO issues(issue_date,title,editor_note,available_minutes,expected_minutes) VALUES ('2030-01-01','Private legacy','Note',10,5); INSERT INTO sections(issue_id,title,position) VALUES (1,'Reading',0)");
original.close();
const db = await import("../lib/sqlite-db.ts");
test("legacy migration preserves child IDs and leaves unowned editions inaccessible", () => {
  assert.equal(db.getIssue("new-signup", "2030-01-01"), null);
  const connection = new Database(process.env.DATABASE_PATH!);
  const row = connection.prepare("SELECT id, owner_subject, title FROM issues WHERE issue_date = '2030-01-01'").get() as { id: number; owner_subject: string | null; title: string };
  assert.deepEqual(row, { id: 1, owner_subject: null, title: "Private legacy" });
  assert.equal((connection.prepare("SELECT issue_id FROM sections WHERE id = 1").get() as { issue_id: number }).issue_id, 1);
  assert.deepEqual(connection.pragma("foreign_key_check"), []);
  connection.close();
});
