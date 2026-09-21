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

test("isolated Postgres feedback and settings preserve concurrent independent patches", { skip: !connection, timeout: 90_000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_ALLOW_WRITES, "true");
  process.env.DATABASE_URL = connection;
  await migrate(process.env.TEST_DATABASE_URL_UNPOOLED || connection!);
  const db = await import("../../lib/postgres-db.ts");
  const sql = neon(connection!);
  const owner = `feedback-test-${crypto.randomUUID()}`;
  const other = `${owner}-other`;
  const article = seedIssue.sections[0].items[0];
  try {
    await db.createIssue(owner, { ...seedIssue, date: "2099-12-29" });
    await assert.rejects(db.updateArticleFeedback(other, { url: article.url, saved: true }), /Article not found/);
    await Promise.all([
      db.updateArticleFeedback(owner, { url: article.url, saved: true }),
      db.updateArticleFeedback(owner, { url: article.url, note: "More technical depth" }),
      db.updateArticleFeedback(owner, { url: article.url, reaction: "more" }),
    ]);
    const stored = await db.getArticleFeedback(owner, article.url);
    assert.equal(stored?.saved, true);
    assert.equal(stored?.note, "More technical depth");
    assert.equal(stored?.reaction, "more");
    assert.equal(stored?.title, article.title);
    assert.equal(await db.getArticleFeedback(other, article.url), null);
    assert.deepEqual(await db.listArticleFeedback(other), []);
    assert.equal((await db.listArticleFeedback(owner, { urls: [article.url] })).length, 1);
    assert.deepEqual(await db.listArticleFeedback(owner, { urls: [] }), []);
    await db.replaceIssue(owner, { ...seedIssue, date: "2099-12-29", sections: [] });
    await db.updateArticleFeedback(owner, { url: article.url, note: "", reaction: null });
    assert.equal((await db.listArticleFeedback(owner, { savedOnly: true })).length, 1);
    assert.deepEqual(await db.listArticleFeedback(owner, { feedbackOnly: true }), []);
    await Promise.all([
      db.patchSettings(owner, { guidelines: "Explicit instruction" }),
      db.patchSettings(owner, { readingMinutes: 25 }),
      db.patchSettings(owner, { theme: "tactile-correspondence" }),
    ]);
    const settings = await db.getSettings(owner) as { guidelines: string; readingMinutes: number; theme: string };
    assert.equal(settings.guidelines, "Explicit instruction");
    assert.equal(settings.readingMinutes, 25);
    assert.equal(settings.theme, "tactile-correspondence");
    assert.equal(await db.getSettings(other), null);
    await assert.rejects(db.patchSettings(owner, { readingMinutes: 0 }));
    assert.deepEqual(await db.getSettings(owner), settings);
  } finally {
    await sql`DELETE FROM article_feedback WHERE owner_subject = ${owner}`;
    await sql`DELETE FROM editorial_settings WHERE owner_subject = ${owner}`;
    await sql`DELETE FROM issues WHERE owner_subject = ${owner}`;
  }
});
