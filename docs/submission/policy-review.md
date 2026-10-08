# Policy implementation review — 8 October 2026

The `/privacy`, `/terms` and `/support` routes now exist, but **are not finalized public policies or a working support channel**. This change does not establish a submitted/approved/published ChatGPT listing. The external portal status was not checked.

## Reviewing the pages

Set `POLICY_REVIEW_ENABLED=true` locally and run `npm run dev`, or enable it only in a Vercel **preview** environment. Open all three routes and their footer links, including at mobile width. Drafts have visible review status, no effective date, unresolved decisions, `noindex, nofollow` metadata/headers and `private, no-store` headers.

Without explicit opt-in, routes show only a not-yet-available notice. `VERCEL_ENV=production` overrides the flag. A production build outside Vercel also cannot display drafts unless explicitly identified as a preview environment. Do not set `VERCEL_ENV=preview` on a production server. These flags are review controls, not confidentiality controls: anyone with access to an enabled preview can read the drafts. Use deployment protection if needed.

There is deliberately no “publish policies” configuration switch. Finalization requires reviewing and changing the content and release gate in code, deploying, and verifying the adopted pages anonymously. Production remains blocked from showing draft terms even if the review flag is accidentally enabled. Footer draft links appear only during review; do not use the holding pages as submission evidence.

## Implementation evidence and corrections to earlier drafts

These are code observations at the branch base, not proof of deployed provider configuration.

| Disclosure | Evidence |
| --- | --- |
| Auth0 subject, name/email in browser session | `lib/browser-auth.ts`; sessions supplied by Auth0 SDK |
| Settings, constitution, budgets, timezone, delivery preferences, onboarding/theme | `lib/editorial-settings.ts`, `lib/db.ts`, `app/settings/page.tsx` |
| Owner-scoped editions and their article/summary fields | `lib/schema.ts`, `lib/db.ts`, `lib/postgres-db.ts`, `lib/sqlite-schema.ts` |
| Saved records, reactions/notes and narrower clear/unsave controls | `lib/article-feedback.ts`, `app/saved/actions.ts`, `components/article-actions.tsx`; cleared records can retain metadata |
| Opt-in friends, requests/relationships, shared URLs/titles/notes and reading status | `lib/social-engine.ts`, `lib/social.ts`, `lib/sqlite-schema.ts`, `app/friends/actions.ts` |
| Reading marks are not exclusively local | `components/issue-content.tsx`: browser localStorage plus `syncSharedArticleReads` and `setSharedArticleReadFromReader` |
| Connected host receives constitution/context, seven editions, up to 50 feedback records and pending friend recommendations | `lib/assembled-editorial-brief.ts`, `lib/mcp-server.ts` |
| Constitutional edits separate from transient context; connected edition creation is idempotent | `lib/editorial-constitution-update.ts`, `lib/mcp-server.ts` |
| PostgreSQL/Neon driver or SQLite, Vercel database requirement | `lib/db.ts`, `lib/postgres-db.ts`, `lib/sqlite-db.ts` |
| Operational events exist; infrastructure logs unknown | `app/api/health/route.ts`, `app/api/issues/[date]/route.ts`, `lib/mcp-server.ts` |
| No complete account deletion/retention workflow found | Inspected app routes/actions, database interface, schema and social storage; no provider deletion or retention job established |

The older drafts' “no public sharing/friends” and “reading progress uses browser storage” statements cannot be adopted unchanged. Editions remain owner-private, but individual friend shares and their status persist on the server. Removing a friendship has narrower database effects; it is not a complete account deletion procedure. Driver choice does not establish provider regions or backup policy. A valid JWT check does not prove instant revocation after host disconnection.

## Owner decisions and operational work before adoption

| Required decision | Concrete completion work |
| --- | --- |
| Individual/business operator | Confirm legal identity and required address/contact information; match publisher verification and listing. No inference from GitHub username or brand. |
| Support/privacy channel | Choose monitored channels, test delivery, define request identity verification and escalation. No address or response deadline invented. |
| Retention | Specify periods/triggers for account/settings, editions, saves/feedback, social profiles/relationships/shares/read status, authorization records, logs and backups; confirm provider capabilities and implement expiry where promised. |
| Deletion | Build and exercise a procedure covering Auth0, all owner records and social references involving other readers, local/browser storage guidance, hosting logs and backups. Define retained exceptions, request verification and realistic timing. Do not simply delete one table or equate disconnecting with deletion. |
| Actual data recipients/uses | Inventory deployed provider accounts/regions, subprocessors, transfers, cookies, log settings, analytics and any secondary/model-training use. Review token expiry/revocation behavior against actual configuration. |
| Commercial/legal terms | Decide regions, eligibility/age, free/paid offering, fees/cancellation if applicable, suspension/termination, changes, governing law, warranties/liability and mandatory rights. Obtain appropriate review before adopting. |
| Effective date and release | Replace internal review text with adopted disclosures, remove decisions from public content, enable final public routing/footer links through a reviewed code change, deploy and test anonymous URLs. |

This PR supplies reviewable implementation, not legal advice or a determination of compliance. It does not choose the decisions above.

## Submission remains blocked

Finalize and deploy real policies and a functioning support channel first. Separately confirm publisher identity/permissions, stable MCP origin, actual portal submission state, dedicated reviewer access, live OAuth scopes/PKCE/callbacks, fresh-user consent/renewal/disconnection, tool scan, domain challenge and ChatGPT reviewer rehearsals. The repository's historical “not submitted” label is not current external status evidence. Automated tests are not a live ChatGPT rehearsal.

## Checks

- `npm test` includes production override and explicit preview opt-in checks.
- `npm run typecheck` and `npm run build` validate application integration.
- After build: `node --experimental-strip-types --test tests/integration/policy-pages.test.ts` checks anonymous HTTP rendering, no database dependence, draft visibility in preview, suppression in production, metadata and headers.
