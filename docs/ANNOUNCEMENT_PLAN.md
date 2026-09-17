# Announcement readiness — 17 September 2026

This is the launch scope and readiness record, updated after the 17 September multi-user release. Implementation and verification are recorded below; outstanding requirements remain proposals. Naming and branding are now planned for Friday, 18 September. See [the prioritized todo list](TODO.md).

## Shipped and verified

| Area | Current status |
| --- | --- |
| Accounts and private editions | Deployed. Browser sign-in and owner-scoped editions, archives, settings and MCP tools. SQLite/Postgres isolation and authenticated HTTP checks pass; the owner confirmed live sign-in and access to existing editions. |
| Existing content | All 16 editions, 116 sections and 203 items preserved during migration. Production-copy rehearsal passed and a recovery branch was retained. |
| Landing page and signup entry | Deployed in the current aesthetic. Desktop/mobile layout and hosted signup entry checked. |
| Reading volume and editorial brief | Deployed. Reading minutes, edition minutes, timezone and free-text guidelines are saved per user and returned to their curator. Defaults retain 60 minutes of reading from 120 minutes of material. |
| New-user onboarding | Wizard deployed: reading rhythm → topic choices and optional detail → first-edition handoff. Owner testing pending. Public ChatGPT publication and connection verification remain open. |
| History and feedback | Recent-edition URLs are scoped by user and available to the agent. Reading marks remain browser-local; server feedback and resurfacing requests are not implemented. |
| Serendipity | Editorial guidance exists. Dedicated preference controls, discovery labels and feedback are not implemented. |
| First edition and recurring delivery for a new user | Sean completed guided onboarding and created his first edition, as reported by the owner. Unaided setup and recurring delivery remain unverified. Scheduling intentionally remains in ChatGPT. |

See [the implemented onboarding flow](ONBOARDING.md), [ChatGPT publication research](CHATGPT_PUBLICATION.md), [implementation evidence](IMPLEMENTATION_STATUS.md), and [account setup](USER_ACCOUNTS.md).

## What the announcement should offer

A reader can sign up, configure a finite personal magazine, connect its curator, and read private editions. The curator remembers what has appeared and considers reading feedback before discovering new candidates. The article explains the intended reading ritual and presents improved information habits and serendipity as hypotheses to test, not established outcomes.

## Remaining gaps and product intent

- Account creation and private reading now work, but a fresh user cannot complete curator setup unaided. Public/self-service connector distribution remains unresolved.
- The deployed wizard guides accounts without editions and saves progress. It does not claim connection or generation status; an actual edition is the completion milestone. Interactive browser verification remains.
- Deployed onboarding adds broad topic choices, optional notes and browser timezone detection for unsaved preferences. Existing preferences are preserved. Dedicated source and discovery controls remain optional.
- Recent-edition retrieval exposes source links, but reading progress exists only in browser storage. The agent cannot retrieve reading marks or resurfacing requests.
- The brief currently offers 120 minutes of material for 60 minutes of expected reading. The surplus intentionally offers choice and permission to skip. The right balance remains an experiment; the difference is not inherently reading debt.
- Scheduling intentionally remains external in ChatGPT. App-stored reading-volume preferences now reach the agent through editorial information; no scheduler management is required for this scope.

## Build order and acceptance criteria

### 1. Accounts and private editions

**Status: shipped and verified.** Implementation uses the authenticated Auth0 subject directly (`owner_subject`) rather than a separate internal owner ID.

Connect browser sign-in and MCP authorization to the same internal user identity. Scope every read and write, archive, adjacent-edition link, and publishing operation to that identity. Use uniqueness on `(owner_id, issue_date)` and assign existing editions to the existing owner during migration. Scope or retire the shared Basic Auth recovery publisher before admitting other users. Keep private content out of anonymous metadata and shared caches.

Acceptance: two users can create and read editions for the same date independently; neither can retrieve, replace, infer through navigation, or alter the other's content. Signed-out readers see no private editions. Existing owner content survives migration. Test both SQLite and Postgres paths.

### 2. Landing page and usable onboarding

**Status: landing/signup/settings shipped; self-service onboarding acceptance is not met.** The current flow needs maintainer assistance for the ChatGPT connection and has not been exercised through first publication by a fresh external user.

Explain the finite-magazine promise, offer sign-in/signup, and give a new account a useful empty state. Collect timezone, intended reading time, edition length, current priorities, and editorial guidelines through ordinary controls. Include sources to favour or avoid and a discovery preference, with defaults so setup does not require writing a prompt. Preserve the current aesthetic.

Explain curator connection and external ChatGPT scheduling during onboarding. Account creation alone must not imply that editions will arrive automatically. Verify the complete path with an account other than the owner's before inviting readers. State any eligibility or distribution constraints discovered during that verification.

Acceptance: a new user can configure a magazine, connect an authorized curator, and receive and privately read a first edition without developer intervention or an elaborate custom prompt.

### 3. Persist feedback and curate with history

**Status: partial.** Owner-scoped recent links and instructions to check them exist. Persisted feedback, a durable appearance history across replacement, and resurfacing requests remain unbuilt.

