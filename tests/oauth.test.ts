import assert from "node:assert/strict";
import test from "node:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { verifyOwnerToken, type OAuthConfig } from "../lib/mcp-auth.ts";

test("OAuth verifies signature, issuer, audience, expiration, owner and scopes", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const keys = createLocalJWKSet({ keys: [{ ...await exportJWK(publicKey), kid: "test", alg: "ES256" }] });
  const config: OAuthConfig = { issuer: "https://auth.example/", resource: "https://cerulean.example/mcp", jwksUrl: "https://auth.example/jwks", ownerSubject: "owner-1" };
  const claims = { iss: config.issuer, aud: config.resource, sub: config.ownerSubject, exp: Math.floor(Date.now() / 1000) + 600, scope: "editions:read editions:write" };
  const sign = (payload: Record<string, unknown>) => new SignJWT(payload).setProtectedHeader({ alg: "ES256", kid: "test" }).sign(privateKey);
  assert.deepEqual((await verifyOwnerToken(await sign(claims), config, keys))?.scopes, ["editions:read", "editions:write"]);
  for (const patch of [{ iss: "https://wrong.example" }, { aud: "wrong" }, { sub: "someone-else" }, { exp: 1 }, { scope: "unrelated" }, { nbf: claims.exp + 1000 }]) {
    assert.equal(await verifyOwnerToken(await sign({ ...claims, ...patch }), config, keys), null);
  }
  const { exp: _expiration, ...withoutExpiry } = claims;
  assert.equal(await verifyOwnerToken(await sign(withoutExpiry), config, keys), null);
  const otherKeys = await generateKeyPair("ES256");
  const forged = await new SignJWT(claims).setProtectedHeader({ alg: "ES256", kid: "test" }).sign(otherKeys.privateKey);
  assert.equal(await verifyOwnerToken(forged, config, keys), null);
});
