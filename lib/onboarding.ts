import { editorialSettingsSchema, type EditorialSettings } from "./editorial-settings.ts";
import { describeDeliverySchedule } from "./delivery-schedule.ts";
import { initialEditorialConstitution } from "./editorial-brief.ts";

export type BriefStep = "rhythm" | "interests";
export type OnboardingFormState = { error?: string };

/** Merge only this step's fields; revisiting setup must preserve the rest of the brief. */
export function settingsFromOnboarding(current: EditorialSettings, step: BriefStep, form: FormData) {
  return editorialSettingsSchema.safeParse(step === "rhythm" ? {
    ...current,
    readingMinutes: Number(form.get("readingMinutes")),
    editionMinutes: Number(form.get("editionMinutes")),
    timeZone: form.get("timeZone"),
    deliverySchedule: {
      frequency: form.get("deliveryFrequency"),
      time: form.get("deliveryTime"),
      ...(form.get("deliveryFrequency") === "weekly" ? { day: form.get("deliveryDay") } : {}),
    },
    onboardingStep: current.onboardingStep ?? "interests",
  } : {
    ...current,
    interests: form.getAll("interests"),
    guidelines: form.get("guidelines") ?? "",
    constitutionMarkdown: current.constitutionMarkdown ?? initialEditorialConstitution(String(form.get("guidelines") ?? ""), [...new Set(form.getAll("interests").map(String))]),
    onboardingStep: "connect",
  });
}

export function buildFirstEditionPrompt(settings: EditorialSettings, hasEdition = false): string {
  const curation = "Read my Curiofold editorial brief, including its current feedback, friend recommendations, and recent editions. Search widely, keep a candidate list internally, then submit only the complete final edition with create_daily_edition. Return the edition link.";
  const firstEdition = `Create my first edition now. ${curation}`;
  if (!settings.deliverySchedule) return hasEdition ? curation : firstEdition;
  const schedule = describeDeliverySchedule(settings.deliverySchedule, settings.timeZone);
  return `${hasEdition ? "Set up recurring editions for me in Curiofold." : firstEdition} Create or update my recurring ChatGPT task to curate and publish an edition on this schedule: ${schedule}. Use local time in ${settings.timeZone}, following daylight-saving changes where applicable. ${hasEdition ? "" : "For each recurring run: "}${curation} If a Curiofold task already exists, update it instead of creating a duplicate. Confirm the schedule with me in ChatGPT.`;
}

export function configuredChatGptPluginUrl(): string | undefined {
  const value = process.env.CERULEAN_CHATGPT_PLUGIN_URL;
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "chatgpt.com" || url.username || url.password) {
    throw new Error("CERULEAN_CHATGPT_PLUGIN_URL must be an HTTPS ChatGPT listing URL");
  }
  return url.toString();
}
