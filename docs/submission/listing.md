# Listing draft

Status: copy prepared for review; use only after the stated features are deployed and the reviewer cases pass. `[PRODUCT]`, `[PUBLISHER]` and `[ORIGIN]` are deliberate unresolved inputs.

| Portal field | Proposed value |
| --- | --- |
| Name | `[PRODUCT]` (working name: Cerulean Crest) |
| Short description | A finite daily reading edition, shaped by your interests. |
| Category | Productivity, if offered by the portal |
| Developer identity | `[PUBLISHER]`, exactly as verified in the selected OpenAI organization |
| Website | `[ORIGIN]/` |
| Support | `[ORIGIN]/support` — proposed route; publish the finished page first |
| Privacy | `[ORIGIN]/privacy` — proposed route; publish the finished page first |
| Terms | `[ORIGIN]/terms` — proposed route; publish the finished page first |
| MCP type | Universal |
| MCP endpoint | `[STABLE_MCP_ORIGIN]/mcp` |
| Authentication | OAuth with the existing Auth0 identity system; credentials entered privately in the portal |
| Logo | Final product asset; existing `app/icon.png` is a working candidate, not final branding |
| Countries | `[OWNER-APPROVED AVAILABILITY]` |

## Long description

[PRODUCT] helps you turn your interests into a finite personal reading edition. Ask ChatGPT to consult your saved editorial brief and recent editions, research suitable sources, and save a new edition to your private reader. Each selection links to its source and includes a short explanation of why it is worth your time.

Set your reading budget and editorial guidelines on the website, or ask ChatGPT to update them. Explicit changes are saved to the same settings you can review and edit yourself. In the reader, save articles for later and use “Tell the editor” to leave a reaction or private note. During curation, that feedback provides context for future selections; saving alone is not a request for more of a topic.

An account and connected authorization are required. Editions are private to your account. The connected host supplies research capabilities; [PRODUCT] stores your preferences, feedback and editions. Scheduling is arranged separately in the host and depends on its supported capabilities.

## Starter prompts

1. Create today's [PRODUCT] edition using my saved editorial brief.
2. Show me my current editorial preferences and reading budget.
3. Update my editorial guidelines to prefer original scientific research and fewer startup announcements; keep my reading budget unchanged.
4. Before curating, review the feedback I left through Tell the editor.

## Initial release notes

Initial submission of [PRODUCT], a personal reading service with a remote MCP server and a curation skill. The integration retrieves the authenticated reader's editorial brief, recent edition history and article feedback, creates private daily editions, and updates explicit editorial preferences when requested. The companion website provides settings, saved articles and private article feedback.

The reviewer guide includes account setup, reproducible positive and negative cases, and expected outcomes. Source discovery happens through the host's research tools. Same-date edition creation returns the existing edition instead of replacing it. No public publication, purchases, messages to other people or in-app scheduling are offered by this submission.

Before pasting these notes, replace the product name and verify that the deployed tool scan includes all listed capabilities. Do not submit planned functionality as available functionality.
