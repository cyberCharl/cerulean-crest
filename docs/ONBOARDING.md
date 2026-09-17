# New-user onboarding

Updated 17 September 2026. Accounts, landing, settings and the wizard are deployed. Unit, authenticated HTTP, type and production-build checks pass. Production smoke checks pass; interactive owner testing is pending. The public ChatGPT plugin has not been submitted or published. See [publication research](CHATGPT_PUBLICATION.md) and [announcement readiness](ANNOUNCEMENT_PLAN.md).

## Implemented wizard

1. **Sign up from the landing page.** Auth0 hosts signup. The website and curator must use the same Cerulean Crest account; this is separate from the ChatGPT account.
2. **Reading rhythm.** `/today` sends users without editions to `/onboarding`. Choose intended reading minutes and total material minutes independently (defaults 60 and 120). Extra material offers choice, not homework. First setup suggests the browser timezone; existing saved preferences are preserved.
3. **Interests.** Choose from twelve broad topics and optionally add a sentence about current curiosities, preferred sources or things to avoid. No topics and no notes is valid: begin with a broad mix. Topic choices are starting points, not exclusive filters. The agent receives these alongside reading volume through `get_editorial_brief`.
4. **First edition.** Review the saved brief, connect in ChatGPT using the same app account, and copy a short first-edition request. `CERULEAN_CHATGPT_PLUGIN_URL` supplies the real published listing URL when available. Until configured, the page explicitly says the public plugin is unavailable. No guessed listing link or shared OAuth credentials are exposed.
5. **Return to read.** Check for an edition or follow the private URL from ChatGPT. An existing edition takes precedence at `/today`. The wizard also links to the latest edition once one exists. Opening the plugin or copying a prompt never claims that generation has started.
6. **Establish the ritual.** After trying an edition, arrange recurring scheduling externally in ChatGPT. App settings remain the source of reading volume and editorial preferences on every run.

Each submitted step is saved per account; users resume at their saved step. Settings exposes the same topic choices for subsequent edits. Existing readers go directly to their editions and are not forced through setup. Existing JSON preferences remain compatible; no schema migration is needed.

## Deliberate limits

- No connection handshake or live generation indicator yet. Browser login and an old successful tool call do not prove current ChatGPT authorization.
- No automatic first edition or app-owned scheduling. A short ChatGPT request initiates the first edition.
- No automatic interpretation of unread pieces as reading debt. Skipping is intentional; resurfacing requires a future explicit signal.
- Topic choices need real-reader feedback. Optional notes provide specificity without requiring a long personal brief.
- No inference from a user's full ChatGPT history. Saved app preferences are the reliable baseline.

## Verification and launch gate

The owner previously completed live hosted sign-in and confirmed access to existing editions. Automated coverage checks account isolation, per-user MCP preferences, wizard validation and merging, protected setup pages and the no-edition redirect. Production build and TypeScript pass.

Still required: interactive desktop/mobile wizard checks; publish and authorize the ChatGPT plugin; observe a fresh external user's signup → saved brief → authorization → first private edition; verify recurring runs and token refresh. The owner's successful login is not a substitute for that journey.

Production deployment: `dpl_BYDapCWNQhhRyWnF6ntF9q4waHfK`, 17 September 2026. Existing readers can test directly at `/onboarding?step=rhythm`; `/today` continues to open their edition.

## Assisted pilot feedback — 17 September 2026

The owner reports that Sean completed guided setup/onboarding and created his first edition, reacting positively. This establishes an assisted first-edition success, not unaided setup or recurring delivery. Capture the assistance required and use it to prioritize onboarding fixes. See [the next-work checklist](TODO.md).
