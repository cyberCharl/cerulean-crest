# Launch review — 7 September 2026

Cerulean Crest already has a working public reader. The next milestone is a reliable personal daily publishing loop. Public onboarding needs a further stage of authentication, ownership, and plugin distribution work.

This review covers the current checkout, including the uncommitted MCP implementation, the live site, Vercel project configuration, and read-only database inspection. No application code, production content, or deployment settings were changed.

## Verified state

| Area | Evidence | Assessment |
| --- | --- | --- |
| Hosting | Vercel project `cerulean-works/cerulean-crest`; production deployment `dpl_28LVrRh7VbQXMiRFHykHZr3jVmRS`, Ready, created 1 September; deployed functions in `fra1`; project Node runtime 24.x | Already deployed |
| Public reader | `/` redirects to `/issues/2026-09-01`; issue and archive return 200; browser archive navigation and reading progress across reload work | Usable |
| Content | Live archive and configured Postgres database contain one edition, 1 September, with seven sections and 12 items | Daily delivery is not demonstrated |
| Manual publishing | Production authenticated GET succeeds with the documented Keychain credential; local HTTP create/replace return 201/200, date mismatch 409, invalid duration 422 | Recovery path is implemented; production writes were not exercised |
| MCP | Local HTTP initialization, discovery, brief retrieval, create, duplicate preservation, API readback, and public issue rendering all pass | Pilot implementation works with SQLite |
| Production MCP | `/mcp` returns 404; Vercel has no `CERULEAN_MCP_TOKEN` variable | Not deployed or configured |
| Git deployment | Local project association exists; Vercel project API returns `link: null`; origin is `cyberCharl/cerulean-crest` | Git-based deployment is not connected |
| Environment separation | One database URL entry and one publishing credential entry each target Production, Preview, and Development, without a branch override | Preview writes currently risk production data |
| Checks | Nine tests pass; typecheck and production build pass; `npm audit --omit=dev` reports zero known vulnerabilities | Good baseline; tests do not cover production Postgres writes |

The build and tests ran on local Node 25.8.2. Vercel uses Node 24.x, so CI should use 24.x. The HTTP write checks used a temporary SQLite database with explicit database URL overrides. The existing `.env.local` selects Postgres, despite the README's general description of local SQLite development.

The local `.env` publishing credentials were rejected by production; the separate credential in the documented Keychain service succeeded. Keep that distinction explicit in the publishing runbook.

## Findings that affect launch

