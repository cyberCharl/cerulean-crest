import assert from "node:assert/strict";
import { test } from "node:test";
import { policyReviewEnabled } from "../lib/policy-review.ts";

test("policy drafts require explicit opt-in and a development or preview environment", () => {
  for (const env of [{}, { NODE_ENV: "development" }, { POLICY_REVIEW_ENABLED: "true" },
    { POLICY_REVIEW_ENABLED: "true", NODE_ENV: "production" },
    { POLICY_REVIEW_ENABLED: "false", VERCEL_ENV: "preview" }]) assert.equal(policyReviewEnabled(env), false);
  assert.equal(policyReviewEnabled({ POLICY_REVIEW_ENABLED: "true", NODE_ENV: "development" }), true);
  assert.equal(policyReviewEnabled({ POLICY_REVIEW_ENABLED: "true", NODE_ENV: "production", VERCEL_ENV: "preview" }), true);
});
test("production deployment overrides review opt-in even with a development NODE_ENV", () => {
  for (const NODE_ENV of ["development", "production", undefined])
    assert.equal(policyReviewEnabled({ POLICY_REVIEW_ENABLED: "true", VERCEL_ENV: "production", NODE_ENV }), false);
});
