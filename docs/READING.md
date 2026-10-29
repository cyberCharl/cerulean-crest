# Reading model

Implemented on the candidate/front-page branch on 28 October 2026, following the owner's selection of prototype layout C. This document describes the implementation; **production deployment is still pending**. The [backlog](BACKLOG.md) retains all six product ideas and their outstanding questions.

## Private paper and link collection

- `/latest` opens the signed-in reader's latest paper, or onboarding if none exists.
- `/links` holds that reader's durable link collection, including links adopted from existing editions and saved bookmarks.
- `/issues/:date` opens the current paper or a retirement notice for an older edition.
- `/archive` redirects signed-in readers to `/links`. `/saved` remains available for existing saved-article feedback controls.

All these reading views require a browser session. The fixture prototype, layout switcher and development authentication bypass are removed. Adding the old `prototype=reading` query does not bypass authentication.

The paper uses the selected pocket-paper layout: one lead, followed by up to three shorter pieces, then an optional button to open the inside pages. Where metadata permits, the lead is the first piece estimated at 12 minutes or more and the shorter pieces are below 12 minutes. Smaller editions need not fill all four slots. Other eligible published links form the inside pages.

Titles, sources and useful reading-time estimates carry the presentation. The publishing contract retains existing summaries and editor notes, but the reader does not show them by default. Editorial feedback and optional sharing remain available behind a disclosure. There is no progress fraction, completed-minutes counter, streak or reminder.

## Three commitments, plus dormancy

| Commitment | Meaning | Selection behavior |
| --- | --- | --- |
| Candidate | This could interest me. | Eligible until explicitly read or made dormant. If presented and left unread when its edition retires, it becomes dormant. |
| Maybe later | I am interested, but not now. | Preserved across retirement and deferred for one edition before becoming eligible again. |
| Pinned | I deliberately want to return to this. | Remains eligible across retirement until read or changed by the reader. |

Dormancy is a separate state. A dormant link stays searchable and can return to candidates; it is not deleted or treated as a negative editorial reaction. Choosing “Let this go dormant” releases its existing commitment to Candidate and sets it aside. Choosing Maybe later or Pinned reactivates a dormant link.

Explicitly read links are excluded from ordinary curation, regardless of commitment. “Mark unread” reverses that flag; the link's commitment and dormancy still apply. Clicking a source link never marks it read.

The collection offers Candidates, Maybe later, Pinned, Dormant, Read and All links views, with title/source/URL search. Shelf counts and completion targets are intentionally absent. Capturing an exact URL already in the account returns the existing record without resetting its choices or creating a duplicate.

## Selection is not exposure

The server stores the chosen front and inside stages separately from whether the reader opened them.

- Front-page exposure is recorded after the client mounts in a visible tab. Server rendering, route prefetching and an unopened background tab are not visits.
- Inside-page exposure is recorded only when the reader explicitly opens the rest of the paper. Having inside links in a published selection is insufficient.
- Exposure applies to the whole opened stage. It is a coarse signal, not a claim that the reader noticed every article.
- Exposure acknowledgements include the rendered edition revision. A stale tab cannot mark a replacement edition as seen; it must reload first.
- Read state requires the reader's separate, reversible action.

When a newer published edition is adopted by the reading model, older editions retire. Ordinary unread candidates in presented stages become dormant. Maybe later and Pinned retain their explicit commitment, subject to the deferral/read rules. Links in unopened stages retain their previous eligibility. If the whole paper was never opened, neither stage causes dormancy.

Retired dated pages show links to the current paper and collection instead of the old layout. Stored publication payloads are retained for compatibility and curation history; “shredding” in this release means retiring the reading surface, not deleting source URLs or historical publishing records. Links and reader state are adopted before retirement is applied.

## Capture and background metadata

A new link requires an HTTP(S) URL. The title is optional, and there is no reading-time input. The link is saved before background metadata lookup, so a failed lookup does not lose the capture.

The backend attempts to extract a title and publication, and estimates reading time when it can identify suitable article text. A reader-supplied title takes precedence over an extracted title. Until a title is available, the hostname is a usable fallback. If the source is inaccessible, blocked, unsupported or lacks sufficient article text, the UI shows an unknown reading time rather than inventing one. Failed lookups can be retried explicitly.

Source HTML may be fetched and inspected transiently to derive metadata. **Source article bodies are not stored or served by Filtered.** Reading remains at the original URL; this does not add an archive, hosted reader, paywall access or a platform-bookmark connector.

Work is bounded and scheduled after capture or collection activity, using persistent job claims so interrupted work can resume on a later request. The UI checks for completion only while metadata is pending and stops after a bounded number of requests. This is not a continuously running scraping service or a new paid-agent cycle.

## Migration and compatibility

- Existing edition links are adopted into each owner's collection. Historical publication alone does not create exposure or dormancy.
- Existing saved bookmarks are imported as Pinned once per URL. Later reader choices are not repeatedly overwritten by that migration.
- On the paper or collection, the client reads only account-scoped version-2 local reading records and submits known URL marks to the authenticated server. It does not import unscoped pre-account storage or legacy ID-only arrays.
- Local marks import only where there is no newer explicit server reading choice. Imports are batched and the browser completion marker is written only after successful submission. Old browser-only marks require a visit from that browser before they can appear on other devices.
- Existing editorial reactions and notes remain editorial feedback. They are not silently reinterpreted as personal notebook entries.

SQLite applies the reading schema locally; Postgres uses [migration 006](../migrations/006-reading-links.sql). Reading state is account-scoped in both implementations. Replacing a published edition preserves exposure history for links removed from the replacement, so earlier presentation is not accidentally erased.

The application uses Node.js 24; implementation verification used Node 24.22.1. The metadata parser is pinned to jsdom 26.1.0 because the deployment runtime disables CommonJS `require()` of ES modules. jsdom 30's encoding dependency fails during import under that setting. A child-process regression imports the extractor with `--no-experimental-require-module`; dependency upgrades must preserve that compatibility.

The existing `get_editorial_brief` response now includes `readingCandidates`: up to 100 eligible candidates, ordered Pinned first, then eligible Maybe later, then ordinary candidates, plus up to 1,000 excluded URLs. A curator can consider the reader's saved interests alongside new discoveries while continuing to publish complete editions through the existing contract. The next-edition brief also excludes ordinary candidates already presented in the active paper, anticipating their retirement; unopened inside links and pinned links remain eligible. The collection is not automatically appended to a paper; the curator chooses the final links. Broader agent capture/search tools remain backlog work.

## What remains deferred

Bulk URL import and share extensions, Substack/X/newsletter connectors, a personal notebook, managed curation, and scheduling/cost controls are not part of this implementation. Backlog ideas 4 and 6 remain open: the narrow metadata lookup does not settle the broader source-access service, and no automatic pause/resume policy has been implemented.


## Rollout and verification

Before deploying this branch against Postgres, run the normal `npm run db:migrate` with the target database configured; migration 006 must exist before the new application runs. Adoption is lazy and batched per reader. No production schema or data was changed while implementing this branch.

Verification includes the production build, unit regressions for lifecycle and metadata access, authenticated HTTP action tests, Postgres ownership/concurrency tests, and signed-in desktop/mobile browser checks. A separate Neon copy of production was used to rehearse migration and adoption of 62 editions / 524 links; hashes of the pre-existing publication, settings, feedback and social tables were unchanged afterwards. Metadata extraction and the reading Postgres flow were also exercised on Node 24.22.1.