**1. Move OAuth ahead of the ChatGPT pilot.** The current [MCP authentication](../lib/mcp-auth.ts) accepts a shared bearer secret. That works with a client capable of setting custom headers, as the local HTTP test demonstrated. OpenAI's current authentication documentation says ChatGPT cannot present custom API keys. Implement OAuth before testing the actual ChatGPT connection, even for a single-owner trial; the current ADR places it only before external onboarding. Use an established provider with MCP discovery and authorization-code/PKCE support, validate issuer/audience/expiry/scopes, and initially allow only the owner's identity. [OpenAI authentication documentation](https://developers.openai.com/plugins/build/auth).

**2. The scheduled workflow remains a product hypothesis.** The repository has a workflow skill and proposed prompt, but no recorded successful scheduled runs. External ChatGPT schedules were not inspected. Current official documentation supports plugins and connected tools in scheduled web tasks, but that does not prove this plugin's write approvals, personalization, or account eligibility. Complete a manual run, then the ADR's three unattended scheduled runs. Verify source quality, local date, persistence, retry behavior, and notification delivery. [Scheduled tasks documentation](https://learn.chatgpt.com/docs/automations).

**3. Invalid dates reach Postgres and produce 500s.** Reproduced against production with `/issues/not-a-date` and `/issues/2026-02-31`. The [schema](../lib/schema.ts) checks date shape only and also accepts `2026-13-01` and `2026-99-99`. Validate real calendar dates at every date-taking boundary, before database access, including public page metadata and authenticated GET. Invalid public routes should return 404; invalid publishing payloads should return 422.

**4. Article links accept non-web schemes.** A direct schema probe accepted `javascript:alert(1)`, `data:text/html,example`, and `ftp://example.com/file`. Restrict source links to HTTP(S), preferably HTTPS where available. This is a confirmed contract defect; no claim of an executed browser exploit is made.

**5. Concurrent Postgres creates can return an error instead of the existing edition.** In [createIssueInternal](../lib/postgres-db.ts), the insert uses `ON CONFLICT DO NOTHING`, followed by a fallback SELECT in the same SQL statement. A concurrent insert can cause the conflict while its row remains invisible to that statement's snapshot, leaving `rows[0]` absent. The implementation then throws. This is a code-review finding supported by PostgreSQL's documented isolation behavior, not a reproduced production race. Add a fresh-statement lookup/bounded retry for this outcome and test concurrent creates against isolated Postgres; both callers should succeed and exactly one complete edition should remain. [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

**6. Replacement can invalidate reading progress.** Both storage implementations recreate item IDs on replacement, while [IssueContent](../components/issue-content.tsx) stores read state using those IDs. Old IDs remain in the displayed count even when no current item matches. This follows from code inspection; only ordinary read/reload behavior was tested in the browser. Preserve stable item identity or version/reset progress, intersect stored IDs with current items, and handle failed localStorage writes.

**7. Public consumer isolation is absent.** Storage has one globally unique issue date, no owner column, and public issue/archive routes. Adding OAuth to `/mcp` alone would not isolate magazines. Before inviting others, scope database queries, uniqueness, navigation, read access, and recovery publishing to the authenticated owner. Make sharing an explicit product choice. A second user publishing the same date must neither receive nor alter the first user's edition.

## Recommended implementation order

| Step | Work | Completion criterion |
| --- | --- | --- |
| 1. Establish a safe release environment | Separate preview/development Postgres and publishing credentials; align local/CI runtime with Vercel Node 24; preserve and commit the existing MCP work; connect the intended GitHub repository if automatic deployment is wanted | Preview writes cannot affect production; a clean checkout passes checks and produces a traceable deployment |
| 2. Harden publishing | Fix calendar and URL validation, concurrent create recovery, and replacement progress; retain HTTP checks as integration tests; exercise create, duplicate, replace, and rollback on isolated Postgres | Invalid input cannot reach storage; duplicate and concurrent submissions leave exactly one complete edition |
| 3. Deploy an owner-only connection | Deploy `/mcp`; configure a dedicated token only if retaining an Inspector/Codex transport pilot; implement OAuth for ChatGPT and restrict it to the owner; update the ADR and setup docs | A real authenticated ChatGPT invocation retrieves the brief, creates an edition, and returns its production URL |
| 4. Prove daily delivery | Make the owner's timezone and preferences available to the task; expose the current local date/timezone in the brief; run one manual curation followed by three scheduled runs; document bounded retries and manual recovery | Three editions appear at the intended time without per-run intervention, with valid sources and successful notifications |
| 5. Add operating checks | Record publication outcomes without credentials; alert on a missed edition after its delivery deadline; show a clear latest-available notice when today is missing; document database restore and deployment rollback | A missed or failed publication is detected, and the owner has a tested recovery procedure |
| 6. Open to other users | Add accounts, owner-scoped persistence and reader access, onboarding preferences, and cross-user isolation tests; retire the shared production MCP token | Two users can publish/read the same date independently; revoked access stops working |
| 7. Publish the plugin publicly | Prepare verified publisher identity, logo/listing, website/support/privacy/terms pages, MCP domain verification, reviewer access, and required positive/negative cases; submit and publish after approval | A new user can discover, connect, authorize, and successfully use the plugin |

Public plugin submission currently requires a verified developer/business identity, listing and support/policy materials, MCP domain verification, accurate tool metadata, and five positive plus three negative test cases. The checked-in plugin manifest is a starting package, not evidence of a public listing. [OpenAI submission requirements](https://developers.openai.com/plugins/deploy/submission).

## Follow-on work

- Move schema setup out of the request path into versioned migrations before ownership changes. The current Postgres module runs DDL during each new process's first access and caches a failed initialization promise indefinitely. Make demo seeding explicit and allow recovery from transient initialization failures.
- Add recent-edition context for the curator if avoiding repeat recommendations across days is part of the experience. The current MCP surface exposes only the brief and create operation.
- The application stores and presents externally generated editions. It does not implement platform ingestion, ranking jobs, or a feedback-driven recommender. Those remain later product work in the roadmap.
- EPUB exists as a script tied to the 25 August example, not an integrated per-edition export. If EPUB is still a launch requirement, generalize it to stored issues and add a download route; otherwise keep it out of the daily website milestone.
- Keep subscription-memory personalization as an explicitly tested assumption. The static brief instructs the agent to use personal context, but the application does not ensure that the chosen scheduled environment has it.

The next development slice should complete steps 1–3, then run the scheduled pilot before expanding into the multi-user product.
