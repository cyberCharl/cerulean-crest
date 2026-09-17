import assert from "node:assert/strict";
import { test } from "node:test";
import { appUrl, marketingUrl, configuredAppOrigin, isSeparateAppHost } from "../lib/site-config.ts";

test("site links work on one origin and move to separate domains through configuration", () => {
  const keys = ["CERULEAN_APP_URL", "CERULEAN_MARKETING_URL", "APP_BASE_URL", "CERULEAN_SITE_URL"];
  const previous = keys.map((key) => process.env[key]);
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(appUrl("/auth/login?screen_hint=signup"), "/auth/login?screen_hint=signup");
    assert.equal(marketingUrl(), "/");
    assert.equal(isSeparateAppHost("localhost:3000"), false);
    process.env.CERULEAN_APP_URL = "https://app.example.com/";
    process.env.CERULEAN_MARKETING_URL = "https://example.com";
    assert.equal(appUrl("/auth/login?screen_hint=signup"), "https://app.example.com/auth/login?screen_hint=signup");
    assert.equal(marketingUrl(), "https://example.com/");
    assert.equal(isSeparateAppHost("app.example.com"), true);
    assert.equal(isSeparateAppHost("example.com"), false);
    assert.equal(isSeparateAppHost("app.example.com.attacker.test"), false);
    assert.throws(() => appUrl("//attacker.test"));
    assert.throws(() => appUrl("/\\attacker.test"));
    for (const invalid of ["http://app.example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com?foo=bar"]) {
      process.env.CERULEAN_APP_URL = invalid;
      assert.throws(() => configuredAppOrigin());
    }
    process.env.CERULEAN_APP_URL = "http://localhost:3000";
    assert.equal(configuredAppOrigin(), "http://localhost:3000");
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
