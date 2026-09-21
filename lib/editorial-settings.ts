import { z } from "zod";
import { readerThemeSchema } from "./reader-theme.ts";
export const interestOptions = [
  "Science & nature", "Technology", "Arts & culture", "History & ideas",
  "World affairs", "Design & architecture", "Health & wellbeing", "Business & work",
  "Food & everyday life", "Books & writing", "Outdoors & adventure", "People & society",
] as const;
export const editorialSettingsSchema = z.object({
  readingMinutes: z.number().int().min(5).max(240),
  editionMinutes: z.number().int().min(5).max(480),
  timeZone: z.string().min(1).max(100).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Use a valid IANA timezone"),
  guidelines: z.string().trim().max(8000),
  interests: z.array(z.enum(interestOptions)).max(interestOptions.length).transform(values => [...new Set(values)]).optional(),
  theme: readerThemeSchema.optional(),
  onboardingStep: z.enum(["interests", "connect"]).optional(),
});
export type EditorialSettings = z.infer<typeof editorialSettingsSchema>;
// The curator can change editorial choices, not appearance or onboarding state.
// Omitted fields remain unchanged.
export const editorialPreferencesPatchSchema = editorialSettingsSchema
  .omit({ onboardingStep: true, theme: true }).partial().strict()
  .refine(value => Object.values(value).some(field => field !== undefined), "Provide at least one preference to update");
export const defaultSettings: EditorialSettings = { readingMinutes: 60, editionMinutes: 120, guidelines: "", timeZone: "Africa/Johannesburg" };

/** Only submitted editorial fields are patched, preserving concurrent appearance changes. */
export function editorialPreferencesFromForm(form: FormData) {
  return editorialPreferencesPatchSchema.safeParse({
    readingMinutes: Number(form.get("readingMinutes")),
    editionMinutes: Number(form.get("editionMinutes")),
    guidelines: form.get("guidelines"),
    timeZone: form.get("timeZone"),
    interests: form.getAll("interests"),
  });
}
