# Candidates and the two-stage newspaper — throwaway prototype

## Question

Can three levels of commitment and disposable editions make a saved-link collection useful without turning it into an unread backlog? Evaluate the candidate lifecycle and the small front page together. The product backlog is [docs/BACKLOG.md](../../docs/BACKLOG.md); all six ideas are recorded there, with ideas 4 and 6 deferred.

## Run

```sh
npm run prototype:reading
```

Open <http://localhost:3002/latest?prototype=reading&variant=A>. The normal `/latest` route retains its existing behavior. Only development mode and the explicit `prototype=reading` parameter enable the fixture UI; a production build always follows the existing authenticated path.

The bottom switcher offers three structural arrangements, preserving the current in-memory state:

- `A`: broadsheet, one long piece beside three shorter pieces.
- `B`: reading desk, a margin beside a lead article and shorter columns below.
- `C`: pocket paper, a single column with a distinct lead panel.

Left/right keys also switch layouts when focus is outside an interactive control. Use Your links for capture, search, and the shelves. Use Prototype controls & state to retire an edition, create another, inspect every link, or reset the fixture. The surrounding site header is the real app shell and uses the locally configured application origin; use the prototype's Your paper / Your links navigation for this experiment.

## Working rules, not final product policy

- Candidate: available for selection; presented and unread becomes dormant at retirement.
- Maybe later: an explicit softer intention; give it one intervening edition before it can be offered again. Renew that breathing room after a presented edition retires.
- Pinned: stays eligible until read or deliberately released. Pinning does not force immediate inclusion or create an obligation.
- Dormant: retained and searchable, excluded from selection, reversible. Distinct from the three commitment levels.
- Read: explicitly marked, reversible, excluded from new selection. Opening a source URL never marks it read. Commitment is retained separately.
- Selection is not presentation. This coarse prototype counts opening a stage as presenting that whole stage. It does not claim the reader noticed every link. The inside links are not rendered as reader articles until the reader opens the rest of the paper.
- Retiring discards the current paper, preserves links and their state, and only applies lifecycle changes to presented links. Unopened inside links keep their eligibility. The controls open each new front page immediately; completely unvisited editions are a production scenario documented in the backlog, not simulated by this fixture.
- One long piece and up to three shorter pieces appear when enough eligible links exist. A small pool yields a smaller paper instead of reactivating dormant/read links or inventing content. The remainder is capped at four links for the fixture.

The selector is deterministic, prioritizing pinned, then eligible maybe-later, then ordinary candidates. It is not a curator or relevance model. No source retrieval, stored article bodies, summaries, AI generation, scheduling, network writes, or database mutations are involved. Titles, sources, and estimates come from the existing demo fixture plus the firewood link in the owner's essay. Estimates are sample metadata, not freshly verified timings.

All changes are in memory and disappear on refresh. Added URLs are validated as HTTP(S); exact parsed-URL duplicates are rejected without modifying the original. The capture form currently takes one URL at a time. Bulk import, reliable persistence, cross-device state, complete exposure history, migration, and agent integration remain production work. Do not use this demo as the only place to save real tabs.

## Branch provenance

Created `codex/candidates-frontpage-prototype` from `8a6aeec57efd09a467f3f5bff4c97d806a9e8898` on 28 October 2026. At inspection, `filtered.page` resolved through Vercel to Ready production deployment `dpl_77m3TGsjiGKqf6bVwNeRZYFVNCcn`, whose metadata reported commit `666709ef8cc5bf6ebe8c61c95e3a5244e0615bec`. The branch base differs only by two documentation lines recording Auth0 branding; application code matches the deployed revision. No deployment or production data change was made for this prototype.

## Verification on 28 October 2026

- TypeScript and production build passed; all 41 existing unit/MCP tests passed.
- Browser exercised retirement with one maybe-later link, one pinned link, one explicitly read link, and one ordinary front-page candidate: all 13 links survived, the ordinary presented link became dormant, and the unpresented inside links remained active with their exposure untouched.
- Browser verified that Maybe later skips edition 2 and returns in edition 3; opening inside pages records exposure and allows their ordinary links to become dormant on retirement.
- Browser exercised link capture, search, duplicate rejection, manual dormancy and reactivation, and all three layouts.
- Desktop and 390px mobile rendering inspected; mobile document width matched the viewport. Browser console contained zero errors or warnings.
- An unauthenticated request to the local production build at `/latest?prototype=reading&variant=A` returned 307 to the configured login route, not the demo.

## Verdict and next step

Awaiting user evaluation. The one-edition pause, labels, priority, stage-level presentation signal, and preferred layout are provisional. Choose the useful interaction and layout pieces, then replace this throwaway implementation with authenticated durable state and a compatible publishing contract. Remove the variants, fixture, switcher, development route branch, and run script when the experiment is absorbed or discarded. Ideas 1 and 2 should ship together.
