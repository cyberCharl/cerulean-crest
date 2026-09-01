import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorized } from "../lib/auth.ts";

test("requires configured Basic credentials", () => {
  process.env.CERULEAN_API_USER = "reader";
  process.env.CERULEAN_API_PASSWORD = "a-long-secret";
  const valid = `Basic ${Buffer.from("reader:a-long-secret").toString("base64")}`;
  const invalid = `Basic ${Buffer.from("reader:wrong").toString("base64")}`;

  assert.equal(isAuthorized(valid), true);
  assert.equal(isAuthorized(invalid), false);
  assert.equal(isAuthorized(null), false);
});
