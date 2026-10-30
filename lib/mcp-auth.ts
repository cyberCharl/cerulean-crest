import { configuredAppOrigin } from "./site-config.ts";
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
export type OAuthConfig = { issuer: string; resource: string; jwksUrl: string };
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function oauthConfig(): OAuthConfig | null {
  const issuer = process.env.CERULEAN_OAUTH_ISSUER;
  const resource = process.env.CERULEAN_MCP_RESOURCE;
  const jwksUrl = process.env.CERULEAN_OAUTH_JWKS_URL;
  if (!issuer || !resource || !jwksUrl) return null;
  try {
    if ([issuer, resource, jwksUrl].some((value) => new URL(value).protocol !== "https:")) return null;
  } catch { return null; }
  return { issuer, resource, jwksUrl };
}

/** A fixed bearer token for MCP Inspector and integration tests. Ignored on any Vercel deployment. */
export function devTokenConfig(): { token: string; subject: string } | null {
  const token = process.env.CERULEAN_MCP_DEV_TOKEN;
  if (!token || process.env.VERCEL) return null;
  return { token, subject: process.env.CERULEAN_MCP_DEV_SUBJECT || "dev-reader" };
}

export function mcpAuthConfigured(): boolean {
  return Boolean(oauthConfig() || devTokenConfig());
}

export async function verifyUserToken(token: string, config: OAuthConfig, keys: JWTVerifyGetKey): Promise<AuthInfo | null> {
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: config.issuer, audience: config.resource,
      algorithms: ["RS256", "ES256"], requiredClaims: ["sub", "exp"],
    });
    if (!payload.sub || payload.sub.endsWith("@clients")) return null;
    const scopes = typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [];
    if (!MCP_SCOPES.some((scope) => scopes.includes(scope))) return null;
    return { token, clientId: typeof payload.azp === "string" ? payload.azp : "oauth-owner", scopes,
      expiresAt: payload.exp, extra: { subject: payload.sub } };
  } catch { return null; }
}

/** RFC 9728 metadata. `resource` is the OAuth audience, so it is also the only URL clients can connect to. */
export function protectedResourceMetadataResponse(): Response {
  const config = oauthConfig();
  if (!config) {
    return Response.json({ error: "OAuth is not configured" }, { status: 503 });
  }
  return Response.json({ resource: config.resource, authorization_servers: [config.issuer], scopes_supported: MCP_SCOPES,
    bearer_methods_supported: ["header"], resource_name: "Filtered" },
  { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
}

export function mcpChallenge(origin: string, scope = MCP_SCOPES.join(" ")): string {
  if (!oauthConfig()) return 'Bearer realm="Filtered MCP"';
  const metadata = new URL("/.well-known/oauth-protected-resource", configuredAppOrigin() || origin);
  return `Bearer resource_metadata="${metadata}", scope="${scope}", error="insufficient_scope", error_description="Authorize Filtered to continue"`;
}

export async function authorizeMcpRequest(authorization: string | null): Promise<AuthInfo | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  const dev = devTokenConfig();
  if (dev && safeEqual(token, dev.token)) {
    return { token, clientId: "filtered-dev", scopes: [...MCP_SCOPES], extra: { subject: dev.subject } };
  }
  const config = oauthConfig();
  if (!config) return null;
  let keys = keySets.get(config.jwksUrl);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(config.jwksUrl), { timeoutDuration: 5_000 });
    keySets.set(config.jwksUrl, keys);
  }
  return verifyUserToken(token, config, keys);
}
