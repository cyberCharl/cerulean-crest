// Checks the discovery chain a standard (non-ChatGPT) MCP client follows, using the
// MCP SDK's own OAuth client. Auth0's metadata below mirrors the production tenant:
// no registration_endpoint, and Client ID Metadata Documents for admin-imported clients.
import assert from "node:assert/strict";
import test from "node:test";
import { auth, extractWWWAuthenticateParams, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { mcpChallenge, protectedResourceMetadataResponse } from "../lib/mcp-auth.ts";
import { mcpConnectionUrl } from "../lib/onboarding.ts";
import { curatorServerInstructions } from "../lib/curator-instructions.ts";

const issuer = "https://tenant.example.auth0.com/";
const resource = "https://mcp-host.example.com/mcp";
const env = {
  CERULEAN_OAUTH_ISSUER: issuer,
  CERULEAN_OAUTH_JWKS_URL: `${issuer}.well-known/jwks.json`,
  CERULEAN_MCP_RESOURCE: resource,
  CERULEAN_APP_URL: "https://reader.example.com",
};
const auth0Metadata = {
  issuer, authorization_endpoint: `${issuer}authorize`, token_endpoint: `${issuer}oauth/token`,
  jwks_uri: `${issuer}.well-known/jwks.json`, response_types_supported: ["code"],
  code_challenge_methods_supported: ["S256", "plain"], scopes_supported: ["openid", "offline_access"],
  token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
  authorization_response_iss_parameter_supported: true, client_id_metadata_document_supported: true,
};

async function withEnv<T>(values: Record<string, string>, run: () => Promise<T> | T): Promise<T> {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  try { return await run(); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

/** Serves our metadata at both RFC 9728 locations and the Auth0 document at the issuer. */
const fetchFn = async (input: string | URL | Request) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.pathname.startsWith("/.well-known/oauth-protected-resource")) return protectedResourceMetadataResponse();
  if (url.origin === new URL(issuer).origin && url.pathname.startsWith("/.well-known/")) return Response.json(auth0Metadata);
  return new Response("not found", { status: 404 });
};

function provider(clientId?: string, clientMetadataUrl?: string) {
  let client = clientId ? { client_id: clientId } : undefined;
  let redirected: URL | undefined;
  const value: OAuthClientProvider & { redirected(): URL | undefined } = {
    redirectUrl: "https://claude.ai/api/mcp/auth_callback",
    clientMetadata: { client_name: "test", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] },
    clientInformation: () => client,
    saveClientInformation: (info) => { client = info; },
    tokens: () => undefined, saveTokens: () => {},
    saveCodeVerifier: () => {}, codeVerifier: () => "verifier",
    redirectToAuthorization: (url) => { redirected = url; },
    redirected: () => redirected,
    ...(clientMetadataUrl ? { clientMetadataUrl } : {}),
  };
  return value;
}

function unauthorized(): Response {
  return new Response(null, { status: 401, headers: { "WWW-Authenticate": mcpChallenge("https://ignored.example.com") } });
}

test("protected-resource metadata is served at the root and path-specific locations", () => withEnv(env, async () => {
  const body = await protectedResourceMetadataResponse().json();
  assert.deepEqual(body, { resource, authorization_servers: [issuer], scopes_supported: ["editions:read", "editions:write"],
    bearer_methods_supported: ["header"], resource_name: "Filtered" });
  assert.equal((await fetchFn("https://reader.example.com/.well-known/oauth-protected-resource/mcp")).status, 200);
}));

test("the 401 challenge points clients at the metadata and both edition scopes", () => withEnv(env, () => {
  const params = extractWWWAuthenticateParams(unauthorized());
  assert.equal(params.resourceMetadataUrl?.href, "https://reader.example.com/.well-known/oauth-protected-resource");
  assert.equal(params.scope, "editions:read editions:write");
}));

test("the URL onboarding shows passes a standard client's resource check", () => withEnv(env, async () => {
  assert.equal(mcpConnectionUrl(), resource);
  const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(unauthorized());
  const client = provider("pre-registered-client");
  const result = await auth(client, { serverUrl: mcpConnectionUrl(), resourceMetadataUrl, scope, fetchFn });
  assert.equal(result, "REDIRECT");
  const authorize = client.redirected();
  assert.equal(authorize?.origin + (authorize?.pathname ?? ""), `${issuer}authorize`);
  assert.equal(authorize?.searchParams.get("resource"), resource);
  assert.equal(authorize?.searchParams.get("scope"), "editions:read editions:write");
  assert.equal(authorize?.searchParams.get("code_challenge_method"), "S256");
}));

test("a different hostname is rejected because the metadata names the audience URL", () => withEnv(env, async () => {
  const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(unauthorized());
  await assert.rejects(auth(provider("pre-registered-client"), { serverUrl: "https://reader.example.com/mcp", resourceMetadataUrl, scope, fetchFn }),
    /does not match expected/);
}));

test("a client with a published metadata document uses its URL as the client ID", () => withEnv(env, async () => {
  const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(unauthorized());
  const claude = provider(undefined, "https://claude.ai/oauth/mcp-oauth-client-metadata");
  assert.equal(await auth(claude, { serverUrl: mcpConnectionUrl(), resourceMetadataUrl, scope, fetchFn }), "REDIRECT");
  assert.equal(claude.redirected()?.searchParams.get("client_id"), "https://claude.ai/oauth/mcp-oauth-client-metadata");
}));

test("a client with neither a client ID nor a metadata document can't register", () => withEnv(env, async () => {
  const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(unauthorized());
  await assert.rejects(auth(provider(), { serverUrl: mcpConnectionUrl(), resourceMetadataUrl, scope, fetchFn }),
    /does not support dynamic client registration/);
}));

test("without OAuth, onboarding shows the local endpoint", () => withEnv({ ...env, CERULEAN_MCP_RESOURCE: "" }, () => {
  assert.equal(mcpConnectionUrl(), "https://reader.example.com/mcp");
}));

test("server instructions don't send other clients to ChatGPT for scheduling", () => {
  assert.doesNotMatch(curatorServerInstructions, /configured separately in ChatGPT/);
  assert.match(curatorServerInstructions, /does not schedule editions/);
});
