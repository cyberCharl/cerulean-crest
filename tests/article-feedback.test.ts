import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { seedIssue } from "../lib/seed.ts";
import { ArticleNotFoundError } from "../lib/article-feedback.ts";

process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "editorial-feedback-")), "test.db");
delete process.env.DATABASE_URL;
const db = await import("../lib/db.ts");
const url = seedIssue.sections[0].items[0].url;

test("saves and feedback are private, independent, durable through replacement, and reversible", async () => {
  await db.createIssue("reader", seedIssue);
  const saved = await db.updateArticleFeedback("reader", { url, saved: true });
  assert.equal(saved.title, seedIssue.sections[0].items[0].title);
  assert.equal(saved.publication, seedIssue.sections[0].items[0].publication);
  assert.deepEqual(await db.listArticleFeedback("reader", { feedbackOnly: true }), [], "saving is not endorsement");
  assert.equal(await db.getArticleFeedback("other", url), null);
  assert.deepEqual(await db.listArticleFeedback("other"), []);
  await assert.rejects(db.updateArticleFeedback("other", { url, saved: true }), ArticleNotFoundError);
  await assert.rejects(db.updateArticleFeedback("reader", { url: "https://example.com/unknown", note: "not in edition" }), ArticleNotFoundError);
  await db.updateArticleFeedback("reader", { url, note: "Good depth, less startup news", reaction: "more" });
  await db.updateArticleFeedback("reader", { url, saved: false });
  assert.deepEqual(await db.listArticleFeedback("reader", { savedOnly: true }), []);
  const feedback = await db.getArticleFeedback("reader", url);
  assert.equal(feedback?.note, "Good depth, less startup news");
  assert.equal(feedback?.reaction, "more");
  assert.equal((await db.listArticleFeedback("reader", { feedbackOnly: true })).length, 1);
  assert.equal((await db.listArticleFeedback("reader", { urls: [url] })).length, 1);
  assert.deepEqual(await db.listArticleFeedback("reader", { urls: [] }), []);
  assert.deepEqual(await db.listArticleFeedback("reader", { urls: ["https://example.com/unknown"] }), []);
  await db.replaceIssue("reader", { ...seedIssue, sections: [] });
  assert.equal((await db.updateArticleFeedback("reader", { url, saved: true })).saved, true);
  await db.updateArticleFeedback("reader", { url, reaction: null, note: "" });
  assert.equal((await db.getArticleFeedback("reader", url))?.saved, true);
  assert.deepEqual(await db.listArticleFeedback("reader", { feedbackOnly: true }), []);
  assert.equal((await db.getSettings("reader")).guidelines, "", "feedback never rewrites explicit policy");
});

test("validation rejects forged metadata, invalid inputs and anonymous owners", async () => {
  await assert.rejects(db.updateArticleFeedback("reader", { url, note: "x".repeat(2001) }));
  await assert.rejects(db.updateArticleFeedback("reader", { url, saved: true, title: "forged" } as never));
  await assert.rejects(db.updateArticleFeedback("reader", { url }));
  await assert.rejects(db.updateArticleFeedback("reader", { url: "javascript:alert(1)", saved: true }));
  await assert.rejects(db.listArticleFeedback("reader", { limit: -1 }));
  await assert.rejects(db.updateArticleFeedback("", { url, saved: true }), /authenticated owner/);
  await assert.rejects(db.getArticleFeedback("", url), /authenticated owner/);
});

test("explicit settings patches preserve other fields and readers and validate before writing", async () => {
  await db.patchSettings("policy-reader", { guidelines: "Original", interests: ["Science & nature"] });
  await Promise.all([
    db.patchSettings("policy-reader", { guidelines: "Exclude crypto" }),
    db.patchSettings("policy-reader", { readingMinutes: 25 }),
  ]);
  const settings = await db.getSettings("policy-reader");
  assert.equal(settings.guidelines, "Exclude crypto");
  assert.equal(settings.readingMinutes, 25);
  assert.deepEqual(settings.interests, ["Science & nature"]);
  assert.equal((await db.getSettings("unrelated")).guidelines, "");
  await assert.rejects(db.patchSettings("policy-reader", { readingMinutes: 0 }));
  await assert.rejects(db.patchSettings("policy-reader", { unknown: "x" } as never));
  assert.deepEqual(await db.getSettings("policy-reader"), settings);
  assert.deepEqual(await db.patchSettings("policy-reader", { guidelines: undefined }), settings);
});