Store reading state and an independent “include in a future edition” request per user and stable source identity. Distinguish an explicit read mark from opening a link; absence of a mark is not proof that someone did not read. Preserve appearance history across edition replacement and use conservative URL normalization, with editorial deduplication for different treatments of the same work or event.

Before compiling candidates, the curator must retrieve the user's settings, prior appearances, reading feedback, and pending resurfacing requests. Recent links alone are insufficient. Bound the returned context while keeping historical duplicate checks available.

Editorial intent and proposed resurfacing policy:

- Past editions remain an archive, not a queue the user must finish.
- Unread or unmarked items are not unfinished assignments. Their state alone is neither a resurfacing request nor evidence of dislike. Even if half an edition is unmarked, the curator must not infer that those pieces belong in future editions or that the reader needs less choice.
- Explicit resurfacing requests get priority for reconsideration. Otherwise, default to avoiding prior appearances; any exception needs a fresh editorial reason independent of unread status. The precise exception policy remains to be tested.
- Resurfaced items consume the new edition's existing time budget. Label them and explain why they returned.
- Allow users to cancel requests. Resolve a request only after successful publication containing that item; failed publication and retries must not lose it.
- A repeated publication request must not consume requests again or alter an existing edition.

Acceptance: feedback survives another browser session, is isolated by user, and is available before candidate selection. A requested item can return within the budget without replaying the whole backlog. Failed and duplicate publishes preserve correct request state.

### 4. Make discovery intentional and inspectable

**Status: editorial guidance only.** The UI controls and feedback described here remain proposed.

Turn the existing serendipity guidance into a bounded editorial allocation. A proposed starting point is 10–20% of reading time, adjustable by the reader. Include adjacent interests and occasional work outside familiar topics and sources, subject to the same quality threshold. Do not fill a quota with weak material.

Give discovery selections a short explanation of why they might matter. Collect lightweight feedback such as “worth discovering” and “not for me”; avoid treating click-through or time spent as success. Social recommendations fit the original vision but are a later source of discovery, not a prerequisite for this slice.

Acceptance: an edition can identify its discovery selections and their rationale. The article distinguishes creating opportunities for serendipity from proving the reader experienced it.

### 5. Reading volume and permission to skip

**Status: settings and personalized brief shipped.** Landing/settings copy explicitly welcomes skipping, and the brief prohibits automatic carry-forward. The reader still shows pieces-read progress; whether that presentation supports permission to skip needs review. Respect for the configured volume is instructed through the brief, not a new server-enforced publishing limit.

Expose intended reading time and edition length in app settings, with timezone available for editorial dates. Clearly distinguish the intended reading-session duration from the total supplied material. A reader may want 60 minutes of reading selected from 120 minutes of material; completing every piece is not the goal. Keep both values configurable rather than assuming they should converge. All selections, including resurfacing, fit within the configured edition volume.

Return these saved preferences in the user's editorial brief each time the curator requests it, before candidate selection. Scheduling and changes to delivery time remain external in ChatGPT; app-managed scheduling or synchronization is outside this scope.

Acceptance: changing reading time, edition length, or editorial guidelines changes the next retrieved brief without rewriting a ChatGPT prompt or changing the external schedule. The curator respects the configured volume and treats surplus as optional choice. The reader presents skipping as normal rather than a completion deficit.

## Article and experiment

Describe a proposed ritual: read at a chosen time, choose whichever pieces appeal, freely skip the rest, stop when the session ends, mark only pieces worth bringing back, and start the next edition without an obligation to clear the archive. Offering more material than the session allows is intended to support that choice. This is editorial guidance, not a streak or completion target.

Evaluate three questions during early use:

1. Does a finite edition with optional surplus create a welcome sense of choice, or still feel like reading debt? What balance of supplied material and intended reading time works for the reader?
2. Do readers encounter worthwhile unfamiliar work they would otherwise have missed?
3. Does the ritual replace unwanted feed browsing and fit the reader's available time?

Use brief reader reflection alongside optional feedback. Edition completion alone is not evidence of healthier habits. Report uncertainty and actual observations in the announcement.

## Release gate

**Current assessment: suitable for a maintainer-assisted pilot; not yet a self-service public launch.** Account isolation and the settings foundation are verified. The remaining gates are onboarding/connector access, first publication and recurring delivery by a fresh user, and the feedback/history scope promised by the announcement.

Before an announcement inviting people to use the app, demonstrate signup through first private edition, cross-user isolation, editable reading volume and editorial settings exposed through the brief, history-aware curation, and reliable delivery through the externally configured ChatGPT schedule. Verify migration/recovery and explain any remaining connection prerequisites. A progress article can precede these gates if it clearly describes an owner experiment rather than an available public service.

Deferred: renaming, aesthetic redesign, social graph, billing, and a broader agent platform.

## Development follow-up

The owner requested a cleaner development workflow before wider use, with friends and optional sharing as the next product direction; mobile is deferred. See [development workflow scope](DEVELOPMENT_WORKFLOW.md). Onboarding was deployed for owner testing on 17 September 2026 (`dpl_BYDapCWNQhhRyWnF6ntF9q4waHfK`); public ChatGPT publication remains outstanding.
