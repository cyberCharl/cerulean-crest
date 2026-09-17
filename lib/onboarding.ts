import { editorialSettingsSchema, type EditorialSettings } from "./editorial-settings.ts";

export type BriefStep = "rhythm" | "interests";
export type OnboardingFormState = { error?: string };

/** Merge only this step's fields; revisiting setup must preserve the rest of the brief. */
export function settingsFromOnboarding(current: EditorialSettings, step: BriefStep, form: FormData) {
  return editorialSettingsSchema.safeParse(step === "rhythm" ? {
    ...current,
    readingMinutes: Number(form.get("readingMinutes")),
    editionMinutes: Number(form.get("editionMinutes")),
    timeZone: form.get("timeZone"),
    onboardingStep: current.onboardingStep ?? "interests",
  } : {
    ...current,
    interests: form.getAll("interests"),
    guidelines: form.get("guidelines") ?? "",
    onboardingStep: "connect",
  });
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
