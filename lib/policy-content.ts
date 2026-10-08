import type { PolicyKind } from "./policy-review.ts";

type Section = { title: string; paragraphs: string[] };
type ReviewDocument = { introduction: string; sections: Section[]; decisions: string[] };
/** Implementation disclosures for review, never an adopted policy or contract. */
export const policyContent: Record<PolicyKind, ReviewDocument> = {
  privacy: {
    introduction: "Curiofold stores personal reading editions and editorial preferences. This draft describes the repository implementation; deployed provider settings still require verification. ChatGPT, other connected hosts and source publishers have their own privacy practices.",
    sections: [
      { title: "Account and reading information", paragraphs: [
        "The application associates records with your authentication account identifier. Auth0 handles website sign-in; the website session can include your name and email address. Editorial settings include your Markdown constitution, reading budgets, timezone, delivery preferences, onboarding state and reader theme.",
        "Stored editions include dates, editorial notes, article titles and URLs, authors and publishers, summaries and reading times. Saved articles, editorial reactions and article notes are stored against your account. Save and Tell the editor are separate controls: saving alone does not express approval of a topic. You can unsave an article and clear its reaction and note, but these controls do not delete your account or every stored record.",
      ] },
      { title: "Friends and reading progress", paragraphs: [
        "Friends and sharing are opt-in. The application stores usernames, sharing preferences, friend requests and relationships, and articles shared between friends, including titles, URLs, notes, recommendation state and reading status. A shared article and note are visible to the recipient, and the sender can see whether the recipient has marked it as read; sharing does not grant access to your full edition or private editorial feedback.",
        "Edition reading marks use this browser’s local storage, keyed by account and edition. The reader also sends reading changes to the server for matching articles received from friends, and synchronizes loaded marks. Reading status for those shared articles is therefore not exclusively browser-local.",
      ] },
      { title: "Information sent to connected hosts", paragraphs: [
        "When authorized, a connected host can read your assembled editorial brief: the constitution, reading context, titles and URLs from up to seven recent editions, up to 50 recent editorial feedback records including notes, and pending friend recommendations including usernames and notes. The host can retrieve the editable constitution, apply supported explicit edits, and create an edition. These are separate from saving articles or changing feedback on the website.",
        "Do not put information into preferences or notes that you do not want included in the relevant authorized curation context. The application tools do not require a full conversation history.",
      ] },
      { title: "Storage, providers and source links", paragraphs: [
        "The code integrates Auth0 for sign-in and supports PostgreSQL or local SQLite storage. Vercel deployments require a database URL; the PostgreSQL adapter uses Neon’s driver. These integrations do not establish the actual hosting regions, provider accounts, backup expiry or logging settings of the deployed service.",
        "Following an article link opens the source publisher’s website. The publisher controls access and its own data practices. The application also emits operational publication and health events; hosting and identity-provider logs need a separate inventory.",
      ] },
      { title: "Retention and deletion are not yet specified", paragraphs: [
        "No complete account-deletion workflow or general retention schedule was found in the inspected application. Clearing a reaction, removing a save or disconnecting a host must not be presented as deleting all application, identity-provider, log or backup data. A verified request channel and deletion procedure must be established before this notice is adopted.",
      ] },
    ],
    decisions: ["Legal operator identity, required address/contact details and effective date.", "Monitored privacy channel, identity verification and access/correction/deletion process.", "Retention periods for editions, settings, saves/feedback, social records, authorization records, logs and backups; implement and exercise deletion across providers.", "Confirm production providers, locations, transfers, cookies, logs, analytics and any secondary use, including model training.", "Launch regions, applicable rights and complaint route; review legal requirements for those regions."],
  },
  terms: {
    introduction: "These are proposed service descriptions for review, not an effective contract. Operator identity and material commercial and legal terms remain undecided.",
    sections: [
      { title: "What Curiofold provides", paragraphs: [
        "Curiofold keeps reading editions, preferences, saved articles and editorial feedback for an account. Website sign-in and connected-host authorization must resolve to the same account to access the same editions. You can optionally enable friends and share individual articles and notes with accepted friends.",
        "Connected edition creation is create-only and idempotent for an account and date: requesting creation again returns the existing edition instead of replacing it. The application stores delivery preferences but does not itself run a delivery scheduler. Host research, scheduling and authorization availability are controlled separately by the host.",
      ] },
      { title: "Sources and accuracy", paragraphs: [
        "Editions contain source links and editorial summaries. A link does not grant access to paid content or transfer a publisher’s rights. Automated selection and summaries can contain mistakes; consult the original source when accuracy matters.",
      ] },
      { title: "Proposed account responsibilities", paragraphs: [
        "The proposed terms would require readers to protect their login and refrain from accessing another person’s account, bypassing authentication or using the service unlawfully. Suspension, termination and review procedures still need an operator decision; this draft does not establish them.",
      ] },
    ],
    decisions: ["Operator identity, contact and effective date.", "Free or paid service, fees and any billing/cancellation/refund rules.", "Eligibility and age limits, launch regions, permitted use and suspension/termination process.", "Governing law, warranties, liability and mandatory consumer rights, reviewed for launch regions.", "How service changes and material terms changes will be communicated."],
  },
  support: {
    introduction: "This help draft covers the current application. A monitored support and privacy channel has not yet been confirmed, so no contact address or response deadline is offered here.",
    sections: [
      { title: "I cannot connect", paragraphs: ["Sign into the website and check the account in Settings. Authorize the connected host using the same account and sign-in method. If authorization has expired, reconnect through the host. Record the visible error and its time for support; never send passwords, access tokens, session cookies or OAuth client secrets."] },
      { title: "I cannot find my edition", paragraphs: ["Open Latest or Archive while signed into the account used to create the edition. A private edition link does not give another account access. A friend’s article share is separate from access to their edition."] },
      { title: "Changing preferences", paragraphs: ["Edit Settings or explicitly ask the connected host to make a supported constitution change. Review the result in Settings. Saving delivery preferences does not create a running schedule inside Curiofold; host scheduling must be configured separately."] },
      { title: "Save, Tell the editor and Share", paragraphs: ["Save keeps an article in your Saved collection. Tell the editor records a reaction or note that can be included in future curation context. Saving alone does not change editorial policy. Share sends an article and note to an accepted friend after both readers enable sharing. Keep private information out of notes you send to friends."] },
      { title: "Account and data deletion", paragraphs: ["An account-deletion request procedure is not yet available in this implementation. Unsave and feedback controls are narrower than account deletion. Disconnecting the host is not an application-data deletion request. A confirmed request channel and tested deletion procedure are required before this page becomes final."] },
    ],
    decisions: ["Choose and test a monitored support channel and privacy request channel.", "Define request identity verification, escalation and deletion steps, including identity-provider records, social data, logs and backups.", "Decide any response targets only after they can be supported operationally; none is promised by this draft."],
  },
};
