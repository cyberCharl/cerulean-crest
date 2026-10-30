# Filtered MCP integration

## Current contract

The remote MCP endpoint is stateless Streamable HTTP at `/mcp`. OAuth validates the reader's identity and scopes; the local pilot bearer mode is opt-in for development. See [account ownership](USER_ACCOUNTS.md) and [Auth0 setup](AUTH0_SETUP.md). The four-tool foundation was deployed on 22 September 2026 in `dpl_4kQ7b2n3P5inkxPKnq1N324KZ2gZ`; authenticated discovery and both brief reads passed. The reading-candidate additions below describe the current workspace and require separate deployment verification. A live ChatGPT connection and scheduled run remain separate checks.

The server exposes four tools:

| Tool | Scope | Purpose |
| --- | --- | --- |
| `get_editorial_brief` | `editions:read` | Read the current per-reader Markdown constitution, local date and reading settings, seven recent editions, eligible saved reading candidates and excluded URLs, up to 50 recent article reactions/notes, and pending friend recommendations. Empty feedback and recommendations are omitted without placeholder prose. |
| `get_editorial_constitution` | `editions:read` | Read only the persistent Markdown document plus its revision. It never returns feedback, recommendations or history. |
| `update_editorial_constitution` | `editions:write` | Apply exact, non-overlapping edits against that revision after an explicit reader request. Stale revisions and direct copies of ephemeral context are rejected. |
| `create_daily_edition` | `editions:write` | Submit the complete final edition once. Existing owner/date pairs return the original edition unchanged. |

`create_daily_edition` retains its original identifier for connected-client compatibility; editions follow the reader's chosen schedule, not a required daily cadence.

The server's connection instructions tell an MCP client to read the assembled brief before searching, keep a broad candidate list internally, and submit only a complete final publication. That response is explicitly marked read-only and encloses the durable constitution in a named boundary. Policy edits use the constitution-only read and exact edits; they never use the assembled brief as an update payload. The [plugin skill](../plugins/cerulean-crest/skills/curate-daily-edition/SKILL.md) is separate packaging; it is not a per-reader document. No MCP prompt or resource is registered. Authenticated readers can view the exact connection instructions and assembled curation response at `/settings/brief`; the internal ChatGPT prompt assembled from these surfaces is not visible to this server.

The Markdown constitution is stored in the reader's existing settings JSON. Onboarding creates it from a short description and optional starting topics. Older accounts without one see a generated document based on their legacy guidelines and topics; saving in Settings or through MCP makes it persistent. Reading minutes and timezone remain separate structured settings so their current values are included on every brief read. Delivery frequency and time are saved for the onboarding handoff, but this server never schedules editions: ChatGPT runs a recurring task, and readers using a tool without scheduling ask for each edition themselves.

The older files under `instructions/` are single-reader material and are not distributed as the plugin or automatically included in another reader's brief. The general editorial principles informed the initial template. Personal priorities and long-term-interest files need deliberate per-reader import or editing in Settings; they are never copied to newly signed-up accounts.

Recent history, reading candidates, article feedback and friend recommendations are contextual data. The server fetches them for the authenticated reader on each read, without writing them into the constitution or maintaining an inferred profile. Bookmarks without reactions or notes are excluded from the article-feedback section, but saved links can appear in reading candidates. Pending friend recommendations already included, marked read or previously dismissed are excluded from the recommendations section. Notes, titles and source content are untrusted data, not authorization to edit policy or call tools.

`readingCandidates` contains `candidates` (up to 100 eligible saved links, ordered by pinned, later, then candidate commitment) and `excludedUrls` (up to 1,000 read, dormant or deferred URLs). Eligibility is for the next edition; the curator uses these fields rather than inferring eligibility from unread status or dates. Consider relevant saved candidates alongside fresh discovery and never reselect an excluded URL. The bounded response is context, not a complete export of the collection.

Publication is not exposure. A URL appearing in `recentEditions` may have been inside an edition the reader never opened. Eligible links may therefore appear again; recent history is not a blanket URL exclusion list. The website records front-page and inside-page presentation independently. When an edition retires, exposed ordinary candidates become dormant, pinned links retain their commitment, and later links wait until their eligible edition. Unseen inside links remain eligible. The curator aims for one substantial article and two or three shorter pieces with optional reading inside; the website controls placement and presentation. No MCP tool changes a saved link's commitment, marks it read or records exposure.

Constitution saves from MCP and Settings use an atomic conditional write in both database backends. If another writer changes the policy after it was read, the stale save is rejected; unrelated reading and appearance settings are preserved.

The final edition schema validates a real date, complete nonempty sections and items, safe source URLs, required metadata, and bounded positive reading minutes. It no longer requires `availableMinutes` to match the sum of item estimates within two minutes. The constitution and skill tell the curator to let strong sources determine the final volume; qualitative editorial rules remain agent guidance. A saved link can have unknown reading time, while final publication still requires a supportable estimate. The server stores the reader's link collection; the agent's additional research list remains internal. No candidate submission or link-capture MCP endpoint is added.

