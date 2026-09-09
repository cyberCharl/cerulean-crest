import assert from "node:assert/strict";
import test from "node:test";
import { issueInputSchema } from "../lib/schema.ts";

const validIssue = {
  date: "2026-09-02",
  title: "Cerulean Crest",
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
      publishedAt: "2 September 2026",
      readingMinutes: 12,
      type: "Essay",
      url: "https://example.com/piece",
      summary: "Why this earned a place in the edition.",
    }],
  }],
};

test("accepts a well-formed issue", () => {
  assert.equal(issueInputSchema.safeParse(validIssue).success, true);
});

test("rejects a declared duration that disagrees with the item total", () => {
  const result = issueInputSchema.safeParse({ ...validIssue, availableMinutes: 20 });
  assert.equal(result.success, false);
});

test("rejects malformed URLs", () => {
  const invalid = structuredClone(validIssue);
  invalid.sections[0].items[0].url = "not a URL";
  assert.equal(issueInputSchema.safeParse(invalid).success, false);
});

test("rejects impossible dates and accepts leap days only in leap years", () => {
  for (const date of ["2026-02-29", "2026-02-31", "2026-13-01", "2026-00-00", "0000-01-01", "not-a-date"]) {
    assert.equal(issueInputSchema.safeParse({ ...validIssue, date }).success, false, date);
  }
  assert.equal(issueInputSchema.safeParse({ ...validIssue, date: "2028-02-29" }).success, true);
});

test("source links only allow HTTP and HTTPS", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,example", "ftp://example.com/file"]) {
    const issue = structuredClone(validIssue);
    issue.sections[0].items[0].url = url;
    assert.equal(issueInputSchema.safeParse(issue).success, false, url);
  }
});
