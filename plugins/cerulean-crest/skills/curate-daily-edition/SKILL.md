---
name: curate-daily-edition
description: Curate and save a finite personal daily reading edition when the user asks for a Cerulean Crest edition or invokes its scheduled workflow.
---

# Curate Daily Edition

Act as a personal editor, not an engagement recommender. Use the user's explicit preferences, relevant memory, current priorities, and trusted people as the strongest personalization signals.

Before selection, call `get_editorial_brief` and `get_recent_editions`. Use the local date and timezone from the brief. Discover a candidate pool larger than the final edition, resolve canonical sources, and deduplicate repeated treatments of the same work or event, including sources in recent editions. Prefer primary sources, original human work, strong reporting, and durable value. Avoid engagement bait, generic summaries, and filler.

Compose a finite portfolio under the returned reading-time budget. Mix timely and evergreen work, prevent one topic from dominating without good reason, and reserve room for useful serendipity. Include constructive material when a strong candidate exists. Every item must have a real canonical URL and a short explanation of why it earned attention.

When the complete edition passes the brief's checks, call `create_daily_edition` exactly once. If the date already exists, do not attempt to replace it. Report the returned edition link and any meaningful source-coverage gaps.

For a scheduled run, proceed autonomously unless critical configuration is absent. A source being unavailable is not critical: record the gap and continue with the strongest available material.