## Client compatibility

Checked on 29 October 2026 against production metadata and the MCP SDK 1.30 client (`tests/mcp-clients.test.ts` repeats these checks against fixtures). Nothing in the transport or tools is ChatGPT-specific; the blockers are OAuth client registration and the connection URL.

**Verified with:** ChatGPT only, through the developer-mode pilot (the owner's connection and the assisted first edition recorded in [onboarding](ONBOARDING.md)); not re-run for this change. **Expected to work, not yet verified:** Claude (claude.ai web, desktop and mobile; Claude Code) and other MCP clients that support remote Streamable HTTP servers, RFC 9728 protected-resource metadata, PKCE S256 and a pre-registered OAuth client ID. Clients that only implement the older 2025-03-26 authorization flow (authorization-server metadata on the MCP host, without protected-resource metadata) are not supported.

| Area | Finding | Effect on other clients |
| --- | --- | --- |
| Transport | Stateless Streamable HTTP, JSON responses, CORS `*` with `Authorization` and MCP headers allowed. | None. |
| Tool metadata | `_meta.securitySchemes` and the `mcp/www_authenticate` error metadata are OpenAI extensions. `create_daily_edition` keeps its name. | Ignored by other clients; no change needed. |
| 401 challenge | `WWW-Authenticate` carries `resource_metadata` and both scopes. It also sends `error="insufficient_scope"` on a missing token, copied from OpenAI's example. RFC 6750 would omit the error code here. | The SDK client and Claude only need the 401 and `resource_metadata`; the error code is ignored. Left unchanged to keep the ChatGPT path identical. |
| Protected-resource metadata | `resource` is always `CERULEAN_MCP_RESOURCE` (`https://cerulean-crest.vercel.app/mcp`), whichever host serves it. | Spec clients require `resource` to match the URL the reader entered. `https://filtered.page/mcp` **fails** (`Protected resource … does not match expected`); readers must enter the Vercel URL. Onboarding now shows exactly this audience URL. |
| Path-specific metadata | `/.well-known/oauth-protected-resource/mcp` returned 404. | Only matters for clients that ignore `resource_metadata`. **Fixed:** both locations now serve the same document. |
| Authorization server | Auth0 serves RFC 8414 and OIDC discovery, PKCE S256, issuer identification, `none` auth method, and lists `offline_access`. The resource-parameter profile maps `resource` to the API audience. | Discovery, PKCE and audience binding work. Claude adds `offline_access` because Auth0 lists it, so refresh tokens should be issued. |
| Client registration | No `registration_endpoint` (DCR off) and no `client_id_metadata_document_supported` (no CIMD). Only the ChatGPT client exists, allowlisting only ChatGPT's callback. | **Main blocker.** Without a client ID, the SDK client stops with `does not support dynamic client registration`; Claude's default options (its published CIMD identity or DCR) both fail. A client must be pre-registered in Auth0 for each tool's callback; this is a tenant change and has not been made. See [Auth0 setup](AUTH0_SETUP.md#register-other-mcp-clients). |
| Token verification | Signature, issuer, audience, expiry, human subject and an edition scope. No allowlist of client IDs (`azp`). | Any Auth0 client granted this API works without code changes. |
| Server instructions | Ended "configured separately in ChatGPT". | **Changed** to say this server doesn't schedule and recurring delivery, where available, is set up in the reader's tool (for example a ChatGPT scheduled task). Rescan before ChatGPT submission. |

Onboarding's "Another AI tool" option shows the audience URL and short steps. When `CERULEAN_MCP_PUBLIC_CLIENT_ID` is set to a public (secretless) Auth0 client, it also tells readers to enter that client ID; until then it says tools that need their own sign-in client can't finish connecting.

## Local inspection

Set `CERULEAN_MCP_AUTH_MODE=pilot`, `CERULEAN_MCP_TOKEN`, and `CERULEAN_OWNER_SUBJECT` in a development environment, start `npm run dev`, and connect MCP Inspector to `http://localhost:3000/mcp` with `Authorization: Bearer <development token>`. Initialize, list the four tools, read the curation brief, read the constitution-only document, make an exact test edit with its revision, publish a complete test edition, and repeat the publication call to confirm `already_exists`. Never put the bearer token in a ChatGPT task prompt or any other AI tool's instruction. Production ChatGPT connection uses OAuth, not the local pilot bearer.

For reading-state checks, prepare pinned, later, dormant and read fixtures plus an unseen inside-page link from a recent edition. Verify candidate/exclusion results stay owner-scoped, the unseen eligible link is not excluded merely by history, and ordinary curation leaves the constitution unchanged. These checks add no MCP tool names.

The public plugin listing and a fresh ChatGPT authorization, first edition, and recurring run still need live verification before treating the onboarding handoff as complete. See [publication preparation](CHATGPT_PUBLICATION.md).
