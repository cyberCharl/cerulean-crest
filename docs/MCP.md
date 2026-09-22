# Cerulean Crest MCP integration

## Current workspace update — 18 September 2026

The current implementation is multi-user and owner-scoped. The owner-only and public-reader descriptions below are historical pilot instructions; use [user accounts](USER_ACCOUNTS.md), [editorial feedback](EDITORIAL_FEEDBACK.md) and [submission preparation](submission/README.md) for current behavior.

The server now exposes five tools: `get_editorial_brief`, `get_recent_editions`, `get_editorial_feedback`, `update_editorial_preferences` and `create_daily_edition`. The three readers require `editions:read`; both writers require `editions:write`. Explicit preference updates are reflected in Settings, while article reactions and notes remain separate soft signals. Creation writes only to a private account (`openWorldHint: false`). Migration 003 and these five tools were deployed on 18 September 2026 (`dpl_HfZZjtxjKF4w4z8BQWPh3Jdiejv5`); authenticated discovery and reads passed. Public directory availability and actual ChatGPT rehearsal remain separate.

## Pending social pilot

The workspace adds `get_friend_recommendations` as a sixth tool (`editions:read`). It returns explicit pending nominations from accepted friends, preserving sender provenance. Notes and titles are untrusted context; the reader’s editorial constitution takes precedence. Included source URLs and dismissed shares are excluded. Deploy migration 004 before this version. See [friends and sharing](FRIENDS.md). This paragraph does not claim the social pilot is deployed.

## Historical pilot runbook

The initial MCP implementation is a single-user technical pilot for proving that a connected agent can create a complete daily edition without arbitrary shell or network access. The architectural decision and rollout requirements are recorded in [ADR 0001](adr/0001-publish-scheduled-editions-through-mcp.md).

## Tools

- `get_editorial_brief` returns the finite-edition budget, current local date, timezone and editorial invariants.
- `get_recent_editions` returns recent source URLs to avoid repeating recommendations across days (default seven editions; maximum fourteen).
- `create_daily_edition` validates and creates a complete edition. It never replaces an existing date, so retries are safe.

The server uses stateless MCP Streamable HTTP at `/mcp`. Tool inputs use the same validation contract as the manual publishing API.

## Local and preview pilot authentication

Generate a dedicated secret and configure it as the server-only `CERULEAN_MCP_TOKEN` environment variable. Do not reuse `CERULEAN_API_PASSWORD` and do not place the token in a task prompt.

For local development:

```bash
CERULEAN_MCP_AUTH_MODE=pilot CERULEAN_MCP_TOKEN=local-development-secret npm run dev
```

Open MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Select Streamable HTTP, enter `http://localhost:3000/mcp`, and set the `Authorization` header to `Bearer local-development-secret`. Verify initialization, list all three tools, call the editorial brief, create a test edition, and repeat the call to confirm it reports `already_exists` without replacing the first result.

The repository plugin config reads `CERULEAN_MCP_TOKEN` from the local environment and points to `http://localhost:3000/mcp`. It is local pilot packaging; production uses the separate OAuth connection below.

The former production pilot token is retired and rejected by the current production endpoint. The development token in `.env.local` must only be used against development. Historical Vercel deployments retain their old configuration; use the current production alias when checking authentication.

## Owner-only OAuth connection to ChatGPT

**Production uses Auth0 OAuth as of 15 September 2026.** The tenant is `cerulean-works.eu.auth0.com`; the owner is verified and has both edition permissions. Signed-token validation, refresh rotation, production discovery, and authenticated reads passed. The actual ChatGPT connection and publishing test remain pending. Follow [the Auth0 setup runbook](AUTH0_SETUP.md). Auth0 handles hosted login, authorization-code/PKCE, refresh tokens, and discovery; the app remains the resource server.

Set these production variables from the provider's actual configuration:

```text
CERULEAN_MCP_AUTH_MODE=oauth
CERULEAN_OAUTH_ISSUER=<exact issuer, including any trailing slash>
CERULEAN_OAUTH_JWKS_URL=<provider's HTTPS signing-key URL>
CERULEAN_MCP_RESOURCE=https://cerulean-crest.vercel.app/mcp
CERULEAN_OWNER_SUBJECT=<exact sub claim of the owner's account>
```

The provider must issue RS256 or ES256 access tokens with `iss`, `aud`, `sub`, `exp` and a space-separated `scope` claim containing `editions:read` and/or `editions:write`. Set the audience to the exact MCP resource above. The server validates token signature, issuer, audience, expiry, owner identity and per-tool scope. OAuth mode never falls back to the pilot token. The provider handles refresh-token rotation/revocation; short-lived access tokens bound their remaining validity.

The app serves `/.well-known/oauth-protected-resource` and advertises it in authentication challenges. Configure the provider's PKCE S256 support and exact ChatGPT callback URI/client registration, then connect `/mcp` through ChatGPT's app setup. Verify wrong-user, wrong-audience, expired and insufficient-scope tokens are rejected. See [OpenAI's current authentication requirements](https://developers.openai.com/plugins/build/auth).

For ChatGPT, configure OAuth through the app connection; the checked-in custom-header `.mcp.json` is only the Inspector/Codex pilot packaging. Restrict the first connection to the owner: public magazine reading is still intentionally single-user and public, and this is not multi-user onboarding.

## External-user gate

The bearer token is not suitable for external users. Before inviting anyone:

1. Configure and verify the OAuth provider end to end, including refresh tokens and revocation.
2. Resolve the Cerulean user and owner from the validated access token.
3. Add owner-scoped persistence and enforce uniqueness on `(owner_id, issue_date)`.
4. Remove shared-token authentication from the production MCP endpoint.
5. Test persistent write approval in ChatGPT over three scheduled runs.
6. Complete the public plugin submission materials and review.

## Intended scheduled prompt

> Every morning, create my finite daily Cerulean Crest edition. Use relevant context from my memory and past conversations, current web research, and the editorial brief returned by Cerulean Crest. Call `create_daily_edition` exactly once with a complete edition. Never replace an edition that already exists. After success, notify me with the returned link.

Before scheduling, run this prompt manually with `get_recent_editions` and confirm the task can access the intended preferences and research tools. Then record three unattended runs (date, completion time, issue URL, approval behavior, and source-quality check). These runs have not been completed as part of infrastructure setup. Retry a failed transport call with the identical complete payload; an existing edition must remain unchanged. Use the Basic PUT recovery path only when explicit replacement is intended.
