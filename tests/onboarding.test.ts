import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFirstEditionPrompt, configuredMcpPublicClientId, curatorTool, settingsFromOnboarding } from "../lib/onboarding.ts";
import { defaultSettings, editorialSettingsSchema } from "../lib/editorial-settings.ts";
import { deliveryDays, deliveryScheduleSchema } from "../lib/delivery-schedule.ts";

function form(values: Record<string, string | string[]>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) for (const item of Array.isArray(value) ? value : [value]) result.append(key, item);
  return result;
}
test("reading setup preserves interests and completed progress", () => {
  const result = settingsFromOnboarding({ ...defaultSettings, interests: ["History & ideas"], guidelines: "Less news", onboardingStep: "connect" }, "rhythm", form({ readingMinutes: "20", editionMinutes: "45", timeZone: "Europe/Amsterdam", deliveryFrequency: "weekly", deliveryDay: "Sunday", deliveryTime: "09:30" }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.readingMinutes, 20);
  assert.equal(result.data.editionMinutes, 45);
  assert.equal(result.data.onboardingStep, "connect");
  assert.deepEqual(result.data.interests, ["History & ideas"]);
  assert.equal(result.data.guidelines, "Less news");
  assert.deepEqual(result.data.deliverySchedule, { frequency: "weekly", day: "Sunday", time: "09:30" });
});
test("onboarding topics are optional seeds for the Markdown document", () => {
  const deliverySchedule = { frequency: "weekdays", time: "07:45" } as const;
  const result = settingsFromOnboarding({ ...defaultSettings, deliverySchedule, interests: ["Technology"] }, "interests", form({ guidelines: "" }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data.interests, []);
  assert.match(result.data.constitutionMarkdown ?? "", /Starting point/);
  assert.match(result.data.constitutionMarkdown ?? "", /broad mix/);
  assert.equal(result.data.readingMinutes, defaultSettings.readingMinutes);
  assert.equal(result.data.onboardingStep, "connect");
  assert.deepEqual(result.data.deliverySchedule, deliverySchedule);
});
test("rejects invalid volume, timezone, and invented topic values", () => {
  for (const values of [ { readingMinutes: "0", editionMinutes: "120", timeZone: "UTC" }, { readingMinutes: "60", editionMinutes: "120", timeZone: "invalid" } ]) {
    assert.equal(settingsFromOnboarding(defaultSettings, "rhythm", form({ deliveryFrequency: "daily", deliveryTime: "08:00", ...values })).success, false);
  }
  assert.equal(settingsFromOnboarding(defaultSettings, "interests", form({ interests: "invented" })).success, false);
});

test("delivery validation rejects missing, unknown and malformed choices", () => {
  for (const delivery of [
    {}, { deliveryFrequency: "monthly", deliveryTime: "08:00" },
    { deliveryFrequency: "daily", deliveryTime: "24:00" },
    { deliveryFrequency: "daily", deliveryTime: "12:60" },
    { deliveryFrequency: "daily", deliveryTime: "8am" },
    { deliveryFrequency: "daily", deliveryTime: "" },
    { deliveryFrequency: "weekly", deliveryTime: "08:00" },
    { deliveryFrequency: "weekly", deliveryTime: "08:00", deliveryDay: "Someday" },
  ]) {
    const fields = { readingMinutes: "30", editionMinutes: "60", timeZone: "UTC", ...delivery };
    assert.equal(settingsFromOnboarding(defaultSettings, "rhythm", form(fields as Record<string, string>)).success, false);
  }
});

test("each supported rhythm reaches the prompt with its local time and timezone", () => {
  for (const [frequency, day, expected] of [
    ["daily", "", "Every day"], ["weekdays", "", "Every weekday (Monday–Friday)"],
    ...deliveryDays.map(day => ["weekly", day, `Every ${day}`]),
  ]) {
    const result = settingsFromOnboarding(defaultSettings, "rhythm", form({ readingMinutes: "30", editionMinutes: "60", timeZone: "America/New_York", deliveryFrequency: frequency, deliveryDay: day, deliveryTime: "18:15" }));
    assert.equal(result.success, true);
    if (!result.success) return;
    const prompt = buildFirstEditionPrompt(result.data);
    assert.ok(prompt.includes(`${expected} at 18:15 (America/New_York)`));
    assert.ok(prompt.includes("first edition now"));
    assert.ok(prompt.includes("daylight-saving"));
    assert.ok(prompt.includes("keep a candidate list internally"));
    assert.ok(prompt.includes("update it instead of creating a duplicate"));
    assert.ok(!buildFirstEditionPrompt(result.data, true).includes("first edition"));
  }
  for (const time of ["00:00", "23:59"]) assert.equal(deliveryScheduleSchema.safeParse({ frequency: "daily", time }).success, true);
});

test("changing to daily removes the previous weekly day", () => {
  const result = settingsFromOnboarding({ ...defaultSettings, deliverySchedule: { frequency: "weekly", day: "Sunday", time: "09:00" } }, "rhythm", form({ readingMinutes: "30", editionMinutes: "60", timeZone: "UTC", deliveryFrequency: "daily", deliveryTime: "00:00", deliveryDay: "Sunday" }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data.deliverySchedule, { frequency: "daily", time: "00:00" });
  assert.ok(!buildFirstEditionPrompt(result.data).includes("Sunday"));
});

test("existing preferences without a delivery schedule remain valid", () => {
  const settings = editorialSettingsSchema.parse(defaultSettings);
  assert.equal(settings.deliverySchedule, undefined);
  assert.ok(!buildFirstEditionPrompt(settings).includes("recurring"));
});

// Captured from the ChatGPT-only implementation before other AI tools were added.
const curation = "Read my Filtered editorial brief, including its current feedback, friend recommendations, and recent editions. Search widely, keep a candidate list internally, then submit only the complete final edition with create_daily_edition. Return the edition link.";
const weekly = { ...defaultSettings, timeZone: "Europe/Amsterdam", deliverySchedule: { frequency: "weekly", day: "Sunday", time: "09:30" } } as const;

test("the ChatGPT instruction is unchanged, with or without naming the tool", () => {
  const first = `Create my first edition now. ${curation} Create or update my recurring ChatGPT task to curate and publish an edition on this schedule: Every Sunday at 09:30 (Europe/Amsterdam). Use local time in Europe/Amsterdam, following daylight-saving changes where applicable. For each recurring run: ${curation} If a recurring task already exists for this app, including under an earlier name, update it instead of creating a duplicate. Confirm the schedule with me in ChatGPT.`;
  const recurring = `Set up recurring editions for me in Filtered. Create or update my recurring ChatGPT task to curate and publish an edition on this schedule: Every Sunday at 09:30 (Europe/Amsterdam). Use local time in Europe/Amsterdam, following daylight-saving changes where applicable. ${curation} If a recurring task already exists for this app, including under an earlier name, update it instead of creating a duplicate. Confirm the schedule with me in ChatGPT.`;
  for (const tool of [undefined, "chatgpt"] as const) {
    assert.equal(buildFirstEditionPrompt(weekly, false, tool), first);
    assert.equal(buildFirstEditionPrompt(weekly, true, tool), recurring);
    assert.equal(buildFirstEditionPrompt(defaultSettings, false, tool), `Create my first edition now. ${curation}`);
    assert.equal(buildFirstEditionPrompt(defaultSettings, true, tool), curation);
  }
});

test("other AI tools get a schedule request that admits when a tool can't schedule", () => {
  const first = buildFirstEditionPrompt(weekly, false, "other");
  const recurring = buildFirstEditionPrompt(weekly, true, "other");
  for (const prompt of [first, recurring]) {
    assert.doesNotMatch(prompt, /ChatGPT/);
    assert.ok(prompt.includes("Every Sunday at 09:30 (Europe/Amsterdam)"));
    assert.ok(prompt.includes("daylight-saving"));
    assert.ok(prompt.includes("If you can run scheduled or recurring tasks"));
    assert.ok(prompt.includes("don't claim a schedule exists; I'll ask you for each edition myself"));
    assert.ok(prompt.includes("update it instead of creating a duplicate"));
    assert.ok(prompt.includes(curation));
  }
  assert.ok(first.startsWith(`Create my first edition now. ${curation}`));
  assert.ok(!recurring.includes("first edition"));
  // Without a schedule there is nothing tool-specific to say.
  assert.equal(buildFirstEditionPrompt(defaultSettings, false, "other"), buildFirstEditionPrompt(defaultSettings));
  assert.equal(buildFirstEditionPrompt(defaultSettings, true, "other"), curation);
});

test("only an explicit choice selects another AI tool", () => {
  assert.equal(curatorTool("other"), "other");
  for (const value of [undefined, "", "chatgpt", "claude", ["other"]]) assert.equal(curatorTool(value), "chatgpt");
});

test("a public MCP client ID is optional and validated before display", () => {
  const previous = process.env.CERULEAN_MCP_PUBLIC_CLIENT_ID;
  try {
    delete process.env.CERULEAN_MCP_PUBLIC_CLIENT_ID;
    assert.equal(configuredMcpPublicClientId(), undefined);
    process.env.CERULEAN_MCP_PUBLIC_CLIENT_ID = " AbC123def456_-xyz ";
    assert.equal(configuredMcpPublicClientId(), "AbC123def456_-xyz");
    process.env.CERULEAN_MCP_PUBLIC_CLIENT_ID = "<script>";
    assert.throws(() => configuredMcpPublicClientId());
  } finally {
    if (previous === undefined) delete process.env.CERULEAN_MCP_PUBLIC_CLIENT_ID;
    else process.env.CERULEAN_MCP_PUBLIC_CLIENT_ID = previous;
  }
});
