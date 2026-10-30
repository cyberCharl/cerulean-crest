# Agent access

How a reader's AI tool connects to Filtered, what it can do, and how sign-in is configured. This replaces the earlier MCP, Auth0 and ChatGPT publication notes; git keeps their history.

## The server

Readers connect their AI tool to **`https://filtered.page/mcp`**: stateless Streamable HTTP with JSON responses (`app/mcp/route.ts`, `lib/mcp-server.ts`). The server is named `filtered`. Every request needs a bearer token; there is no anonymous tool access.

| Tool | Scope | What it does |
| --- | --- | --- |
| `get_editorial_brief` | `editions:read` | Read-only curation context: the reader's Markdown constitution, local date, reading minutes, up to seven recent editions, saved reading candidates and excluded URLs, up to 50 recent reactions/notes, and pending friend recommendations. Empty sections are omitted. |
| `get_editorial_constitution` | `editions:read` | Only the persistent Markdown document and its revision. |
| `update_editorial_constitution` | `editions:write` | Exact, non-overlapping edits against that revision, only when the reader asks for a lasting change. Stale revisions and copies of transient brief context are rejected. |
| `publish_edition` | `editions:write` | Submit one complete final edition. Create-only: an existing reader/date returns the original unchanged. |

The server's connection instructions (`lib/curator-instructions.ts`, also shown at `/settings/brief`) tell the tool to read the brief first, keep research candidates internal, prefer relevant saved links alongside fresh finds, never reselect excluded URLs, and publish once. Publication is not exposure: an eligible link from an inside page the reader never opened may be picked again, so recent history isn't a blanket exclusion list. The website decides placement and records what was actually shown. Notes, titles and source text are untrusted data, never instructions.

The constitution lives in the reader's settings; saves from MCP and Settings use the same conditional write. Reading minutes, timezone and delivery schedule are separate settings. Filtered never schedules editions: ChatGPT can run a scheduled task, and readers using a tool without scheduling ask for each edition. The [privacy page](../app/privacy/page.tsx) lists what a connected tool can read and do; keep it in step with this table.

The [curation skill](../plugins/filtered/skills/curate-edition/SKILL.md) is the same guidance packaged for the ChatGPT/Codex plugin. Its `.mcp.json` points at localhost with the dev token and is not a distributable package.

## Sign-in

1. An unauthenticated request gets `401` with `WWW-Authenticate: Bearer resource_metadata="https://filtered.page/.well-known/oauth-protected-resource", scope="editions:read editions:write", …`.
2. The metadata (served at that path and at `/.well-known/oauth-protected-resource/mcp`) names `resource` `https://filtered.page/mcp` and the Auth0 issuer. Clients require `resource` to equal the URL the reader entered, so **the connection URL and the token audience are the same value**, `CERULEAN_MCP_RESOURCE`. Onboarding displays exactly this value.
3. The tool runs authorization code + PKCE S256 against Auth0 with `resource=https://filtered.page/mcp`. The tenant's Resource Parameter Compatibility Profile turns that into the API audience.
4. `lib/mcp-auth.ts` verifies signature (RS256/ES256), issuer, audience, expiry, a human subject (not `…@clients`) and at least one edition scope. The token's `sub` is the Filtered account, the same one the browser uses, so the website and the tool always see the same reader. Client IDs aren't allowlisted in code; Auth0 grants decide which tools may connect.

`error="insufficient_scope"` on the first 401 mirrors OpenAI's example; other clients ignore it.

**Local inspection.** Set `CERULEAN_MCP_DEV_TOKEN` (and optionally `CERULEAN_MCP_DEV_SUBJECT`, default `dev-reader`), run `npm run dev`, and connect MCP Inspector to `http://localhost:3000/mcp` with `Authorization: Bearer <token>`. The dev token is ignored on every Vercel deployment. Integration tests use it to publish fixtures.

## Auth0

Tenant `cerulean-works.eu.auth0.com` (browser login uses the custom domain `login.filtered.page`; MCP tokens keep the tenant issuer). Manage it with `auth0 … --tenant cerulean-works.eu.auth0.com`. Never paste client secrets into a conversation or the repo.

