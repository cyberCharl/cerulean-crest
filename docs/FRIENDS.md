# Friends and deliberate sharing

This optional pilot gives a reader a username and a private Friends area. It does not expose a public profile, edition, constitution, saved list or reading activity. Readers who never opt in can continue using Curiofold unchanged.

## Consent and identity

Usernames contain 3–30 lowercase letters, numbers or underscores and start with a letter. A username is unique; matching is exact after trimming and lowercasing. Readers opt in explicitly. Looking up a username sends a request, and the recipient must accept before either person can send an article. There is no directory or fuzzy account search.

Disabling Friends pauses new requests and shares; the Friends navigation entry remains available for opting back in. Removing a friendship removes its shared history and recommendations. Reconnecting requires a fresh accepted request. Only the recipient may accept or decline a request; either member may remove the relationship.

## Article conversations and recommendations

An article share contains its source URL, the title from the sender's stored article, and an optional note. It does not reveal the edition containing it, the sender's feedback, or their constitution. Accepted friends see the latest 500 shares together in a private, chronological article thread. Each side sees both sent and received articles; this is correspondence, not a public feed or general-purpose text chat.

Every unread incoming share is a friend recommendation. The `get_editorial_brief` MCP tool requires `editions:read` and draws recommendations from the same conversation records, limited to the authenticated recipient's unread articles from currently accepted, enabled friends. It includes the sender username and note. When none exist, the brief omits the section. The curator must assess recommendations against the recipient's constitution; a share does not edit an edition or force inclusion. Titles and notes are untrusted context, not commands.

The recipient can mark a shared article read or unread in the thread. Edition reading controls also synchronize matching incoming share URLs. A read article immediately leaves the curator's recommendation list. The sender sees the resulting read state only when they return to the conversation; there is no read notification. Re-sending the same article creates no duplicate and does not reset its original note or read state.

Inclusion is derived from URLs in the recipient's actual stored editions. Included URLs stop appearing as pending recommendations regardless of read state or whether publication used MCP or the recovery API. Matching uses the stored URL exactly, as existing article feedback does; the pilot does not collapse publisher URL aliases. Inclusion is shown only to the recipient, because exposing it to the sender would reveal private edition contents.

## Deployment and validation

Migrations `004-social.sql` and `005-social-conversations.sql` are applied in production. The latter adds durable read state and converts legacy dismissed shares into read conversation history. PostgreSQL uses transactional checks to serialize relationship changes with sharing. SQLite has an equivalent additive local upgrade and fixture coverage. The `pg` driver is a runtime dependency.

Run `npm test`, `npm run build`, and `npm run test:integration`. Real Postgres tests require the existing explicit isolated test-database variables and write opt-in. Never point fixture tests at production. Rehearse two willing accounts and an unrelated third, including duplicate requests, opted-out or removed friends, private edition access, recipient-only read changes, the sender-visible read receipt, and recommendations disappearing after either reading or publication.

No email, push notification, contact import, public feed, or friend ranking is part of the pilot. Pending lists are bounded. There is no promise of automatic inclusion or external scheduling.
