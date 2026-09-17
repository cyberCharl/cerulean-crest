import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

const directory = mkdtempSync(path.join(tmpdir(), "cerulean-legacy-"));
process.env.DATABASE_PATH = path.join(directory, "legacy.db");
process.env.CERULEAN_OWNER_SUBJECT = "explicit-legacy-owner";
const original = new Database(process.env.DATABASE_PATH);
original.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8").replace("  owner_subject TEXT,\n", "").replace("issue_date TEXT NOT NULL,", "issue_date TEXT NOT NULL UNIQUE,").replace(",\n  UNIQUE(owner_subject, issue_date)", ""));
original.exec("INSERT INTO issues(issue_date,title,editor_note,available_minutes,expected_minutes) VALUES ('2030-01-01','Private legacy','Note',10,5); INSERT INTO sections(issue_id,title,position) VALUES (1,'Reading',0)");
original.close();
const db = await import("../lib/sqlite-db.ts");
test("legacy migration preserves child IDs and only assigns the configured owner", () => {
  assert.equal(db.getIssue("new-signup", "2030-01-01"), null);
  const issue = db.getIssue("explicit-legacy-owner", "2030-01-01");
  assert.equal(issue?.title, "Private legacy");
  assert.equal(issue?.sections[0].id, 1);
  const connection = new Database(process.env.DATABASE_PATH!);
  assert.deepEqual(connection.pragma("foreign_key_check"), []);
  connection.close();
});
