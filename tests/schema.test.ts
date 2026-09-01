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
