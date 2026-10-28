# Filtered reading backlog

Recorded 28 October 2026 after the personal-newspaper experiment. All six ideas remain recorded here. Ideas **1 and 2 are implemented together on this branch**, following approval of prototype layout C (the pocket paper), and await production deployment. The branch implementation and its boundaries are documented in [Reading model](READING.md). Ideas **4 and 6 remain uncertain and deferred**; their inclusion here does not approve broader source-access infrastructure or automated spending policies.

The disposable prototype has been removed. `/latest`, `/links`, and dated reading views require a signed-in account. Capturing a link needs only a URL; its title is optional and reading time is looked up in the background.

## What prompted this

The original experiment, described in *A Newspaper of My Own*, succeeded at discovery: finite, personal editions introduced enjoyable original writing beyond familiar feeds. Follow-up use exposed a different problem. Browser tabs and Substack/X bookmarks still accumulate; opening those platforms to read invites more scrolling. The owner reported over 200 phone tabs and about 80 iPad tabs. Some editions were enjoyable when opened but often went unread, and articles had no useful destination afterwards.

The opportunity is to help people choose what deserves their attention and keep what mattered. A large unread queue, more generated commentary, or another comprehensive reading application would not resolve that problem. Reading and moving on is also a complete, successful outcome.

## Decisions and boundaries

- **Keep links, not copies of articles.** A reliably saved link is sufficient for the owner to close a tab. Do not replicate source content or build an archived/full-text reader as part of this direction. Continue reading at the original source.
- Use the new Filtered / filtered.page identity. Deployment and branding are separate ongoing work.
- Treat saved reading possibilities as candidates, not homework. Avoid a prominent unread total, completion meter, reminders, streaks, or other habit machinery.
- Support three levels of commitment: **Candidate**, **Maybe later**, and **Pinned**. **Dormant is a separate eligibility state**, not a fourth commitment level. The implemented first policy makes Maybe later skip one edition, prioritizes Pinned in candidate context, and excludes explicitly read links from ordinary selection. These policies can be refined through use.
- Separate intentions: considering something for reading, recording that it was read, keeping something for reference, and telling the editor what to recommend next.
- Editions are disposable presentations. Retiring or “shredding” old editions must preserve links, commitments, explicit read state, personal notes, editorial feedback, and enough exposure/history data to curate sensibly.
- Merely including a link in an edition is not evidence that the reader encountered it. Clicking its source is not evidence that it was read.
- The front page contains **one substantial piece and two or three shorter pieces**. An optional link at the bottom opens the rest of the paper. Unopened inside pages have no effect on the eligibility of the links selected for them.

## Implementation status

The following describes this branch, not a production deployment:

| Area | Implemented | Still outside this release |
| --- | --- | --- |
| Reading surfaces | Layout C; one lead and up to three shorter pieces; optional inside stage; no progress counter or default generated summaries. | Time-picker entry point, personalized layout selection. |
| Link collection | Private URL capture, optional title, metadata lookup, search, three commitments, reversible dormancy/read controls, cross-device persistence. | Bulk import, share extensions, newsletter/platform connectors. |
| Exposure and retirement | Stage exposure after an actual visit; unopened stages do not change candidates. Older editions retire as reading surfaces when a newer edition is adopted, while URLs and reader choices survive. | Physical deletion of historical publishing payloads, per-item visibility tracking. |
| Compatibility | Existing bookmarks imported as pinned once; scoped version-2 local browser read marks imported; editorial feedback remains separate. | Personal notebook or reference-saving redesign. |
| Agent context | Existing `get_editorial_brief` returns eligible reading candidates and excluded URLs. The final-edition publishing payload remains compatible. | New general agent ingestion/search tools and managed curation. |

See [Reading model](READING.md) for eligibility rules, migration limits and metadata behavior.

## 1. A candidate collection without a reading debt

**Status: implemented on this branch together with idea 2; awaiting production deployment.**

Bring saved links and new discoveries into one personal collection. Pasting an individual URL is implemented. Bulk URL import and direct sharing from other apps remain follow-up work suitable for closing existing tabs. Browser, newsletter, Substack, and X capture are possible later sources; connector availability and access must be established before promising integrations. Saving a link means “consider this when choosing something for me,” not “I must finish this.”

Editions can combine existing interests and fresh discoveries. Two saved pieces and one new discovery was an initial example, not a mandated ratio. Duplicate links should retain their existing intent and history rather than create a second obligation. Preserve source URLs and useful metadata; avoid aggressive cross-publisher URL normalization that could merge different works.

### Commitment and eligibility

