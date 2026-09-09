import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export const MCP_SCOPES = ["editions:read", "editions:write"] as const;
export type OAuthConfig = { issuer: string; resource: string; jwksUrl: string; ownerSubject: string };
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function oauthConfig(): OAuthConfig | null {
  const issuer = process.env.CERULEAN_OAUTH_ISSUER;
  const resource = process.env.CERULEAN_MCP_RESOURCE;
  const jwksUrl = process.env.CERULEAN_OAUTH_JWKS_URL;
  const ownerSubject = process.env.CERULEAN_OWNER_SUBJECT;
  if (!issuer || !resource || !jwksUrl || !ownerSubject) return null;
  try {
    if ([issuer, resource, jwksUrl].some((value) => new URL(value).protocol !== "https:")) return null;
  } catch { return null; }
  return { issuer, resource, jwksUrl, ownerSubject };
}

export function mcpAuthConfigured(): boolean {
  return process.env.CERULEAN_MCP_AUTH_MODE === "pilot"
    ? Boolean(process.env.CERULEAN_MCP_TOKEN) : Boolean(oauthConfig());
}

export async function verifyOwnerToken(token: string, config: OAuthConfig, keys: JWTVerifyGetKey): Promise<AuthInfo | null> {
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: config.issuer, audience: config.resource,
      algorithms: ["RS256", "ES256"], requiredClaims: ["sub", "exp"],
    });
    if (payload.sub !== config.ownerSubject) return null;
    const scopes = typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [];
    if (!MCP_SCOPES.some((scope) => scopes.includes(scope))) return null;
    return { token, clientId: typeof payload.azp === "string" ? payload.azp : "oauth-owner", scopes,
      expiresAt: payload.exp, extra: { subject: payload.sub } };
  } catch { return null; }
}

export function mcpChallenge(origin: string, scope = MCP_SCOPES.join(" ")): string {
  if (process.env.CERULEAN_MCP_AUTH_MODE === "pilot") return 'Bearer realm="Cerulean Crest MCP"';
  const metadata = new URL("/.well-known/oauth-protected-resource", process.env.CERULEAN_SITE_URL || origin);
  return `Bearer resource_metadata="${metadata}", scope="${scope}", error="insufficient_scope", error_description="Authorize Cerulean Crest to continue"`;
}

export async function authorizeMcpRequest(authorization: string | null): Promise<AuthInfo | null> {
  if (process.env.CERULEAN_MCP_AUTH_MODE !== "pilot") {
    if (!authorization?.startsWith("Bearer ")) return null;
    const config = oauthConfig();
    if (!config) return null;
    let keys = keySets.get(config.jwksUrl);
    if (!keys) {
      keys = createRemoteJWKSet(new URL(config.jwksUrl), { timeoutDuration: 5_000 });
      keySets.set(config.jwksUrl, keys);
    }
    return verifyOwnerToken(authorization.slice(7), config, keys);
  }
  const expectedToken = process.env.CERULEAN_MCP_TOKEN;
  if (!expectedToken || !authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length);
  if (!safeEqual(token, expectedToken)) return null;

  return {
    token,
    clientId: "cerulean-crest-pilot",
    scopes: ["editions:read", "editions:write"],
    extra: { subject: "pilot" },
  };
}
