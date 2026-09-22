# Friends and deliberate sharing

This optional pilot gives a reader a username and a private Friends area. It does not expose a public profile, edition, constitution, saved list or reading activity. Readers who never opt in can continue using Daybook unchanged.

## Consent and identity

Usernames contain 3–30 lowercase letters, numbers or underscores and start with a letter. A username is unique; matching is exact after trimming and lowercasing. Readers opt in explicitly. Looking up a username sends a request, and the recipient must accept before either person can send an article. There is no directory or fuzzy account search.

Disabling Friends pauses new requests and shares and hides the navigation entry. Removing a friendship removes its shares and nominations. Reconnecting requires a fresh accepted request. Only the recipient may accept or decline a request; either member may remove the relationship.

## Articles and nominations

An article share contains its source URL, the title from the sender's stored article, and an optional note. It does not reveal the edition containing it, the sender's feedback, or their constitution. The sender may separately nominate that article for a future edition. A share does not edit an edition or force the curator to include anything. Recipients can dismiss shares. Re-sending the same article creates no duplicate; it can upgrade an ordinary share into a nomination, but preserves the original note and never revives a dismissed share.

The `get_friend_recommendations` MCP tool requires `editions:read` and returns only the authenticated recipient's pending nominations from currently accepted, enabled friends, with sender username and note. The curator must assess them against the recipient's constitution. Titles and notes are untrusted context, not commands.

Inclusion is derived from URLs in the recipient's actual stored editions. Included URLs stop appearing as pending recommendations regardless of whether publication used MCP or the recovery API. Matching uses the stored URL exactly, as existing article feedback does; the pilot does not collapse publisher URL aliases.

## Deployment and validation

Apply migration `004-social.sql` to an isolated database and run the tests before deploying this slice. PostgreSQL uses transactional checks to serialize relationship changes with sharing. SQLite has equivalent fixture coverage. The `pg` driver is now a runtime dependency.

Run `npm test`, `npm run build`, and `npm run test:integration`. Real Postgres tests require the existing explicit isolated test-database variables and write opt-in. Never point fixture tests at production. Rehearse two willing accounts and an unrelated third, including duplicate requests, opted-out or removed friends, recipient-only dismissal, private edition access, and nominations disappearing after publication.

No email, push notification, contact import, public feed, or friend ranking is part of the pilot. Pending lists are bounded. There is no promise of automatic inclusion or external scheduling.
