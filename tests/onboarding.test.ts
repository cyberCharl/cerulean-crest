import assert from "node:assert/strict";
import { test } from "node:test";
import { settingsFromOnboarding } from "../lib/onboarding.ts";
import { defaultSettings } from "../lib/editorial-settings.ts";

function form(values: Record<string, string | string[]>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) for (const item of Array.isArray(value) ? value : [value]) result.append(key, item);
  return result;
}
test("reading setup preserves interests and completed progress", () => {
  const result = settingsFromOnboarding({ ...defaultSettings, interests: ["History & ideas"], guidelines: "Less news", onboardingStep: "connect" }, "rhythm", form({ readingMinutes: "20", editionMinutes: "45", timeZone: "Europe/Amsterdam" }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.readingMinutes, 20);
  assert.equal(result.data.editionMinutes, 45);
  assert.equal(result.data.onboardingStep, "connect");
  assert.deepEqual(result.data.interests, ["History & ideas"]);
  assert.equal(result.data.guidelines, "Less news");
});
test("interests are optional and can be cleared without changing reading volume", () => {
  const result = settingsFromOnboarding({ ...defaultSettings, interests: ["Technology"] }, "interests", form({ guidelines: "" }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data.interests, []);
  assert.equal(result.data.readingMinutes, defaultSettings.readingMinutes);
  assert.equal(result.data.onboardingStep, "connect");
});
test("rejects invalid volume, timezone, and invented topic values", () => {
  for (const values of [ { readingMinutes: "0", editionMinutes: "120", timeZone: "UTC" }, { readingMinutes: "60", editionMinutes: "120", timeZone: "invalid" } ]) {
    assert.equal(settingsFromOnboarding(defaultSettings, "rhythm", form(values)).success, false);
  }
  assert.equal(settingsFromOnboarding(defaultSettings, "interests", form({ interests: "invented" })).success, false);
});
