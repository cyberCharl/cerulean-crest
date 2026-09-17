import { z } from "zod";
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
  onboardingStep: z.enum(["interests", "connect"]).optional(),
});
export type EditorialSettings = z.infer<typeof editorialSettingsSchema>;
export const defaultSettings: EditorialSettings = { readingMinutes: 60, editionMinutes: 120, guidelines: "", timeZone: "Africa/Johannesburg" };