| Commitment | Reader intent | Implemented behavior |
| --- | --- | --- |
| Candidate | This might interest me. | Eligible for selection. If presented and still unread when that edition retires, become dormant unless the reader increased the commitment. |
| Maybe later | This still interests me; offer it another time. | Survives retirement, skips one edition, then becomes eligible again. It does not have to reappear immediately. |
| Pinned | I explicitly want to return to this. | Remains available and eligible across retirement until read or changed; make deliberate retrieval easy. |

Dormant links remain saved and findable but stop competing for ordinary selection. They can be reactivated deliberately. A dormant link has not been deleted or necessarily disliked. Keep commitment separate from explicit read state and from a future “Keep this” reference collection.

The candidate context prioritizes Pinned, then eligible Maybe later links, then ordinary candidates; the curator still chooses the final selection. Explicitly read links are excluded from ordinary selection until marked unread, subject to their other eligibility state. Never-presented candidates do not expire merely because an edition selected them. Automatic aging of those unseen links remains unresolved and is not implemented.

### Lifecycle vocabulary

- **Selected:** a curator assigned the link to an edition and stage. This is composition metadata, not a reader action.
- **Presented:** the reader opened the stage containing that link. Opening the visible front page records that stage after the client mounts; opening “the rest of the paper” records the inside stage. Server rendering, route prefetching and unopened background tabs do not themselves record a visit. This is a deliberately coarse exposure signal, not a claim that every item was noticed or read. Per-item visibility can be evaluated later if needed.
- **Opened at source:** the reader followed the original URL. This can be useful history but never automatically marks an article read.
- **Read:** the reader explicitly marked it read. The action should be reversible.
- **Retired:** an edition stops being an active presentation. Apply the candidate lifecycle once, using the recorded exposure and current reader intent; preserve durable links and history.

Unopened front pages, like unopened inside pages, must not count as exposure. Do not infer “uninterested” from an agent selecting an article, from an edition being published, or from the passage of time alone.

### Disposable editions, durable links

Older editions now retire as reading surfaces when the reading model adopts a newer published edition. Their dated URLs display a quiet retirement notice linking to the latest paper and the collection; `/archive` redirects to `/links`. Links, commitments, explicit read marks, editorial feedback and exposure history remain. Existing historical publications have no inferred exposure, so importing them does not make unseen candidates dormant. Stored publication payloads remain available for compatibility and curation history; this release does not physically delete them.

## 2. A front page with optional deeper reading

**Status: implemented as layout C on this branch, for release alongside idea 1.**

Make a small reading occasion the default. The front page has one substantial article and up to three smaller pieces when available, with an optional “rest of the paper” link at the bottom. The layout works with smaller selections rather than requiring filler. The second stage may contain more selected material, but nothing there is considered presented until the reader chooses to enter it. There is no requirement to finish either stage.

Remove the edition-wide read fraction, progress bar, and minutes-completed framing. Keep useful item-level length estimates and explicit read controls. One worthwhile article is a successful visit. Avoid reminders, streaks, completion celebrations, or incentives to consume the whole paper.

The reader now emphasizes original titles, sources and reading-time metadata, without showing generated summaries or editor notes by default. The publishing schema still accepts the existing required summaries and editor notes for compatibility. An optional selection rationale remains a possible later experiment.

The earlier “I have 15 minutes” / one strong choice idea remains a possible later entry point. The selected first experiment is the two-stage newspaper, not an additional time-picker or recommendation workflow.

## 3. Keep what mattered, with a small personal notebook

**Priority: subsequent experiment after the candidate/front-page loop.**

Offer “Keep this” to preserve a reference, optionally followed by “What do you want to remember?” A short sentence, pasted passage, or dictated thought should suffice. No required tags, filing, annotation system, or summary. The user can enjoy a piece and discard it without taking notes.

Distinguish keeping a reference from intending to read it later. Keep personal notes separate from “Tell the editor” feedback, with explicit controls over whether an agent may use them for recommendations. Personal writing must not silently become editorial policy.

Start retrieval with titles, source metadata, and the reader's own notes: “Find that essay about chopping wood and what I wrote about it.” Let authorized agents query the same reference collection. Markdown export could make Obsidian a destination while keeping the reading and note-taking interface comfortable on iPad. This does not require an Obsidian integration or a full Readwise Reader replacement in the first slice.

## 4. Dependable source access as an agent capability

**Status: uncertain and deferred beyond the narrow metadata lookup needed for URL capture.**

The original idea was to centralize collection and source access so individual agents do not repeatedly solve brittle internet access. Potential services included metadata extraction, provenance, access-status reporting, and distinguishing inspected source material from link-only recommendations. RSS and authenticated bookmark connectors were possible ingestion routes, subject to actual support and permissions.

The original brainstorm also mentioned caching captured articles, full-text retrieval, and a quiet hosted reader. **The later decision to save links without replicating content excludes those from the current direction.** Do not treat the original suggestion as authorization to implement them.

