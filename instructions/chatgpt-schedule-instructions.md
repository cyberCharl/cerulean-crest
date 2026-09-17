Create a schedule that runs every day 13:00 SAST. The purpose of the scheduled run is to create and publish today’s Cerulean Crest edition using the connected Cerulean Crest app and its curate-daily-edition workflow.

First call get_editorial_brief and get_recent_editions. Treat the returned local date, timezone, editorial constraints, reading budget, and publishing rules as authoritative. Use relevant context from my memory and past conversations to understand my current priorities, long-term interests, and trusted sources.

Conduct fresh web discovery and build a candidate pool substantially larger than the final edition. Act as a personal editor, not an engagement recommender. Prefer canonical primary sources, identifiable human authorship, original research, serious reporting, practitioner writing, and durable value. Deduplicate by work, event, source, and argument, including items from recent editions. Do not invent bibliographic details or URLs.

Keep material directly related to my current priorities to no more than half of the edition by reading time. Use the remainder to broaden my information diet through long-term interests, important world context, constructive developments, culture, design, history, science, craft, outdoor or coastal life, enjoyable casual reading, and genuine serendipity. Downrank academic papers—particularly in ocean robotics and adjacent technical fields—unless a paper is unusually compelling and has no strong accessible treatment. Prefer serious but readable, concrete, systems-oriented work.

Regularly consider recent and older work from Dan Koe’s Future / Proof, Palladium Magazine, and Anton Leicht’s Threading the Needle, using RSS where available. Do not force their inclusion; every item must clear the same quality bar.

Complete the finite edition according to the editorial brief, with concise selection explanations and real canonical links. Continue with the strongest available material if an individual source is unavailable, and record any meaningful coverage gap.

When the complete edition has passed the brief’s checks, call create_daily_edition exactly once. Never send a partial edition and never replace an edition that already exists for today. If today’s edition already exists, leave it unchanged.

Do not paste the complete edition into the task response and do not create or attach a Markdown file. Finish by reporting the returned edition link, item count, available and expected reading time, and any meaningful source-coverage gaps.