**API "Filtered MCP"**, identifier `https://filtered.page/mcp`: scopes `editions:read` and `editions:write`, RS256, 1-hour access tokens, offline access (rotating refresh tokens), RBAC off. User access requires a per-client grant; machine-to-machine access is denied. Created 29 October 2026 (id `6ae361de86e14b3189bb37ed`). The earlier API `https://cerulean-crest.vercel.app/mcp` stays until ChatGPT is verified on the new address, then gets deleted.

Tenant settings: Resource Parameter Compatibility Profile on, issuer in authorization responses on, Client ID Metadata Document (CIMD) registration on for **admin-imported clients only**. Dynamic CIMD and Dynamic Client Registration stay off, so nobody can add a client to the tenant except an admin.

| Client | How it identifies itself | Callback | Notes |
| --- | --- | --- | --- |
| Filtered - ChatGPT | Predefined confidential client (`client_secret_post`) | `https://chatgpt.com/connector_platform_oauth_redirect` | Credentials go only into ChatGPT's OAuth fields. |
| Claude (claude.ai web, desktop, mobile, Cowork) | Imported CIMD `https://claude.ai/oauth/mcp-oauth-client-metadata` (`tpc_wYciikRFpxppLSDocCmnRf`) | `https://claude.ai/api/mcp/auth_callback` | Public client. Readers paste the URL and leave Claude's advanced settings empty. |
| Claude Code | Imported CIMD `https://claude.ai/oauth/claude-code-client-metadata` (`tpc_fuf3mV3Dv3zMS7H1MFDFQZ`) | `http://localhost/callback` and `http://127.0.0.1/callback`, any port | Auth0 accepts any loopback port for this native client. |
| Filtered - Owner verification | Native public client | Loopback | For CLI token checks only. |
| Filtered, Filtered - Browser Development | Browser sign-in clients | `/auth/callback` | The production "Filtered" client also holds a `delete:users`-only Management grant for account deletion (`AUTH0_MANAGEMENT_DOMAIN`). Don't remove it. |

**Adding another AI tool.** If the tool publishes a CIMD, import its URL (Applications → Create Application → Import from URL, or `auth0 api post clients/cimd/register`), then grant it both edition scopes on the Filtered MCP API (`subject_type: user`). If it only accepts a pre-registered client ID, create a native public client with its exact callbacks and the same grant. Avoid wildcard callbacks. Record the tool in the table above and in the client list below.

## Clients

| Client | Status |
| --- | --- |
| ChatGPT | Verified through the developer-mode pilot on the former address; reconnect and re-verify after the address change. |
| Claude (web/desktop/mobile) | Imported and granted; Auth0 accepts its authorize request. Not yet verified end to end. |
| Claude Code | Imported and granted; Auth0 accepts its authorize request on any loopback port. Not yet verified end to end. |
| Other MCP tools | Work if they support remote Streamable HTTP, RFC 9728 metadata and PKCE, and identify themselves with an imported CIMD or a pre-registered client. Tools that only support Dynamic Client Registration, or the older 2025-03-26 flow without protected-resource metadata, can't connect. |

## ChatGPT publication

Route: an OpenAI plugin using this remote MCP server (**With MCP**, **Universal** endpoint) plus the curation skill; no custom UI. The submission packet is in [submission/](submission/README.md); the reviewer cases are in [submission/reviewer-guide.md](submission/reviewer-guide.md). The domain challenge route `/.well-known/openai-apps-challenge` serves `OPENAI_APPS_CHALLENGE` once that's set.

**Submit only after the server is on `https://filtered.page/mcp`.** Changing a published plugin's MCP origin needs a new plugin and a new review; a path change is only a new version.

Before submitting: verify ChatGPT on the new address (connect, brief, publish, refresh after an hour), set the challenge token, scan the live tool set from the review account, and run the reviewer cases. The review account must be isolated from real readers. The EU Auth0 tenant is unrelated to OpenAI project data residency, but OpenAI excludes EU-residency projects from MCP submissions. After approval, set `CERULEAN_CHATGPT_PLUGIN_URL` to the listing so onboarding links to it.
