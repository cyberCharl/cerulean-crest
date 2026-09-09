import assert from "node:assert/strict";
import test from "node:test";
import { publicationHealth } from "../lib/publication-health.ts";

test("freshness uses the owner's timezone and only flags missing editions after the deadline", () => {
  assert.equal(publicationHealth(false, new Date("2026-09-09T06:59:00Z"), "Africa/Johannesburg", 9), "waiting");
  assert.equal(publicationHealth(false, new Date("2026-09-09T07:00:00Z"), "Africa/Johannesburg", 9), "late");
  assert.equal(publicationHealth(true, new Date("2026-09-09T09:00:00Z"), "Africa/Johannesburg", 9), "current");
});
