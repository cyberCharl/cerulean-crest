# User accounts and first editions

The first multi-user slice adds Auth0 browser signup/sign-in, private editions and archives, a public landing page, and per-reader editorial settings. It retains Cerulean Crest branding and the existing Vercel project.

## Identity and access

The browser uses Auth0's Next.js SDK with authorization-code login, encrypted HTTP-only session cookies, and `/auth/login`, `/auth/callback`, and `/auth/logout`. Signup uses `/auth/login?screen_hint=signup`. The token endpoint is not exposed to the browser. Signup returns to `/today`; an empty archive links to settings.

The server derives ownership from the browser session or verified MCP access token's subject. The caller cannot choose an owner in the edition payload. All edition queries, archive navigation, recent-history tools, and settings are scoped by subject. Machine subjects are rejected by MCP authentication. One Auth0 issuer is configured per deployment; browser and MCP clients must use that same tenant so identities match.

The Basic recovery publisher and optional pilot bearer token remain restricted to the explicitly configured `CERULEAN_OWNER_SUBJECT`. They are not general-user credentials. Missing configuration fails closed.

## Browser configuration

Create separate Auth0 Regular Web Applications for each environment. Configure exact callback `APP_ORIGIN/auth/callback`, allowed logout URL `APP_ORIGIN`, and authorization-code/refresh-token grants. Enable the password connection; do not rely on unconfigured social-login developer credentials. Configure:

```text
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=... # random 32-byte hex secret, different per environment
CERULEAN_APP_URL=https://your-app-host
CERULEAN_MARKETING_URL=https://your-landing-host
```

Use `http://localhost:3000` for Development. See [deployment domain configuration](DEPLOYMENT.md#custom-domain) for using two domains with one Vercel project. Auth0 connection-client management uses `/connections/{id}/clients`; the legacy `enabled_clients` field is retired on this tenant.

For new readers to authorize MCP, the app-specific API's scopes represent reading/writing **their own** editions. The former owner-role-only RBAC policy must be removed from this API, while retaining explicit user client grants for approved MCP clients, consent, and denial of machine-to-machine grants. The application enforces tenant ownership in addition to scopes. No Management API scopes belong in reader tokens.

## Migration and recovery

Migration `002-edition-ownership.sql` adds ownership, replaces global date uniqueness with `(owner_subject, issue_date)`, and creates editorial settings. The migration runner assigns legacy NULL ownership only when `CERULEAN_OWNER_SUBJECT` is supplied; it never assigns old editions to the first signup. Unassigned editions remain inaccessible. SQLite rebuilds the original issue table while preserving parent/child IDs and follows the same explicit-owner rule.

Rehearse on a production copy and preserve a recovery branch before the live migration. Compare the full issue/section/item contents before and after. After accepting multiple owners, **do not roll application code back to the old globally scoped reader**: it can expose or mix readers' editions and its publishing conflict target no longer matches the schema. Recovery must retain ownership checks or restore an isolated pre-migration copy under controlled access.

## Settings and remaining work

`/settings` stores intended reading minutes, total edition minutes, timezone, and free-text editorial guidelines. `get_editorial_brief` reads the requesting user's current values on every call. Item-count guidance scales down for small editions. Surplus material intentionally offers choice; unread pieces must not automatically roll forward. Delivery schedules stay in ChatGPT.

The ChatGPT connection is still an early developer-mode pilot requiring connector setup/credentials from the maintainer. A website account alone does not create a ChatGPT connection or schedule. Public plugin distribution and unattended delivery for a new reader remain separate verification gates. Reading progress remains browser-local; persisted feedback and “include in a future edition” are not implemented in this slice.

Anonymous `/api/health` returns liveness only. Detailed owner delivery health requires the Basic recovery credential, and the GitHub health workflow needs `CERULEAN_API_USER` and `CERULEAN_API_PASSWORD` repository secrets. This avoids exposing a reader's edition dates publicly.