The approved capture flow now performs a bounded backend lookup for title, publication and estimated reading time, without retaining source bodies. This does not settle the broader idea. The remaining question is whether Filtered should provide source-access diagnostics and dependable source inspection for agents, or leave those responsibilities with the reader's agent. Record inaccessible, subscriber-only, or uninspected sources honestly; a saved link is still useful. Centralizing a fetch does not eliminate platform access limits. No platform connector, general scraping service, content hosting, or paid-access implementation is committed here.

## 5. Useful capabilities for the reader's own agent

**Priority: incremental platform work; minimal candidate context is included in the current implementation.**

The existing `get_editorial_brief` response now includes eligible saved candidates and excluded URLs, so a curator can use the collection without a new MCP tool. The broader capabilities below remain follow-up work.

Extend the existing per-account publishing interface into capabilities people can give their agents: add links, inspect eligible candidates, query explicit preferences and reading history, search kept references and personal notes where authorized, and publish finite editions. Include source/access provenance where available without promising stored article bodies. The agent should be able to use interests and available time to choose from material already owned by the reader's collection.

Respect the philosophy “I like my agents; give them more tools and data.” A person revisiting an interest could ask their existing agent to recover relevant saved articles and earlier thoughts. Ownership and permissions apply throughout, especially to personal notes.

Also make the product usable by people without their own agent setup, including the owner's parents. A managed curator can use the same underlying capabilities, with a simple choice of interests and reading rhythm. It should not expose MCP, prompt engineering, or configuration machinery in the ordinary reading flow. Model choice, billing, and the managed service remain separate product decisions.

## 6. Spend only when curation is wanted

**Status: uncertain and deferred; no automatic pause policy approved yet.**

Hypothesis: after three scheduled editions go unopened, pause managed curation while preserving the current paper and saved links. On return, show a quiet paused state with “Make me a fresh edition,” and offer resuming the schedule separately. Do not generate missed editions as catch-up work.

An alternative from the discussion is to restart on login, but opening the app may mean retrieving an old note. Prefer testing the explicit fresh-edition action before choosing automatic restart. The threshold, what counts as a qualifying visit, pause/resume wording, and whether three cycles is sensible remain open.

For an external agent, expose an inexpensive “Is a new edition wanted?” check before research. The service can tell it not to curate, but cannot prevent an independently scheduled agent from waking or spending tokens before making that check. Managed and external scheduling need separate responsibility boundaries. This is a cost-control hypothesis, not habit machinery or a request for reminders.

## Combined implementation and release checks

1. **Completed:** prototype ideas 1 and 2 together; the owner selected layout C and approved implementation.
2. **Completed on this branch:** private durable capture, metadata lookup, candidate/exposure storage, cross-device read state, two-stage reading, retirement, and migration from bookmarks/scoped local reading marks. Both ideas remain one release.
3. **Next:** deploy the combined change after release validation, then use real saved tabs to assess whether the collection supports confidently closing them and the front page makes choosing easier. No production deployment is claimed here.
4. **Later:** bulk capture and personal notes/retrieval. Keep the broader source-access and spending-policy questions recorded without making them dependencies of this release.

| Scenario | Expected outcome |
| --- | --- |
| An ordinary candidate is selected for the inside pages; the reader only visits the front page; the edition retires. | The candidate's eligibility is unchanged. Selection alone has no expiry effect. |
| An ordinary candidate is presented on the front page, left unread, and the edition retires. | The link becomes dormant and remains findable. It does not become a debt carried into every subsequent paper. |
| The reader opens the inside stage and leaves an ordinary candidate there unread. | It now counts as presented and becomes dormant when that edition retires. |
| The reader marks a presented link Maybe later or Pinned before retirement. | Its commitment survives. Maybe later skips one edition before becoming eligible again; Pinned remains eligible unless explicitly read. |
| An entire edition is never visited. | Its publication does not count as exposure of either stage. |
| The reader follows a source URL, returns immediately, and does nothing else. | No automatic read marker is written. |
| A dormant link is deliberately restored to the candidate pool. | It becomes eligible again without losing its URL or prior history. |
| An old edition is retired. | Links and relevant reader state/history survive independently of the discarded layout. |
| The reader reads one piece and leaves. | There is no incomplete-edition warning, completion fraction, streak, or reminder. |
| The same reader later uses another device. | Durable commitments and explicit reading/exposure state come from the account. Browser-only historical marks become available across devices after import on their original browser. |

Success means fewer tabs kept open as reminders, satisfying reading without a detour through feeds, and confidence that a saved reference remains retrievable. The experiment should not optimize completion rate or time spent in the app.
