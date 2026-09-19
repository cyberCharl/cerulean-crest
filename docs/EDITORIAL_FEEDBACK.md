# Saved articles and editorial feedback

Deployed to production on 18 September 2026: `dpl_HfZZjtxjKF4w4z8BQWPh3Jdiejv5`, Ready, at https://cerulean-crest.vercel.app. Migration 003 was rehearsed against a fresh production-copy branch and then applied to production. All 19 editions, 129 sections, 239 items and three settings records were unchanged; complete record digests matched before/after. The rehearsal branch was removed.

## Reader behavior

- **Save article** stores a private bookmark in `/saved`, available from other sessions/devices using the same account. Removing a bookmark leaves its editorial feedback alone.
- **Tell the editor** offers “More like this”, “Less like this” and an optional private note (up to 2,000 characters). Clicking the selected reaction clears it. Notes can be edited or cleared; “Clear editorial feedback” removes both the reaction and note without unsaving the article.
- Settings shows the latest 50 pieces with feedback, where it can be inspected and cleared. Older feedback remains accessible on the original article or in Saved if bookmarked.
- Saved articles are not a resurfacing queue, endorsement, or reading obligation. Read marks remain browser-local and are not editorial feedback.

## Explicit policy versus soft signals

The existing settings record remains the authoritative editorial policy. `update_editorial_preferences` applies only supplied fields, validates them, derives the owner from the authenticated MCP subject and returns saved values plus the Settings URL. Guidelines and interests replace their respective complete values; the tool and curation skill instruct the agent to preserve unrelated instructions. This uses the existing `editions:write` scope. It cannot change onboarding progress or choose a different account.

`get_editorial_brief` includes structured preferences as well as the existing textual brief. `get_editorial_feedback` requires `editions:read` and returns the most recently updated reactions/notes (default 50, maximum 100). It excludes records with only a bookmark. Feedback reads never modify explicit preferences.

The curator retrieves the brief, recent editions and feedback before selecting candidates. Explicit preferences take precedence; one reaction should not rule out an entire topic. Source metadata and notes are contextual data, not authorization to execute commands or rewrite settings. The MCP server cannot mechanically establish natural-language user intent: the separation is reinforced by separate tools, descriptions and skill instructions, with write-scope enforcement at the server.

There is no persistent inferred profile or autonomous policy-rewriting process in this release. Conservative adaptation occurs during each curation using the available recent feedback. Automatic resurfacing, friends/sharing and synced reading progress remain outside this slice.

## Storage and release

SQLite and Postgres store metadata, bookmark state, reaction and note under `(owner_subject, exact article URL)`. Metadata comes from an edition belonging to that reader, never a client-supplied title. Existing feedback remains editable after an edition is replaced. Independent field updates merge atomically; bookmark writes cannot overwrite notes or reactions. Settings patches also merge atomically.

Apply `migrations/003-article-feedback.sql` through the existing migration command against the intended environment **before** deploying this build. The migration is additive. Do not point an un-migrated Postgres deployment at these reader routes.

## Verification

- 32 unit/MCP tests: ownership, validation, field preservation, replacement survival, scope enforcement, strict preference inputs, bookmark exclusion and feedback clearing.
- Production build and authenticated HTTP integration: real SDK session decoding and compiled server actions; save/read/clear, other-account and signed-out denial, notes visible only to their reader, MCP preference changes reflected in Settings.
- Both Postgres integration tests passed on a disposable branch of the separate Development project, including concurrent writes and migration repeatability; the branch was deleted afterward.
- Local browser fixture: save an edition article, choose a reaction, write a note, open Saved, inspect feedback in Settings and clear it. The fixture uses disposable SQLite and a test-only authenticated session; it does not establish production OAuth/ChatGPT behavior.

Production smoke checks passed: landing and health return 200, private reader routes require sign-in, anonymous MCP returns 401, and authenticated OAuth discovers all five tools and successfully reads brief, history and feedback. The deployment error-log query returned no entries. Browser sign-in was required in the verification browser; live interactive writes were left for the owner to test. Actual ChatGPT rehearsal remains separate work. See the [submission packet](submission/README.md).
