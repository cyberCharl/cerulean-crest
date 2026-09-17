import assert from "node:assert/strict";
import test from "node:test";
import { neon } from "@neondatabase/serverless";
import { migrate } from "../../lib/migrations.ts";
import { seedIssue } from "../../lib/seed.ts";

// Deliberately never falls back to DATABASE_URL or auto-loads .env.local.
const connection = process.env.TEST_DATABASE_URL;
test("isolated Postgres migration, concurrent create, rollback and replacement", { skip: !connection, timeout: 90_000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_ALLOW_WRITES, "true", "Explicitly authorize writes to an isolated test database");
  process.env.DATABASE_URL = connection;
  const sql = neon(connection!);
  const applied = await migrate(process.env.TEST_DATABASE_URL_UNPOOLED || connection!);
  assert.ok(Array.isArray(applied));
  assert.deepEqual(await migrate(process.env.TEST_DATABASE_URL_UNPOOLED || connection!), []);
  const db = await import("../../lib/postgres-db.ts");
  const otherOwner = "test-other-owner";
  const date = "2099-12-30";
  assert.equal(await db.getIssue("test-owner", date), null, "Test date must be empty; never replace pre-existing data");
  assert.equal(await db.getIssue(otherOwner, date), null, "Other-owner test date must be empty");
  const issue = { ...seedIssue, date, title: "Isolated concurrent publication test" };
  try {
    const results = await Promise.all(Array.from({ length: 12 }, () => db.createIssue("test-owner", issue)));
    assert.equal(results.filter((result) => result.created).length, 1);
    assert.equal(new Set(results.map((result) => result.issueId)).size, 1);
    const stored = await db.getIssue("test-owner", date);
    assert.equal(stored?.title, issue.title);
    assert.equal(stored?.sections.flatMap((section) => section.items).length, seedIssue.sections.flatMap((section) => section.items).length);
    await db.createIssue(otherOwner, { ...issue, title: "Other reader" });
    assert.equal((await db.getIssue(otherOwner, date))?.title, "Other reader");
    assert.equal((await db.getIssue("test-owner", date))?.title, issue.title);
    const invalid = structuredClone(issue);
    // Cause a database constraint failure after the parent update to prove rollback.
    (invalid.sections[0].items[0] as unknown as { title: null }).title = null;
    await assert.rejects(() => db.replaceIssue("test-owner", { ...invalid, title: "Must roll back" }));
    assert.equal((await db.getIssue("test-owner", date))?.title, issue.title);
    await db.replaceIssue("test-owner", { ...issue, title: "Replaced", sections: [issue.sections[0]] });
    assert.equal((await db.getIssue("test-owner", date))?.sections.length, 1);
    assert.equal((await db.getIssue("test-owner", date))?.title, "Replaced");
  } finally {
    await sql`DELETE FROM issues WHERE issue_date = ${date} AND owner_subject IN (${"test-owner"}, ${otherOwner})`;
  }
});
