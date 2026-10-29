# New-user onboarding

The production flow creates a per-reader Markdown editorial constitution and asks the reader's AI curator (ChatGPT, or another MCP tool) to publish only the final edition. It was deployed on 22 September 2026 in `dpl_4kQ7b2n3P5inkxPKnq1N324KZ2gZ`. The public ChatGPT plugin has not been submitted, and a live ChatGPT rehearsal remains separate. See [the MCP contract](MCP.md) and [publication preparation](CHATGPT_PUBLICATION.md).

## Implemented wizard

1. **Sign up from the landing page.** Auth0 hosts signup. The website and curator must use the same Filtered account; this is separate from the reader's ChatGPT or other AI-tool account.
2. **Reading rhythm.** `/latest` sends users without editions to `/onboarding`. Choose intended reading minutes and total material minutes independently (defaults 60 and 120). Extra material offers choice, not homework. Choose delivery every day, on weekdays (Monday–Friday), or weekly on a selected day, plus a local delivery time (initial suggestion: daily at 08:00). First setup suggests the browser timezone; existing saved preferences are preserved.
3. **Starting point.** Choose from twelve broad topics and optionally add a sentence about current curiosities, preferred sources or things to avoid. No topics and no notes is valid. These inputs seed an editable Markdown constitution; topics are not maintained as an enduring selector. A deterministic template creates the first document. An LLM-based draft is a possible later enhancement.
4. **First edition.** Review the saved document and delivery rhythm, choose **ChatGPT** (the default) or **Another AI tool**, connect using the same app account, and copy the generated instruction. The ChatGPT option is unchanged from the ChatGPT-only flow: it asks ChatGPT to read the assembled brief, search widely with an internal candidate list, submit only the finished edition, and set up a recurring task at the saved frequency and local time. Existing readers can copy the recurring instruction without requesting another first edition. Older preferences without a delivery choice retain a one-edition prompt until a rhythm is saved. `CERULEAN_CHATGPT_PLUGIN_URL` supplies the real published listing URL when available. Until configured, the page says the public plugin is unavailable.

   **Another AI tool** (`/onboarding?step=connect&tool=other`) shows the MCP server URL, which is the OAuth audience `CERULEAN_MCP_RESOURCE` rather than the browsing host, because clients reject any other URL. Steps: add a remote MCP server or custom connector with that URL (Claude: Customize → Connectors → Add custom connector), sign in with the same Filtered account, and paste the instruction. If `CERULEAN_MCP_PUBLIC_CLIENT_ID` is set, readers are told to enter it as the OAuth client ID with no secret; otherwise the page says tools needing their own sign-in client can't finish connecting yet (see [client compatibility](MCP.md#client-compatibility)). Its instruction states the preferred schedule but asks the tool to set up a scheduled task only if it can, and to say plainly if it can't, so the reader asks for each edition. Without a saved rhythm it is the same one-edition instruction ChatGPT gets. The choice is a link, not a saved setting.
5. **Return to read.** Check for an edition or follow the private URL the curator returns. An existing edition takes precedence at `/latest`. The wizard also links to the latest edition once one exists. Opening the plugin or copying a prompt never claims that generation has started.
6. **Establish the ritual.** Confirm the recurring task in ChatGPT, or in another tool that can schedule; with a tool that can't, the reader asks for each edition. The app saves the delivery preference but does not create or synchronize external schedules. After changing delivery preferences, copy the updated instruction into the AI tool; it asks to update an existing task rather than create a duplicate. App settings remain the source of reading volume and editorial preferences on every run.

Each submitted step is saved per account; users resume at their saved step. Settings renders and edits the same Markdown constitution that the MCP tool reads and updates. Existing readers go directly to their editions and are not forced through setup. Existing JSON preferences remain compatible; older guidelines and topics seed a document until it is first saved.

## Deliberate limits

- No connection handshake or live generation indicator yet. Browser login and an old successful tool call do not prove current ChatGPT or other-tool authorization.
- No automatic first edition or app-owned scheduling. A short request in the reader's AI tool initiates the first edition.
- No automatic interpretation of unread pieces as reading debt. Skipping is intentional; resurfacing requires a future explicit signal.
- Topic choices need real-reader feedback. Optional notes provide specificity without requiring a long personal brief.
- No inference from a user's full ChatGPT or other AI-tool history. Saved app preferences are the reliable baseline.

## Verification and launch gate

The owner previously completed live hosted sign-in and confirmed access to existing editions. Automated coverage checks account isolation, per-user MCP preferences, wizard validation and merging, protected setup pages and the no-edition redirect. Production build and TypeScript pass.

Still required: interactive desktop/mobile wizard checks; publish and authorize the ChatGPT plugin; observe a fresh external user's signup → saved brief → authorization → first private edition; verify recurring runs and token refresh. For other tools: register an Auth0 client for them, then connect Claude as a fresh reader and publish a first edition; until that passes, Claude and other MCP tools are expected to work but unverified. The owner's successful login is not a substitute for that journey.

Production deployment: `dpl_BYDapCWNQhhRyWnF6ntF9q4waHfK`, 17 September 2026. Existing readers can test directly at `/onboarding?step=rhythm`; `/latest` continues to open their edition.

## Assisted pilot feedback — 17 September 2026

The owner reports that Sean completed guided setup/onboarding and created his first edition, reacting positively. This establishes an assisted first-edition success, not unaided setup or recurring delivery. Capture the assistance required and use it to prioritize onboarding fixes. See [the next-work checklist](TODO.md).
