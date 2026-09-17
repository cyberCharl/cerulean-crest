import assert from "node:assert/strict";
import test from "node:test";
import { getIssue, neighboringIssues } from "../lib/db.ts";

test("invalid read dates return not-found without initializing storage", async () => {
  const oldVercel = process.env.VERCEL;
  const oldUrl = process.env.DATABASE_URL;
  process.env.VERCEL = "1";
  delete process.env.DATABASE_URL;
  try {
    for (const date of ["not-a-date", "2026-02-31", "2026-99-99"]) {
      assert.equal(await getIssue("test-owner", date), null);
      assert.deepEqual(await neighboringIssues("test-owner", date), { previous: null, next: null });
    }
  } finally {
    if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel;
    if (oldUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldUrl;
  }
});
