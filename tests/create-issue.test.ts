import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { IssueInput } from "../lib/schema.ts";

const databaseDirectory = mkdtempSync(path.join(tmpdir(), "cerulean-crest-create-"));
process.env.DATABASE_PATH = path.join(databaseDirectory, "test.db");
delete process.env.DATABASE_URL;

const { createIssue, getIssue } = await import("../lib/sqlite-db.ts");

const issue: IssueInput = {
  date: "2031-01-15",
  title: "Original title",
  editorNote: "A focused edition.",
  coverageGap: null,
  availableMinutes: 12,
  expectedMinutes: 6,
  sections: [{
    title: "Read First",
    items: [{
      title: "A useful piece",
      author: "Author",
      publication: "Publication",
      publishedAt: "15 January 2031",
      readingMinutes: 12,
      type: "Essay",
      url: "https://example.com/piece",
      summary: "Why this earned a place in the edition.",
    }],
  }],
};

test("createIssue is idempotent and never replaces an existing date", () => {
  const first = createIssue(issue);
  const second = createIssue({ ...issue, title: "Replacement title" });
  const stored = getIssue(issue.date);

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.issueId, first.issueId);
  assert.equal(stored?.title, "Original title");
});
