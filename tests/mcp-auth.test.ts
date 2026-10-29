import assert from "node:assert/strict";
import test from "node:test";
import { authorizeMcpRequest, mcpAuthConfigured, mcpChallenge } from "../lib/mcp-auth.ts";

async function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  try { return await run(); }
  finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
}
const noOAuth = { CERULEAN_OAUTH_ISSUER: undefined, CERULEAN_OAUTH_JWKS_URL: undefined, CERULEAN_MCP_RESOURCE: undefined };

test("the local dev token grants both scopes to its own subject", () => withEnv({ ...noOAuth, VERCEL: undefined, CERULEAN_MCP_DEV_TOKEN: "dev-secret", CERULEAN_MCP_DEV_SUBJECT: "local-reader" }, async () => {
  assert.equal(mcpAuthConfigured(), true);
  assert.equal(await authorizeMcpRequest("Bearer wrong"), null);
  assert.equal(await authorizeMcpRequest("dev-secret"), null);
  assert.equal(await authorizeMcpRequest(null), null);
  const authorized = await authorizeMcpRequest("Bearer dev-secret");
  assert.deepEqual(authorized?.scopes, ["editions:read", "editions:write"]);
  assert.equal(authorized?.extra?.subject, "local-reader");
  assert.equal(mcpChallenge("http://localhost:3000"), 'Bearer realm="Filtered MCP"');
}));

test("the dev token is ignored on any Vercel deployment", () => withEnv({ ...noOAuth, VERCEL: "1", CERULEAN_MCP_DEV_TOKEN: "dev-secret" }, async () => {
  assert.equal(mcpAuthConfigured(), false);
  assert.equal(await authorizeMcpRequest("Bearer dev-secret"), null);
}));

test("without OAuth or a dev token, MCP is not configured", () => withEnv({ ...noOAuth, CERULEAN_MCP_DEV_TOKEN: undefined }, async () => {
  assert.equal(mcpAuthConfigured(), false);
}));
