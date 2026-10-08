/** Drafts are opt-in and cannot be exposed by this flag on production deployments. */
export function policyReviewEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.POLICY_REVIEW_ENABLED !== "true" || env.VERCEL_ENV === "production") return false;
  return env.NODE_ENV === "development" || env.VERCEL_ENV === "preview";
}
export const policyTitles = {
  privacy: "Privacy notice",
  terms: "Terms of use",
  support: "Help and support",
} as const;
export type PolicyKind = keyof typeof policyTitles;
