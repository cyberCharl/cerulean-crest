# Publishing Cerulean Crest for ChatGPT

Research checked 18 September 2026 against current official OpenAI documentation and this repository. This is a preparation plan, not a submitted or approved listing. No provider configuration or publication was changed during this review.

## Prepared submission materials

The [submission packet](submission/README.md) now contains listing copy, release notes, public-policy/support drafts, reviewer account setup and seven positive plus five negative review scenarios. The policy drafts remain internal until operator, contact, retention/deletion and regional details are resolved. No live review case is recorded as passed.

The domain challenge route is implemented at `/.well-known/openai-apps-challenge`: set `OPENAI_APPS_CHALLENGE` to the exact portal token in the intended deployment and redeploy. It returns 404 until configured. Name/domain selection, verified publisher identity, public policy pages, reviewer credentials and production rehearsal remain outstanding.

## Recommended route

Publish a **plugin with the existing remote MCP server and the curation skill**. Current OpenAI documentation uses “plugins” for the shared ChatGPT/Codex directory; this is not the old ChatGPT plugin manifest system. The initial tools cover the core curation workflow; the current implementation work adds explicit preference updates and editorial-feedback retrieval. Scan the final deployed tool set before submission. We do not need to rebuild the reader inside ChatGPT. [Plugin overview](https://developers.openai.com/plugins)

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
| Editorial preferences | `get_editorial_brief` fetches the reader's current reading minutes, edition minutes, guidelines, interests and timezone, including structured preferences. `update_editorial_preferences` changes only explicitly supplied supported fields for the authenticated reader, reflected in Settings. |
| Article feedback | `get_editorial_feedback` retrieves bounded recent reactions/private notes for the authenticated reader. Saved-only articles are excluded; these soft signals do not rewrite explicit policy. |
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
| Tool scan | Scan the live authenticated endpoint using the review account, confirm the full deployed tool set, schemas and security metadata are accepted. Correct any errors on the server before rescanning. |
| Tool annotations | The implementation now marks account-bounded edition creation `openWorldHint: false`, `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true`. Preference updates are write/destructive because they overwrite specified values. Confirm these annotations in the final live scan. |
| Verification endpoint | Route implemented; set `OPENAI_APPS_CHALLENGE` to the portal-generated token, deploy, and verify the exact anonymous response on the selected origin. |
| Public policies/support | Drafts prepared in `docs/submission/policy-drafts.md`. Resolve operator/contact, retention, deletion and region details, then publish real pages. No public policy/support routes have been added. |
| Review account | Prepare isolated sample editions and preferences, with reviewer login that works without private-network access or interactive MFA/email challenges. Never provide the owner's account. |
| Review scenarios | Run the cases below in the actual supported ChatGPT surface and record expected/actual results. Existing unit tests alone are insufficient evidence. |
| Public package | Provide the production MCP URL through the submission flow and upload the curation skill; remove development-only assumptions from any distributed package. |

OAuth supports predefined clients; enabling dynamic registration or changing Auth0 is not necessary just to publish. Confirm PKCE S256, resource/audience binding, exact issuer/callback handling, supported token authentication, and enabled advertised scopes. For workspace domain restrictions, verify UserInfo returns a verified email with `openid`/`email` enabled. Live discovery currently advertises S256, issuer identification, UserInfo and those scopes; it does **not** prove individual client grants or verified-email responses. [OAuth requirements](https://developers.openai.com/plugins/build/auth)

The important domain constraint: **changing a published MCP origin requires a new plugin and review/publication**; changing only its endpoint path uses a new version. Thus a configurable website base URL does not make the directory integration equally portable. An EU Auth0 tenant is unrelated to OpenAI project residency; the current review guide excludes EU-data-residency OpenAI projects for MCP submissions. Review duration is unspecified. It also asks developers to coordinate plugin launch announcements with OpenAI communications; that has not been done. [Review and maintenance requirements](https://developers.openai.com/plugins/deploy/app-review)

Privacy materials should cover account identity, reading preferences, edition contents and any persisted activity, recipients, retention, and user controls. The server must not reconstruct full chat histories. We should send only task-relevant information, not import a person's entire memory/profile. A free beta still needs a functional, reliable workflow; “experiment” is not a substitute for review readiness. [Plugin guidelines](https://developers.openai.com/plugins/app-guidelines)

## MCP expansion: necessary versus optional

**No additional tool is established as a publication requirement.** The user has separately authorized saving, article feedback and explicit preference edits as product features for this release. Verify the final implemented contract.

Product scope and remaining options:

- Structured preferences now accompany the textual editorial brief, allowing the agent to explain saved choices without parsing the prose brief.
- Implement `update_editorial_preferences` as an explicit-request, scoped write, reflected in Settings. Validate fields, preserve omitted values and never accept arbitrary account IDs. `get_editorial_feedback` separately returns reactions/article notes for conservative curation adjustments. Save is not an editorial reaction; feedback must not silently rewrite explicit settings.
- If connection verification is needed in the wizard, design an explicit, account-bound handshake. A user checkbox or a successful browser session proves neither installation nor MCP connection. A past tool request establishes only past access, not a currently valid link. Do not silently turn the existing read-only brief tool into a connection-state mutation.
- Persist explicit “include in a future edition” feedback and expose it with history when that feature is built. Unread or unmarked articles must not automatically become a queue. This future resurfacing queue is separate from the currently authorized saving and feedback features and is not a submission prerequisite.
- Custom embedded UI, `search`/`fetch` tools for a separate retrieval use case, and an in-app scheduler are not needed for this initial curation workflow.

## Scheduling and personalization boundaries

Current official documentation supports web scheduled tasks using plugins, connected tools and skills, and explicitly describes ChatGPT Work plugin workflows. Keep scheduling in ChatGPT. Test the prompt interactively before scheduling and inspect the first runs; available tools, workspace permissions and runtime matter. [Scheduled tasks](https://learn.chatgpt.com/docs/automations)

Publication does not prove unattended Cerulean writes, token refresh or available research context. Our acceptance gate remains three real unattended runs for a fresh reader with correct ownership, current preferences, source research, private links and no unexpected approval interruption. We have not performed those runs here. Do not promise that arbitrary historical chats or memory will be available: saved app preferences are the reliable starting point, supplemented only by context the host actually supplies.

## Proposed review cases

Use the expanded [reviewer guide](submission/reviewer-guide.md) for this release, including explicit preference changes, Saved and Tell the editor. The baseline cases below remain useful but do not cover all newly added features.

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
