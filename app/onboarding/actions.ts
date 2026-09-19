"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/browser-auth";
import { getSettings, patchSettings } from "@/lib/db";
import { settingsFromOnboarding, type BriefStep, type OnboardingFormState } from "@/lib/onboarding";

export async function saveOnboarding(step: BriefStep, _previous: OnboardingFormState, form: FormData): Promise<OnboardingFormState> {
  const user = await requireUser();
  if (step !== "rhythm" && step !== "interests") return { error: "Please choose a setup step and try again." };
  const current = await getSettings(user.subject);
  const parsed = settingsFromOnboarding(current, step, form);
  if (!parsed.success) return { error: step === "rhythm"
    ? "Choose 5–240 minutes of reading, 5–480 minutes of material, and a valid timezone."
    : "Please use the topic choices below and keep your notes under 8,000 characters." };
  try {
    const { readingMinutes, editionMinutes, timeZone, interests, guidelines, onboardingStep } = parsed.data;
    await patchSettings(user.subject, step === "rhythm"
      ? { readingMinutes, editionMinutes, timeZone, onboardingStep }
      : { interests, guidelines, onboardingStep });
  } catch {
    return { error: "We couldn’t save your preferences. Your answers are still here; please try again." };
  }
  redirect(`/onboarding?step=${step === "rhythm" ? "interests" : "connect"}`);
}
