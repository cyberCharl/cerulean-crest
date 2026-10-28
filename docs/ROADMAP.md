# Roadmap

The direction should follow actual use by the owner and early friends. The [reading backlog](BACKLOG.md) records all six ideas from the 28 October 2026 follow-up to the personal-newspaper experiment. The owner selected layout C and approved implementing ideas 1 and 2 together: a durable link collection with three commitment levels and dormancy, plus a small front page and optional inside pages.

That combined implementation is now on this branch and awaits production deployment. See [Reading model](READING.md) for behavior and compatibility. Personal notes, broader agent capabilities and managed curation remain follow-up work. Broader source access and automatic pause/resume remain uncertain and deferred.

The [announcement readiness plan](ANNOUNCEMENT_PLAN.md) supplies launch context. The product now uses the Filtered / filtered.page identity; branding and deployment work are separate from this reading-model change.

## Existing foundation

- Publish complete scheduled editions through authenticated per-account interfaces.
- Private user editions, signup, lightweight onboarding, and a persistent Markdown editorial constitution.
- Editorial feedback, intentional friend recommendations, and read-only curation context.
- External scheduling through the connected curator.

## Next combined release — candidates and a finite front page

Implemented on this branch; not yet deployed:

- Signed-in `/latest` and `/links`, using pocket-paper layout C; no public prototype bypass.
- One lead and up to three shorter pieces, then an optional inside stage. Only opening a stage records exposure; source clicks do not mark anything read.
- Candidate, Maybe later and Pinned commitments; dormant links remain findable. Maybe later skips one edition, Pinned survives retirement, and explicit read marks are reversible and synced across devices.
- Retired editions stop accumulating as reading surfaces while links and reader choices remain. Old dated routes show a retirement notice; `/archive` leads to the collection.
- URL-only capture with optional title and background title/reading-time lookup. Unknown metadata remains unknown; source content is not stored.
- Existing bookmarks adopted as pinned once, scoped browser read marks migrated, and saved candidates included in the existing editorial brief.
- No progress counter, reminders, streaks or default generated commentary.

After deployment, use real tabs and links to evaluate whether saving is sufficient to close them confidently and whether the front page makes choosing easier. Refine eligibility through actual use rather than adding an unread backlog target.

## Subsequent reading improvements

- Bulk capture and sharing into the collection, with platform connectors only where practical access is established.
- A small personal notebook and later retrieval/export, kept distinct from reading intentions and editorial feedback.
- A possible “I have a little time” entry point if the front page does not sufficiently reduce selection effort.

## Agent capabilities and wider access

- Extend the existing candidate context into deliberate agent capture, retrieval and search capabilities.
- Support the reader's own agents while exploring a simple managed curator for people without an agent setup.
- Decide model choice, billing and inference costs from observed needs.
- Revisit dependable source-access services only within the link-only boundary, and consider demand-aware pause/resume separately. Neither is required for the combined reading release.

Across every release: protect the finite-edition idea, link people back to original work, optimize for judgment and wellbeing rather than time-on-site, and keep decisions reversible while the product is being learned.
