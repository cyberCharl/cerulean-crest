# ADR 0001: Publish scheduled editions through an MCP app

- Status: Accepted
- Date: 2026-09-04

## Context

Cerulean Crest needs to let a person's existing ChatGPT subscription create a personalized daily edition using that account's memory, past conversations, and available research tools. The scheduled ChatGPT environment cannot run arbitrary outbound `curl` commands. Scheduled tasks also cannot use custom GPTs, so a GPT Action cannot bridge the gap.

Transporting generated JSON through GitHub or email would use those products as accidental message queues. Those approaches add unrelated accounts and permissions, leak the publishing contract into intermediary systems, and do not form a credible multi-user architecture.

Current ChatGPT scheduled tasks can use supported connected apps. OpenAI's supported integration boundary for a service-owned action is a remote Model Context Protocol (MCP) server, distributed as an app-backed plugin.

## Decision

Build a Cerulean Crest plugin backed by a remote MCP endpoint on the existing application.

The initial tool surface is deliberately narrow:

1. `get_editorial_brief` returns the stable editorial constraints needed to compose an edition.
2. `create_daily_edition` accepts the existing complete issue schema, validates it server-side, creates the dated edition, and returns its canonical URL.

`create_daily_edition` is create-only and idempotent. A second call for the same owner and date must return the existing edition without replacing it. The existing Basic-authenticated PUT remains available for the current manual publisher, where explicit replacement is useful.

The MCP server uses Streamable HTTP at `/mcp`. During the single-user technical pilot it uses a dedicated bearer secret (`CERULEAN_MCP_TOKEN`) so the transport and tool contract can be tested without weakening the existing publisher. This token is not the public authentication design.

Before external onboarding, replace pilot authentication with OAuth 2.1 and derive ownership from the validated token. Add tenant scoping so issue uniqueness becomes `(owner_id, issue_date)`. The model must never supply or choose an owner identifier.

September 2026 implementation clarification: OAuth is required before the actual ChatGPT pilot, not only before external onboarding, because ChatGPT cannot supply the custom bearer secret. The resource server validates an external provider's tokens and permits one configured owner subject. The bearer pilot remains explicitly opt-in for clients that support custom headers. Tenant scoping is a separate gate before admitting additional owners.

Package the editorial workflow with the plugin, while also keeping the runtime brief available through a read tool. Scheduled-task instructions should remain short and should not depend on ChatGPT Project files.

## Consequences

- Generation uses the user's ChatGPT plan rather than Cerulean Crest model API spend.
- Personalization can draw on the user's own ChatGPT context without Cerulean Crest importing their chat history.
- Cerulean Crest owns a small, explicit integration contract instead of accepting arbitrary network access.
- A single remote MCP implementation can later be offered to other MCP clients after their unattended scheduled-write behavior is verified.
- Public consumer distribution requires OAuth, multi-user persistence, plugin review, public policy/support pages, and successful unattended-write testing.
- ChatGPT may pause a scheduled run when it requires approval for a write action. A pilot must prove persistent approval behavior before this becomes a product promise.

## Rejected alternatives

- **Custom GPT Action:** custom GPTs are unsupported in scheduled tasks.
- **GitHub files:** creates repository-per-user or shared-repository tenancy and turns source control into a queue.
- **Gmail or Slack payload transport:** possible through supported apps, but adds unrelated onboarding and brittle parsing.
- **Local personal agent/OpenClaw:** useful for power users but conflicts with low-friction consumer onboarding.
- **Browser automation:** fragile, difficult to secure, and not a durable integration contract.
- **Server-side model API as the primary path:** scalable, but loses native subscription memory and introduces separate inference billing. It remains the fallback if unattended MCP writes are not reliable.

## Validation gates

1. MCP Inspector can initialize the server, list both tools, reject invalid issue inputs, and create one test edition.
2. Repeating the same tool call leaves the first edition unchanged.
3. An eligible ChatGPT workspace can invoke the tool manually through the connected app.
4. Three scheduled runs complete without requiring per-run approval.
5. OAuth and owner-scoped storage ship before any external user is invited.
