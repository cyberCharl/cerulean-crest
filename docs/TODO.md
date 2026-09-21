# Start here — Friday, 18 September 2026

## Active queue — 21 September 2026

1. **Editorial constitution visibility (implemented; automated verification passed).** Show the complete effective constitution in Settings, using the same policy and database-backed preferences supplied to the curator. Render saved text readably, distinguish defaults from personal instructions, and verify persisted changes and account isolation before starting the next item.
2. **Usernames, friends, and deliberate article sharing (implementation started after constitution verification).** Implement optional unique usernames; exact-username friend requests with accept, decline, and remove; and sharing an article plus an optional note with an accepted friend. Keep editions, constitutions, and reading activity private.
3. **Recommend an article for a friend's edition (same follow-on slice).** Let accepted friends explicitly nominate a source for a future edition. Surface pending recommendations to the recipient and their curator with provenance; let the recipient dismiss them. Recommendations are suggestions, not permission to edit an existing edition or override its constitution. Track inclusion so a nomination is not repeatedly resurfaced.

Validate the social slice with two connected accounts and an unrelated third account, including unauthorized access, removed friendships, duplicate requests, and recommendations flowing into the recipient's edition. Keep it optional and quiet. No real friend requests or shares should be sent during development checks.

## What happened

Sean tried the app with guided setup and onboarding and created his first edition. The founder reports that he was surprised and enthusiastic about it. This is the first reported successful assisted trial with another reader: a useful milestone, though it does not yet demonstrate unaided onboarding or recurring delivery.

The next product direction is friends and sharing, while preserving a quiet solo reading experience. Mobile app work is deferred.

## Today’s focus: onboarding and the smallest useful friends feature

These are pending tasks, not claims that social features have shipped.

- [ ] Define the first social loop: choose a username → add a friend → deliberately share a piece → friend opens it.
- [ ] Build that small loop: optional unique username, exact-username friend request, accept/decline/remove, and sharing a selected piece with an accepted friend.
- [ ] Keep social features optional: no mandatory username or friend step in onboarding; a quiet Friends area and a setting to hide it. Define whether hiding also pauses new requests and notifications; recommended default is yes.
- [ ] Share only the selected piece’s source link and an optional note initially. Keep private editions, editorial preferences and reading activity private. Whole-edition sharing can follow once its permissions are designed.
- [ ] Test with two accounts, including an unrelated third account that cannot read private shares; confirm the app remains complete and uncluttered with social features off.

**Done means:** two willing readers can connect and share one useful piece; someone who ignores the feature can still enjoy the app unchanged. Avoid a public feed, contact imports, popularity counts or recommendation algorithms in this first version. Network effects are a hypothesis to test through actual sharing and return visits.

If today’s work rolls over, start Friday with the workflow baseline before adding more schema changes.

## Friday priorities, in order

1. **Development workflow first.** Commit a reviewed baseline matching production; establish a branch → checks → isolated preview → production release path. Separate test data and auth configuration, document rollback, and pin Node 24. Keep this bounded: make the next change safe and repeatable rather than spending the day rebuilding tooling. [Scope](DEVELOPMENT_WORKFLOW.md).
2. **Choose the name and stable domain.** Time-box the naming decision. It unblocks consistent branding and the ChatGPT submission’s stable MCP hostname. Avoid submitting under a temporary hostname if a rename is imminent.
3. **Prepare and submit the ChatGPT plugin.** Follow the [publication checklist](CHATGPT_PUBLICATION.md): OAuth, review materials, required public pages, test cases and a fresh-user journey. Start review as early as possible; approval timing is external, so Friday’s deliverable is a sound submission, not a promise of publication.
4. **Finish onboarding and the friends pilot.** Carry over the focused checklist above. Prioritize removing actual setup friction before expanding social functionality. Friends should not become a new gate to getting a first edition.
5. **Set a basic brand and revise the landing page.** Choose a compact visual direction, then write the promise and actual setup expectations before polishing the aesthetic. Explain the finite edition, permission to skip, optional friends and current ChatGPT availability accurately.
6. **Edition cleanup.** Review a real edition for reading layout, source links, duration estimates and editorial quality. Fix obvious defects; do not turn this into a complete reader redesign.
7. **Publish the first Substack development article.** Protect a writing block even if earlier work expands. Start notes early: why this exists, what was built, Sean’s assisted trial, what surprised you, and what remains experimental. Describe the daily reading ritual. Get permission before naming or quoting Sean publicly. A development story can publish before plugin approval; a claim of effortless public signup must wait for verification.

## Minimum successful Friday

- [ ] A repeatable development/release path is in place.
- [ ] Name and stable endpoint direction are decided.
- [ ] ChatGPT submission is sent, or concrete missing requirements are recorded.
- [ ] The first Substack post is published; remaining product polish is clearly labelled as work in progress.

**When time is tight:** cut aesthetic polish and expanded social scope before cutting the writing block. Fix privacy or first-edition blockers before inviting more readers.

## Later / intentionally deferred

- [ ] Test whether friends actually improve discovery and bring readers back before expanding the social surface.
- [ ] Consider explicit “include in a future edition” feedback. Unread pieces alone must never imply a backlog or automatic resurfacing.
- [ ] Verify unattended recurring ChatGPT runs and token refresh; scheduling stays external and reading volume stays in the app.
- Mobile app: deferred; no mobile-specific architecture work now.
