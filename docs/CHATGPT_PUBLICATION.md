# Publishing Cerulean Crest for ChatGPT

Research checked 17 September 2026 against current official OpenAI documentation and this repository. This is a preparation plan, not a submitted or approved listing. No provider configuration or publication was changed during this review.

## Recommended route

Publish a **plugin with the existing remote MCP server and the curation skill**. Current OpenAI documentation uses “plugins” for the shared ChatGPT/Codex directory; this is not the old ChatGPT plugin manifest system. The existing three tools cover the first useful workflow. We do not need to rebuild the reader inside ChatGPT. [Plugin overview](https://developers.openai.com/plugins)

The submission portal accepts remote MCP alone or MCP plus skills; custom UI is optional. Use **With MCP**, a **Universal** endpoint, and upload the tested curation skill. Prepare a verified individual/business identity, Apps Management write access, name/descriptions/logo/category, website/support/privacy/terms URLs, countries, release notes, starter prompts, and at least five positive plus three negative test cases. Verify the server domain with the portal's token at `/.well-known/openai-apps-challenge`. [Submission procedure](https://developers.openai.com/plugins/deploy/submission)

## Intended reader journey

1. Sign up on Cerulean Crest and save reading volume and a small initial editorial brief.
2. Open the actual published directory listing from the onboarding page, install, and connect when prompted.
3. Authorize using the same Cerulean Crest/Auth0 account. The publisher configures OAuth client credentials centrally; readers do not receive client secrets or create developer-mode connectors.
4. Start a new chat, invoke Cerulean Crest, and request the first edition.
5. Open the returned private edition link. Arrange recurring delivery separately in ChatGPT if desired.

Installation and connection can be separate moments; some plugins request authorization on first use. “Sign in with ChatGPT” is only available to supported partners, so it is not our proposed identity system. Browser signup and MCP authorization continue sharing Auth0 identity. [Install and connect plugins](https://learn.chatgpt.com/docs/plugins)

**Use the directory URL supplied by the publication portal.** Direct listing links are supported, but no Cerulean Crest listing URL exists yet in this investigation. Approval and publication are separate actions. Until publication, the wizard should retain saved preferences and explain that connection is not yet available; opening a link is not proof of connection. [Publication and discovery](https://developers.openai.com/plugins/deploy/app-review#publication-and-distribution)

## What is already present

Repository evidence, rather than a claim that the public installation flow has passed:

| Capability | Implementation and status |
| --- | --- |
| Production transport | `app/mcp/route.ts`: stateless Streamable HTTP, authenticated before requests reach the server. Production URL is `https://cerulean-crest.vercel.app/mcp`. |
| Resource discovery | `app/.well-known/oauth-protected-resource/route.ts`: resource, issuer, read/write scopes; 401 responses advertise it. Live unauthenticated metadata retrieval passed during this research. |
| User authorization | `lib/mcp-auth.ts`: verifies signature, issuer, audience, expiry and subject; rejects machine subjects; tools enforce edition scopes. Production OAuth does not fall back to the development bearer. |
| Private data | Edition and settings operations use the verified subject. Browser and MCP clients must remain on the same Auth0 tenant. |
| Editorial preferences | `get_editorial_brief` fetches the reader's current reading minutes, edition minutes, guidelines and timezone. Reading volume belongs here; schedule management remains external. |
| History | `get_recent_editions` returns source titles/URLs from up to fourteen recent editions for that reader. It does not return persisted reading status or a resurfacing queue. |
| Publication | `create_daily_edition` validates a complete edition and is idempotent for each reader/date; it does not replace an existing edition. |
| Curation instructions | `plugins/cerulean-crest/skills/curate-daily-edition/SKILL.md` already tells the agent to retrieve brief/history, research, deduplicate, curate and publish. |
| Local package | `.mcp.json` still targets localhost with a development bearer. This is not a public production package; do not upload it unchanged or give its token to readers. |

`docs/MCP.md` still contains historical owner-only statements. Use the current code and `docs/USER_ACCOUNTS.md` for the multi-user model until the runbooks are reconciled.

## Required gaps and verification work

| Work | Concrete acceptance criterion |
| --- | --- |
| Publisher identity | Decide individual versus business publisher; verify that identity in the selected OpenAI organization and confirm submission permissions. Status unknown; not inferable from Auth0 login. |
| Stable MCP origin | Decide whether to keep the Vercel MCP origin permanently or select a lasting domain before submission. See the constraint below. |
| Production OAuth in submission | Reuse the dedicated ChatGPT client or configure its public-listing equivalent. Enter credentials only into the portal's OAuth fields. Compare its exact redirect URI to Auth0's allowlist. |
| Fresh-user authorization | A new reader can consent to both edition scopes without an owner role or maintainer intervention; browser and MCP resolve to the same account. The multi-user runbook specifies removing the former API owner-role restriction; verify actual configuration and behavior. |
| Renewal and disconnection | Verify expiry/refresh and reconnection through the actual ChatGPT integration, plus rejection when authorization is no longer valid. Native-client tests do not establish ChatGPT behavior. |
| Tool scan | Scan the live authenticated endpoint using the review account, confirm all three tools, schemas and security metadata are accepted. Correct any errors on the server before rescanning. |
| Tool annotations | Reconsider `create_daily_edition.openWorldHint`, currently `true`: it writes only to the reader's private account and does not fetch sources or publicly publish. Proposed value is `false`, subject to checking all side effects. Keep `readOnlyHint: false`, `destructiveHint: false`, and `idempotentHint: true` for its current non-replacing behavior. |
| Verification endpoint | Add a publicly readable plain-text challenge route returning the exact portal-generated token; absent in the current route tree. |
| Public policies/support | Add real support, privacy and terms pages. Decide operator/contact, retention and deletion practices first; do not publish invented operational promises. No such routes were found. |
| Review account | Prepare isolated sample editions and preferences, with reviewer login that works without private-network access or interactive MFA/email challenges. Never provide the owner's account. |
| Review scenarios | Run the cases below in the actual supported ChatGPT surface and record expected/actual results. Existing unit tests alone are insufficient evidence. |
| Public package | Provide the production MCP URL through the submission flow and upload the curation skill; remove development-only assumptions from any distributed package. |

OAuth supports predefined clients; enabling dynamic registration or changing Auth0 is not necessary just to publish. Confirm PKCE S256, resource/audience binding, exact issuer/callback handling, supported token authentication, and enabled advertised scopes. For workspace domain restrictions, verify UserInfo returns a verified email with `openid`/`email` enabled. Live discovery currently advertises S256, issuer identification, UserInfo and those scopes; it does **not** prove individual client grants or verified-email responses. [OAuth requirements](https://developers.openai.com/plugins/build/auth)

The important domain constraint: **changing a published MCP origin requires a new plugin and review/publication**; changing only its endpoint path uses a new version. Thus a configurable website base URL does not make the directory integration equally portable. An EU Auth0 tenant is unrelated to OpenAI project residency; the current review guide excludes EU-data-residency OpenAI projects for MCP submissions. Review duration is unspecified. It also asks developers to coordinate plugin launch announcements with OpenAI communications; that has not been done. [Review and maintenance requirements](https://developers.openai.com/plugins/deploy/app-review)

Privacy materials should cover account identity, reading preferences, edition contents and any persisted activity, recipients, retention, and user controls. The server must not reconstruct full chat histories. We should send only task-relevant information, not import a person's entire memory/profile. A free beta still needs a functional, reliable workflow; “experiment” is not a substitute for review readiness. [Plugin guidelines](https://developers.openai.com/plugins/app-guidelines)

## MCP expansion: necessary versus optional

**No additional tool is established as a publication requirement.** Finish and verify the existing contract first.

Recommended product improvements, separate from the directory gate:

- Return a structured preferences object alongside the textual editorial brief, so the agent can reliably explain the saved choices. Current JSON-in-string output works but is less convenient.
- Add an explicit `update_editorial_preferences` tool later if we want ChatGPT to propose and save interests after user approval. Treat it as a scoped write, validate fields, and never accept arbitrary account IDs. This avoids forcing users to compose an elaborate editorial prompt while keeping the app's brief authoritative.
- If connection verification is needed in the wizard, design an explicit, account-bound handshake. A user checkbox or a successful browser session proves neither installation nor MCP connection. A past tool request establishes only past access, not a currently valid link. Do not silently turn the existing read-only brief tool into a connection-state mutation.
- Persist explicit “include in a future edition” feedback and expose it with history when that feature is built. Unread or unmarked articles must not automatically become a queue. This is editorial functionality, not a prerequisite for publishing the initial three tools.
- Custom embedded UI, `search`/`fetch` tools for a separate retrieval use case, and an in-app scheduler are not needed for this initial curation workflow.

## Scheduling and personalization boundaries

Current official documentation supports web scheduled tasks using plugins, connected tools and skills, and explicitly describes ChatGPT Work plugin workflows. Keep scheduling in ChatGPT. Test the prompt interactively before scheduling and inspect the first runs; available tools, workspace permissions and runtime matter. [Scheduled tasks](https://learn.chatgpt.com/docs/automations)

Publication does not prove unattended Cerulean writes, token refresh or available research context. Our acceptance gate remains three real unattended runs for a fresh reader with correct ownership, current preferences, source research, private links and no unexpected approval interruption. We have not performed those runs here. Do not promise that arbitrary historical chats or memory will be available: saved app preferences are the reliable starting point, supplemented only by context the host actually supplies.

## Proposed review cases

These are repository-specific test designs to prepare, not completed test results. Use disposable review fixtures and record exact prompts, fixture dates and observed output.

| Type | Scenario | Expected result |
| --- | --- | --- |
| Positive 1 | “Show my Cerulean Crest editorial brief.” | Current saved budget, guidelines and timezone, no other reader's data. |
| Positive 2 | “Check my recent Cerulean Crest editions before selecting anything.” | Only this account's source history, empty list valid for a new account. |
| Positive 3 | “Create today's Cerulean Crest edition.” | Fetch brief/history, research real sources, create once, return private link. |
| Positive 4 | Repeat creation for the same date. | Existing edition returned unchanged; no duplicated sections/items. |
| Positive 5 | Change volume/guidelines on the website, then request the brief and next available fixture-date edition. | Agent receives the revised values and uses them. |
| Negative 1 | Request another reader's editions. | No access or owner override; own-account data only. |
| Negative 2 | “Replace my existing edition.” | Explain unsupported replacement; do not disguise replacement as creation. |
| Negative 3 | Attempt publication without write scope or with expired credentials. | Authorization challenge/reconnection; no edition written. |

Also test malformed payloads, foreign-audience tokens, source failures, timezone boundaries, reconnecting with a different account, and plugin removal versus OAuth disconnection. [Connection testing guidance](https://developers.openai.com/plugins/deploy/connect-chatgpt)

## Order of work

1. Resolve publisher identity, OpenAI organization/project, stable MCP hostname, support contact, countries, and retention/deletion commitments with the owner. These are the material missing facts.
2. Prepare the policies, challenge route, production package/skill, corrected tool metadata and review fixtures. Reconcile historical runbooks.
3. Run a fresh-reader ChatGPT OAuth and first-edition rehearsal; fix functional gaps before submitting. Keep interest entry lightweight and editable.
4. Complete the portal draft, scan tools, run the reproducible cases, and review the concrete listing/materials with the owner before submission. Portal identity verification is an interactive account step; use CLIs for provider/deployment work where supported.
5. After approval, publish and use the resulting directory URL in the onboarding configuration. Verify install → consent → first edition with a fresh account.
6. Verify scheduled delivery separately, then update announcement claims to match the demonstrated experience.
