# Auth0 setup for Cerulean Crest

Selected on 9 September 2026. As of 15 September, Auth0 CLI 1.35.0 is authorized for **cerulean-works.eu.auth0.com**, the owner's new European Free-plan tenant, and production MCP uses OAuth.

Created through the CLI: **Cerulean Crest MCP** API, **Cerulean Crest Owner** role, **Cerulean Crest - ChatGPT** third-party client, and **Cerulean Crest - Owner verification** native client. The API requires explicit user client grants and RBAC, denies machine-to-machine access, signs RS256 access tokens with a one-hour lifetime, and allows refresh access. Both clients are granted only the edition read/write scopes for this API. The hosted password connection is available to these clients. Secrets are stored outside Git with restrictive file permissions.

Discovery verified: issuer `https://cerulean-works.eu.auth0.com/`, signing keys `https://cerulean-works.eu.auth0.com/.well-known/jwks.json`, PKCE S256 support, and issuer identification in authorization responses. The resource-parameter compatibility profile is enabled.

The owner completed hosted login and consent, received the app-specific owner role, and obtained signed access tokens with both edition permissions. Refresh-token rotation and live production MCP initialization, tool discovery, brief retrieval, and recent-edition retrieval passed. The deployed production endpoint rejects the retired pilot token; its Vercel production variable has been removed. Basic recovery access remains available.

The ChatGPT client allows `https://chatgpt.com/connector_platform_oauth_redirect`, OpenAI's documented stable callback for providers advertising issuer identification. Its strict third-party client uses `client_secret_post`, authorization-code and rotating refresh-token grants. Complete the actual ChatGPT connection and compare its displayed callback with this allowlist before claiming the ChatGPT flow verified. Dynamic registration remains disabled.

The separate native verification client uses a localhost callback for the Auth0 CLI. A localhost page during that test is unrelated to the production website or ChatGPT callback. If a CLI consent flow must be repeated, let the CLI receive the actual callback; probing its callback listener with a browser or HTTP request can consume the one-shot listener and invalidate the test.

The owner selected a new **cerulean-works** tenant that may also host future apps. Give Cerulean Crest its own API audience, clients, roles, and permissions within that tenant. The previously authorized `prod-ai-safety-sa.eu.auth0.com` tenant belongs to a different project and must not be used or modified for Cerulean Crest. All configuration commands must specify the verified new tenant domain explicitly with `--tenant`.

## Provider choice

Use Auth0's Free plan and hosted login for the owner pilot. Its published Free plan includes up to 25,000 monthly active users and requires no card for signup. Avoid depending on paid trial features. The existing application verifies standard JWT access tokens, so no provider SDK or new application login page is needed for the MCP connection.

Sources: [Auth0 pricing](https://auth0.com/pricing), [Auth0 MCP overview](https://auth0.com/ai/docs/mcp/intro/overview).

## Account handoff

Account signup and creation of the `cerulean-works` tenant are complete. Record its actual domain from CLI authorization rather than assuming its regional suffix. Dashboard administration and the magazine's end-user identity are separate: signing into the Auth0 dashboard does not create the owner user inside the tenant.

After signup, authorize the Auth0 CLI or use the signed-in dashboard to finish the configuration. Do not paste passwords, management tokens, or client secrets into a conversation.

The installed CLI supports listing, selecting, and opening existing tenants, but has no tenant-creation command. That one-time dashboard step and CLI authorization are complete. Use `--tenant cerulean-works.eu.auth0.com` explicitly on further configuration commands. See [Auth0 tenant creation](https://auth0.com/docs/get-started/auth0-overview/create-tenants).

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

The stable callback above is configured from OpenAI's documented issuer-identification behavior and this tenant's discovery metadata. Compare the **exact redirect URI shown by ChatGPT's MCP management page** with the client's callback allowlist; update it if ChatGPT shows a different URI. Do not add wildcards. Use authorization code with PKCE S256 and the token-endpoint authentication method supported by both the client and provider. Keep consent enabled.

On the owner's checkout, `.data/auth0/chatgpt-connection.txt` contains the connection URL, client ID, and secret with owner-only file permissions. It is ignored by Git and Vercel uploads. Copy these values into ChatGPT's OAuth configuration, never into a conversation. In ChatGPT, enable Developer mode under Settings → Security and login, then add the public MCP endpoint from [Plugins](https://chatgpt.com/plugins). See [OpenAI's connection instructions](https://developers.openai.com/plugins/deploy/connect-chatgpt).

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

Production OAuth was activated on 15 September in deployment `dpl_HTv8x2oca4tbcESWX8RWhPKgU9Kz`. Live signed-token checks passed; wrong-owner and wrong-audience rejection also passed using the application's verifier. Native-client login and refresh do not establish that ChatGPT's separate PKCE/client-secret flow works.

Next connect ChatGPT, retrieve the brief and recent editions, publish one real edition, and confirm the reader and delivery health. The subsequent three unattended scheduled runs remain a separate acceptance gate. No test edition was written to Production during OAuth verification.
