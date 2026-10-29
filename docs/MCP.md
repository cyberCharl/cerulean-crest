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

The Markdown constitution is stored in the reader's existing settings JSON. Onboarding creates it from a short description and optional starting topics. Older accounts without one see a generated document based on their legacy guidelines and topics; saving in Settings or through MCP makes it persistent. Reading minutes and timezone remain separate structured settings so their current values are included on every brief read. Delivery frequency and time are saved for the onboarding handoff but scheduling runs in ChatGPT.

The older files under `instructions/` are single-reader material and are not distributed as the plugin or automatically included in another reader's brief. The general editorial principles informed the initial template. Personal priorities and long-term-interest files need deliberate per-reader import or editing in Settings; they are never copied to newly signed-up accounts.

Recent history, reading candidates, article feedback and friend recommendations are contextual data. The server fetches them for the authenticated reader on each read, without writing them into the constitution or maintaining an inferred profile. Bookmarks without reactions or notes are excluded from the article-feedback section, but saved links can appear in reading candidates. Pending friend recommendations already included, marked read or previously dismissed are excluded from the recommendations section. Notes, titles and source content are untrusted data, not authorization to edit policy or call tools.

`readingCandidates` contains `candidates` (up to 100 eligible saved links, ordered by pinned, later, then candidate commitment) and `excludedUrls` (up to 1,000 read, dormant or deferred URLs). Eligibility is for the next edition; the curator uses these fields rather than inferring eligibility from unread status or dates. Consider relevant saved candidates alongside fresh discovery and never reselect an excluded URL. The bounded response is context, not a complete export of the collection.

Publication is not exposure. A URL appearing in `recentEditions` may have been inside an edition the reader never opened. Eligible links may therefore appear again; recent history is not a blanket URL exclusion list. The website records front-page and inside-page presentation independently. When an edition retires, exposed ordinary candidates become dormant, pinned links retain their commitment, and later links wait until their eligible edition. Unseen inside links remain eligible. The curator aims for one substantial article and two or three shorter pieces with optional reading inside; the website controls placement and presentation. No MCP tool changes a saved link's commitment, marks it read or records exposure.

Constitution saves from MCP and Settings use an atomic conditional write in both database backends. If another writer changes the policy after it was read, the stale save is rejected; unrelated reading and appearance settings are preserved.

The final edition schema validates a real date, complete nonempty sections and items, safe source URLs, required metadata, and bounded positive reading minutes. It no longer requires `availableMinutes` to match the sum of item estimates within two minutes. The constitution and skill tell the curator to let strong sources determine the final volume; qualitative editorial rules remain agent guidance. A saved link can have unknown reading time, while final publication still requires a supportable estimate. The server stores the reader's link collection; the agent's additional research list remains internal. No candidate submission or link-capture MCP endpoint is added.

## Local inspection

Set `CERULEAN_MCP_AUTH_MODE=pilot`, `CERULEAN_MCP_TOKEN`, and `CERULEAN_OWNER_SUBJECT` in a development environment, start `npm run dev`, and connect MCP Inspector to `http://localhost:3000/mcp` with `Authorization: Bearer <development token>`. Initialize, list the four tools, read the curation brief, read the constitution-only document, make an exact test edit with its revision, publish a complete test edition, and repeat the publication call to confirm `already_exists`. Never put the bearer token in a ChatGPT task prompt. Production ChatGPT connection uses OAuth, not the local pilot bearer.

For reading-state checks, prepare pinned, later, dormant and read fixtures plus an unseen inside-page link from a recent edition. Verify candidate/exclusion results stay owner-scoped, the unseen eligible link is not excluded merely by history, and ordinary curation leaves the constitution unchanged. These checks add no MCP tool names.

The public plugin listing and a fresh ChatGPT authorization, first edition, and recurring run still need live verification before treating the onboarding handoff as complete. See [publication preparation](CHATGPT_PUBLICATION.md).
