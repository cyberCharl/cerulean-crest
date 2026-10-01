import assert from "node:assert/strict";
import test from "node:test";
import { publicationHealth } from "../lib/publication-health.ts";

test("daily delivery uses the reader's local time including minutes", () => {
  const schedule = { frequency: "daily", time: "09:30" } as const;
  assert.equal(publicationHealth("2026-09-08", new Date("2026-09-09T07:29:00Z"), "Africa/Johannesburg", schedule), "current");
  assert.equal(publicationHealth("2026-09-08", new Date("2026-09-09T07:30:00Z"), "Africa/Johannesburg", schedule), "late");
  assert.equal(publicationHealth("2026-09-09", new Date("2026-09-09T07:30:00Z"), "Africa/Johannesburg", schedule), "current");
});

test("weekly editions remain current between deliveries and overdue ones remain late", () => {
  const schedule = { frequency: "weekly", day: "Monday", time: "08:00" } as const;
  assert.equal(publicationHealth("2026-09-28", new Date("2026-10-01T12:00:00Z"), "UTC", schedule), "current");
  assert.equal(publicationHealth("2026-09-21", new Date("2026-10-01T12:00:00Z"), "UTC", schedule), "late");
  assert.equal(publicationHealth("2026-09-28", new Date("2026-10-05T07:59:00Z"), "UTC", schedule), "current");
  assert.equal(publicationHealth("2026-09-28", new Date("2026-10-05T08:00:00Z"), "UTC", schedule), "late");
});

test("weekday delivery skips weekends and handles the year boundary", () => {
  const schedule = { frequency: "weekdays", time: "08:00" } as const;
  assert.equal(publicationHealth("2027-01-01", new Date("2027-01-03T12:00:00Z"), "UTC", schedule), "current");
  assert.equal(publicationHealth("2026-12-31", new Date("2027-01-03T12:00:00Z"), "UTC", schedule), "late");
});

test("local schedules follow daylight-saving changes", () => {
  const schedule = { frequency: "weekly", day: "Sunday", time: "08:00" } as const;
  assert.equal(publicationHealth("2026-03-22", new Date("2026-03-29T06:59:00Z"), "Europe/London", schedule), "current");
  assert.equal(publicationHealth("2026-03-22", new Date("2026-03-29T07:00:00Z"), "Europe/London", schedule), "late");
});

test("no saved schedule makes no daily delivery assumption", () => {
  assert.equal(publicationHealth(null, new Date(), "UTC"), "unscheduled");
});
