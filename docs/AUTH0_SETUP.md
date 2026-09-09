# Auth0 setup for Cerulean Crest

Selected on 9 September 2026. Account creation and tenant configuration are pending.

## Provider choice

Use Auth0's Free plan and hosted login for the owner pilot. Its published Free plan includes up to 25,000 monthly active users and requires no card for signup. Avoid depending on paid trial features. The existing application verifies standard JWT access tokens, so no provider SDK or new application login page is needed for the MCP connection.

Sources: [Auth0 pricing](https://auth0.com/pricing), [Auth0 MCP overview](https://auth0.com/ai/docs/mcp/intro/overview).

## Account handoff

The owner completes [Auth0 signup](https://auth0.com/signup) using their chosen account, including any verification. Create a dedicated Cerulean Crest tenant; choose an EU region if available. Record its actual domain rather than assuming the requested tenant name was available. Dashboard administration and the magazine's end-user identity are separate: signing into the Auth0 dashboard does not create the owner user inside the tenant.

After signup, authorize the Auth0 CLI or use the signed-in dashboard to finish the configuration. Do not paste passwords, management tokens, or client secrets into a conversation.

## Tenant and API configuration

- Enable **Resource Parameter Compatibility Profile** and **Include Issuer in Authorization Responses** in the tenant's advanced settings.
- Create an API named **Cerulean Crest MCP** with identifier `https://cerulean-crest.vercel.app/mcp` and RS256 signing.
- Define `editions:read` (retrieve the brief and recent editions) and `editions:write` (create an edition).
- Enable API RBAC; assign both permissions to a **Cerulean Owner** role and assign that role to the owner's actual tenant user.
- Enable offline access for this API and authorization-code/refresh-token grants for the client. Verify refresh issuance and renewal during the connection test.
- Enable the selected hosted-login connection for the client. If using a third-party client, configure that connection as a domain-level connection as required by Auth0.

Source: [Auth0's MCP setup guide](https://auth0.com/ai/docs/mcp/get-started/authorization-for-your-mcp-server).

## Register ChatGPT

Start with a predefined OAuth client for the owner pilot. OpenAI supports predefined clients, so open dynamic registration is unnecessary for this setup. Create a dedicated Auth0 client for **Cerulean Crest — ChatGPT**, configure its API grant for the two edition scopes, and enter its client credentials in ChatGPT's OAuth configuration.

Copy the **exact redirect URI shown by ChatGPT's MCP management page** into the client's callback allowlist. Do not guess the callback or add wildcards. The URI can depend on the authorization server's issuer-identification support. Use authorization code with PKCE S256 and the token-endpoint authentication method supported by both the client and provider. Keep consent enabled.

If moving to CIMD later, use the exact client metadata URL supplied by ChatGPT and Auth0's supported registration workflow. This is a later configuration choice, not a reason to enable open DCR for the owner pilot.

Sources: [OpenAI authentication requirements](https://developers.openai.com/plugins/build/auth), [Auth0 client registration options](https://auth0.com/ai/docs/mcp/guides/registering-your-mcp-client-application).

## Application configuration and verification

Fetch the actual tenant's discovery metadata and use its exact `issuer` and `jwks_uri` values. Set the production variables below only after the provider and owner account are configured:

| Variable | Value |
| --- | --- |
| `CERULEAN_MCP_AUTH_MODE` | `oauth` |
| `CERULEAN_OAUTH_ISSUER` | Exact issuer from tenant discovery, including trailing slash |
| `CERULEAN_OAUTH_JWKS_URL` | Exact `jwks_uri` from tenant discovery |
| `CERULEAN_MCP_RESOURCE` | `https://cerulean-crest.vercel.app/mcp` |
| `CERULEAN_OWNER_SUBJECT` | Owner's tenant user ID, matching the access token's `sub` |

Use a separate API audience and client for an isolated preview verification; never reuse production audience/credentials for Preview or Development. Verify signed owner tokens, wrong-user rejection, scope enforcement, refresh, and MCP discovery before the production switch. Redeploy after updating Vercel variables. Remove the obsolete production pilot token once OAuth is verified.

Then connect ChatGPT, retrieve the brief and recent editions, publish one real edition, and confirm the reader and delivery health. The subsequent three unattended scheduled runs remain a separate acceptance gate. No OAuth connection has been claimed successful merely by choosing this provider.
