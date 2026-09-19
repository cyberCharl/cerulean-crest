# Public-page drafts: privacy, terms and support

**Internal drafts, not published policies.** Bracketed inputs and unresolved operational decisions must be completed before these become public pages. They are product disclosure drafts, not a determination of legal compliance. Verify the shipped behavior and actual provider/account configuration before adoption. The proposed routes `/privacy`, `/terms` and `/support` do not yet exist.

## Privacy draft

**[PRODUCT] privacy notice**  
Effective: [DATE]  
Operator: [LEGAL INDIVIDUAL OR BUSINESS NAME AND REQUIRED CONTACT DETAILS]  
Privacy contact: [CONTACT]

[PRODUCT] creates and stores private reading editions for your account. This notice describes information processed by our service; ChatGPT, other connected hosts and source publishers operate under their own notices.

### Information used to provide the service

We use your authentication account identifier to associate your settings and editions with your account. Our sign-in provider handles authentication, and the website session can include your display name and email address. We store the editorial settings you provide, including interests, guidelines, reading budgets and timezone, plus your onboarding state.

We store editions created for you: their dates, editorial notes, selected article titles and URLs, source attribution, summaries and reading times. [AFTER VERIFYING THE DEPLOYED FEATURE: We also store articles you save and the reactions and private notes you submit through Tell the editor, associated with your account and article.] Reading-progress marks currently use browser storage; they are distinct from saved articles and editorial reactions. [CONFIRM THIS REMAINS TRUE IN THE RELEASE.]

When you authorize a connected host, it can retrieve your editorial brief, recent source history and editorial feedback for curation, create private editions, and save explicit changes you request to editorial preferences. Reactions and article notes inform selection without automatically rewriting explicit settings. Saving an article does not itself express approval of its topic.

Only provide personal information that you want used for your reading preferences. The service does not need your full conversation history. Article notes are private to your account but can be returned to the host through the editorial-feedback tool you authorize.

### Service providers and source links

The current application uses Auth0 for sign-in, Vercel for hosting and Neon for the application database. [CONFIRM ALL PROVIDERS, ACTUAL DEPLOYMENT LOCATIONS, SUBPROCESSORS, LOGGING/ANALYTICS, TRANSFERS AND OTHER REQUIRED DISCLOSURES.] Connected hosts receive information when you use their authorized tools. Following an article link takes you to the source publisher, whose own access rules and privacy practices apply.

### Storage, retention and your choices

You can edit explicit editorial settings in the website and ask your connected host to make supported preference changes. [VERIFY IN DEPLOYED RELEASE: You can remove saved articles and edit or clear article feedback in the reader.]

[SPECIFY RETENTION FOR ACCOUNT DATA, EDITIONS, SAVES/FEEDBACK, AUTHORIZATION RECORDS, LOGS AND BACKUPS. STATE THE ACTUAL DELETION PROCESS AND BACKUP EXPIRY. DO NOT CLAIM IMMEDIATE OR AUTOMATIC DELETION WITHOUT IMPLEMENTING IT.]

Disconnecting the host prevents future authorized use according to its/provider's revocation behavior; it is not by itself a request to delete data already stored by [PRODUCT]. [CONFIRM THE ACTUAL REVOCATION FLOW BEFORE PUBLICATION.] To request access, correction or deletion, contact [CONTACT] using [VERIFIED PROCESS]. [ADD APPLICABLE RIGHTS, COMPLAINT ROUTE AND REQUIRED LEGAL DETAILS FOR THE CHOSEN LAUNCH REGIONS.]

[CONFIRM WHETHER ANY ANALYTICS, ADVERTISING, SALE/SHARING OR MODEL-TRAINING USE EXISTS; ADD AN ACCURATE STATEMENT. NO UNVERIFIED “WE NEVER…” PROMISES.]

## Terms draft

**[PRODUCT] terms of use**  
Effective: [DATE]  
Operator and contact: [LEGAL NAME / CONTACT]

[PRODUCT] helps you curate and keep personal reading editions. You need an account and must authorize a supported host to use its connected tools. You are responsible for protecting your login and for the instructions and content you submit.

The service stores links, editorial summaries and reading preferences. Source articles belong to their respective publishers; a link does not grant access to paid content or transfer rights to that content. Automated selection and summaries may contain mistakes. Check the original source when accuracy matters.

Editions and editorial feedback are associated with your account. Creating an edition for a date that already exists returns that edition; it does not replace it. The current service does not offer public sharing or delivery scheduling within the application. Host availability, research tools and scheduling are governed separately by the host.

Do not attempt to access another person's account, bypass authentication or use the service unlawfully. [DEFINE ACTUAL SUSPENSION/TERMINATION AND APPEAL/CONTACT PRACTICES.]

[CONFIRM FREE-BETA/PAID TERMS, ANY FEES, BILLING/CANCELLATION IF APPLICABLE, ELIGIBILITY/AGE, SUPPORTED REGIONS, SERVICE CHANGES, LIABILITY/WARRANTY LANGUAGE, GOVERNING LAW AND MANDATORY CONSUMER RIGHTS. DO NOT INVENT THESE.]

For help or account/data requests, contact [CONTACT]. Our [privacy notice]([ORIGIN]/privacy) describes data handling. [ADD HOW MATERIAL TERMS CHANGES WILL BE COMMUNICATED.]

## Support draft

**Help with [PRODUCT]**

Contact [SUPPORT CONTACT]. Include what you were trying to do, the date/time, and any visible error message. Do not send passwords, access tokens, OAuth client secrets or private reading content unless necessary to explain the problem. [CONFIRM MONITORED CHANNEL AND ANY RESPONSE COMMITMENT; NONE IS PROMISED BY THIS DRAFT.]

**I cannot connect.** Sign into the website and check the account shown in Settings. Connect the plugin using that same sign-in method/account. If authorization has expired, reconnect through your host. If you still cannot connect, send support the error and timestamp, without credentials.

**I cannot find my edition.** Open Today or Archive while signed into the account used during creation. Edition links require that account. Another account does not gain access by receiving a link.

**How do I change my reading preferences?** Edit Settings or explicitly ask the connected host to update the preference. Review the saved result in Settings.

**What do Save and Tell the editor do?** Save keeps an article in your private Saved collection. Tell the editor records a reaction or private note for future curation. Saving alone does not change editorial policy. [VERIFY BOTH CONTROLS IN THE RELEASE BEFORE PUBLISHING.]

**How do I delete my account or data?** Contact [PRIVACY CONTACT] using [ACTUAL REQUEST AND IDENTITY-VERIFICATION PROCESS]. [ADD CONFIRMED PROCESS/TIMING AND BACKUP EXCEPTIONS.] Disconnecting the plugin does not delete stored editions.

## Operator checklist before publication

- Resolve every bracketed input and conditional paragraph against the deployed release.
- Document and exercise a deletion procedure covering both the identity provider and application database, including backups and support verification.
- Inventory hosting/auth/database logs and any analytics before making retention or data-use claims.
- Align identity, regions and policy URLs with the portal entry.
- Keep the public text readable and specific; do not publish this internal checklist.
