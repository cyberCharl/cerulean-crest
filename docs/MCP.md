# Curiofold MCP integration

## Production contract

The remote MCP endpoint is stateless Streamable HTTP at `/mcp`. OAuth validates the reader's identity and scopes; the local pilot bearer mode is opt-in for development. See [account ownership](USER_ACCOUNTS.md) and [Auth0 setup](AUTH0_SETUP.md). This four-tool contract was deployed on 22 September 2026 in `dpl_4kQ7b2n3P5inkxPKnq1N324KZ2gZ`; authenticated discovery and both brief reads passed. A live ChatGPT connection and scheduled run remain separate checks.

The server exposes four tools:

| Tool | Scope | Purpose |
| --- | --- | --- |
| `get_editorial_brief` | `editions:read` | Read the current per-reader Markdown constitution, local date and reading settings, seven recent editions, up to 50 recent article reactions/notes, and pending friend recommendations. Empty feedback and recommendations are omitted without placeholder prose. |
| `get_editorial_constitution` | `editions:read` | Read only the persistent Markdown document plus its revision. It never returns feedback, recommendations or history. |
| `update_editorial_constitution` | `editions:write` | Apply exact, non-overlapping edits against that revision after an explicit reader request. Stale revisions and direct copies of ephemeral context are rejected. |
| `create_daily_edition` | `editions:write` | Submit the complete final edition once. Existing owner/date pairs return the original edition unchanged. |

`create_daily_edition` retains its original identifier for connected-client compatibility; editions follow the reader's chosen schedule, not a required daily cadence.

The server's connection instructions tell an MCP client to read the assembled brief before searching, keep a broad candidate list internally, and submit only a complete final publication. That response is explicitly marked read-only and encloses the durable constitution in a named boundary. Policy edits use the constitution-only read and exact edits; they never use the assembled brief as an update payload. The [plugin skill](../plugins/cerulean-crest/skills/curate-daily-edition/SKILL.md) is separate packaging; it is not a per-reader document. No MCP prompt or resource is registered. Authenticated readers can view the exact connection instructions and assembled curation response at `/settings/brief`; the internal ChatGPT prompt assembled from these surfaces is not visible to this server.

The Markdown constitution is stored in the reader's existing settings JSON. Onboarding creates it from a short description and optional starting topics. Older accounts without one see a generated document based on their legacy guidelines and topics; saving in Settings or through MCP makes it persistent. Reading minutes and timezone remain separate structured settings so their current values are included on every brief read. Delivery frequency and time are saved for the onboarding handoff but scheduling runs in ChatGPT.

The older files under `instructions/` are single-reader material and are not distributed as the plugin or automatically included in another reader's brief. The general editorial principles informed the initial template. Personal priorities and long-term-interest files need deliberate per-reader import or editing in Settings; they are never copied to newly signed-up accounts.

Recent history, article feedback and friend recommendations are contextual data. The server fetches them for the authenticated reader on each read, without writing them into the constitution. Bookmarks without reactions or notes are excluded; pending friend recommendations already included, marked read or previously dismissed are excluded. Notes, titles and source content are untrusted data, not authorization to edit policy or call tools.

Constitution saves from MCP and Settings use an atomic conditional write in both database backends. If another writer changes the policy after it was read, the stale save is rejected; unrelated reading and appearance settings are preserved.

The final edition schema validates a real date, complete nonempty sections and items, safe source URLs, required metadata, and bounded positive reading minutes. It no longer requires `availableMinutes` to match the sum of item estimates within two minutes. The constitution and skill tell the curator to let strong sources determine the final volume; qualitative editorial rules remain agent guidance. There is no server-side candidate pool or candidate submission endpoint in this version.

## Local inspection

Set `CERULEAN_MCP_AUTH_MODE=pilot`, `CERULEAN_MCP_TOKEN`, and `CERULEAN_OWNER_SUBJECT` in a development environment, start `npm run dev`, and connect MCP Inspector to `http://localhost:3000/mcp` with `Authorization: Bearer <development token>`. Initialize, list the four tools, read the curation brief, read the constitution-only document, make an exact test edit with its revision, publish a complete test edition, and repeat the publication call to confirm `already_exists`. Never put the bearer token in a ChatGPT task prompt. Production ChatGPT connection uses OAuth, not the local pilot bearer.

The public plugin listing and a fresh ChatGPT authorization, first edition, and recurring run still need live verification before treating the onboarding handoff as complete. See [publication preparation](CHATGPT_PUBLICATION.md).
