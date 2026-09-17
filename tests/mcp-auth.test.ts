import assert from "node:assert/strict";
import test from "node:test";
import { authorizeMcpRequest } from "../lib/mcp-auth.ts";

test("MCP bearer authentication requires explicit pilot mode and a dedicated token", async () => {
  const previousOwner = process.env.CERULEAN_OWNER_SUBJECT;
  process.env.CERULEAN_OWNER_SUBJECT = "pilot-owner";
  const previousToken = process.env.CERULEAN_MCP_TOKEN;
  const previousMode = process.env.CERULEAN_MCP_AUTH_MODE;
  process.env.CERULEAN_MCP_AUTH_MODE = "pilot";
  process.env.CERULEAN_MCP_TOKEN = "pilot-secret";

  try {
    assert.equal(await authorizeMcpRequest("Bearer wrong"), null);
    assert.equal(await authorizeMcpRequest(null), null);

    const authorized = await authorizeMcpRequest("Bearer pilot-secret");
    assert.equal(authorized?.clientId, "cerulean-crest-pilot");
    assert.deepEqual(authorized?.scopes, ["editions:read", "editions:write"]);
  } finally {
    if (previousOwner === undefined) delete process.env.CERULEAN_OWNER_SUBJECT;
    else process.env.CERULEAN_OWNER_SUBJECT = previousOwner;
    if (previousMode === undefined) delete process.env.CERULEAN_MCP_AUTH_MODE;
    else process.env.CERULEAN_MCP_AUTH_MODE = previousMode;
    if (previousToken === undefined) delete process.env.CERULEAN_MCP_TOKEN;
    else process.env.CERULEAN_MCP_TOKEN = previousToken;
  }
});
