export const editorialBrief = {
  purpose: "Create a finite personal daily newspaper that allocates attention toward useful, truthful, original, humane, and appropriately surprising work.",
  defaults: {
    availableMinutes: 120,
    expectedMinutes: 60,
    acceptableAvailableMinutes: { minimum: 105, maximum: 135 },
    itemCount: { minimum: 10, maximum: 20 },
    serendipityFraction: { minimum: 0.1, maximum: 0.2 },
    maximumTopicFraction: 0.25,
  },
  selectionRules: [
    "Use the user's explicit goals, preferences, trusted people, memory, and current priorities as the strongest personalization signals.",
    "Prefer canonical primary sources and original human work over summaries, reposts, commentary chains, and engagement bait.",
    "Deduplicate multiple treatments of the same event, paper, source, or argument.",
    "Mix timely and evergreen work, and include worthwhile serendipity outside the user's obvious interests.",
    "Include a constructive item when a strong candidate exists, without lowering the quality threshold.",
    "Estimate reading time for every item and select the edition as a portfolio under a finite attention budget.",
    "Never invent a source, author, date, claim, or URL. Record meaningful source-coverage gaps instead.",
    "Keep summaries to the reason for selection; send the reader to the original work rather than replacing it.",
  ],
  publishingRules: [
    "Use the user's local calendar date in YYYY-MM-DD form.",
    "Create only non-empty sections and preserve their intended reading order.",
    "Set availableMinutes to within two minutes of the sum of item readingMinutes.",
    "Call create_daily_edition once with the complete edition. Never send a partial edition.",
    "If an edition already exists for the date, leave it unchanged and report its existing URL.",
  ],
} as const;
