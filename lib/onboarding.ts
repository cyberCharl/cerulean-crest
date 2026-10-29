import { editorialSettingsSchema, type EditorialSettings } from "./editorial-settings.ts";
import { describeDeliverySchedule } from "./delivery-schedule.ts";
import { initialEditorialConstitution } from "./editorial-brief.ts";
import { oauthConfig } from "./mcp-auth.ts";
import { appUrl } from "./site-config.ts";

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

/** The AI tool a reader connects. ChatGPT is the default and keeps its original wording. */
export type CuratorTool = "chatgpt" | "other";
export function curatorTool(value: unknown): CuratorTool {
  return value === "other" ? "other" : "chatgpt";
}

const curation = "Read my Filtered editorial brief, including its current feedback, friend recommendations, and recent editions. Search widely, keep a candidate list internally, then submit only the complete final edition with create_daily_edition. Return the edition link.";
const firstEdition = `Create my first edition now. ${curation}`;

export function buildFirstEditionPrompt(settings: EditorialSettings, hasEdition = false, tool: CuratorTool = "chatgpt"): string {
  if (!settings.deliverySchedule) return hasEdition ? curation : firstEdition;
  const schedule = describeDeliverySchedule(settings.deliverySchedule, settings.timeZone);
  if (tool === "other") {
    // Scheduling varies by tool, so ask for it only where the tool can do it and never let it claim one.
    return `${hasEdition ? "" : `${firstEdition} `}My preferred Filtered delivery schedule is ${schedule}. If you can run scheduled or recurring tasks, set one up on that schedule, using local time in ${settings.timeZone} and following daylight-saving changes where applicable. For each scheduled run: ${curation} If a scheduled Filtered task already exists, update it instead of creating a duplicate, then confirm the schedule with me. If you can't run scheduled tasks, say so plainly and don't claim a schedule exists; I'll ask you for each edition myself.`;
  }
  return `${hasEdition ? "Set up recurring editions for me in Filtered." : firstEdition} Create or update my recurring ChatGPT task to curate and publish an edition on this schedule: ${schedule}. Use local time in ${settings.timeZone}, following daylight-saving changes where applicable. ${hasEdition ? "" : "For each recurring run: "}${curation} If a recurring task already exists for this app, including under an earlier name, update it instead of creating a duplicate. Confirm the schedule with me in ChatGPT.`;
}

/**
 * The URL other MCP clients must enter. It is the OAuth audience: clients check that the
 * protected-resource metadata names exactly this URL, so another hostname fails to connect.
 */
export function mcpConnectionUrl(): string {
  return oauthConfig()?.resource ?? appUrl("/mcp");
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
