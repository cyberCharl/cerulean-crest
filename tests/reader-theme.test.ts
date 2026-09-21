import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readerTheme, readerThemeSchema } from "../lib/reader-theme.ts";
import { defaultSettings, editorialSettingsSchema, editorialPreferencesFromForm, editorialPreferencesPatchSchema } from "../lib/editorial-settings.ts";

process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "reader-theme-")), "test.db");
delete process.env.DATABASE_URL;
const db = await import("../lib/db.ts");

test("existing readers default to quiet book and invalid appearance values are rejected", () => {
  assert.equal(readerTheme(editorialSettingsSchema.parse(defaultSettings)), "quiet-book");
  assert.equal(readerTheme({ theme: "tactile-correspondence" }), "tactile-correspondence");
  for (const invalid of ["original", "", null, "quiet"]) assert.equal(readerThemeSchema.safeParse(invalid).success, false);
  assert.equal(editorialSettingsSchema.safeParse({ ...defaultSettings, theme: "original" }).success, false);
  assert.equal(editorialPreferencesPatchSchema.safeParse({ theme: "quiet-book" }).success, false);
});

test("appearance and editorial form patches preserve concurrent changes and isolate readers", async () => {
  await db.patchSettings("theme-reader", { guidelines: "More history", onboardingStep: "connect" });
  const form = new FormData();
  form.set("readingMinutes", "30");
  form.set("editionMinutes", "60");
  form.set("timeZone", "UTC");
  form.set("guidelines", "More long-form history");
  form.append("interests", "History & ideas");
  form.set("theme", "quiet-book"); // Appearance is never accepted by this form.
  const parsed = editorialPreferencesFromForm(form);
  assert.equal(parsed.success, true);
  if (!parsed.success) throw new Error("Invalid fixture");
  assert.ok(!("theme" in parsed.data));
  await Promise.all([
    db.patchSettings("theme-reader", { theme: "tactile-correspondence" }),
    db.patchSettings("theme-reader", parsed.data),
  ]);
  const saved = await db.getSettings("theme-reader");
  assert.equal(saved.theme, "tactile-correspondence");
  assert.equal(saved.guidelines, "More long-form history");
  assert.equal(saved.onboardingStep, "connect");
  assert.equal(readerTheme(await db.getSettings("other-reader")), "quiet-book");
  await assert.rejects(db.patchSettings("theme-reader", { theme: "original" } as never));
  assert.deepEqual(await db.getSettings("theme-reader"), saved);
});
