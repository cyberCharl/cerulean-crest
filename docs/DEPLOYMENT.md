# Deployment

## Auth0 custom login domain — 29 October 2026

Production browser sign-in, signup and logout now use `login.filtered.page`. Updated only Production `AUTH0_DOMAIN`; the existing browser client, application callback, MCP issuer/JWKS/audience, and account data are unchanged. The custom domain's discovery document and signing keys were verified against the existing tenant. On 30 October 2026 MCP followed: Production `CERULEAN_OAUTH_ISSUER` and `CERULEAN_OAUTH_JWKS_URL` now point at `login.filtered.page`, so AI tools sign in on the same page as the website.

Deployment `dpl_4RKDD5SaYVhnzpPPBkz7pMfyqm4k` ([immutable URL](https://cerulean-crest-11qysg64f-cerulean-works.vercel.app)), built from `7c6100a`, supersedes the reading release deployment below. All 12 staged smoke checks passed before promotion and again on `filtered.page`. Live login and signup redirects reached branded Auth0 forms successfully using cookie-aware requests; logout targets the custom domain and returns to `https://filtered.page`. Callback remains `https://filtered.page/auth/callback`. These checks verified routing and hosted forms without submitting account credentials. The deployment's runtime error scan was clear. No migration was needed.

## Reading release — 29 October 2026

The private candidate collection and layout-C paper are live at [filtered.page](https://filtered.page). Deployed application commit: `397b088` on `codex/candidates-frontpage-prototype`; [PR #2](https://github.com/cyberCharl/cerulean-crest/pull/2) remains open into `main`. Subsequent release-record commits only update documentation.

- Production deployment: `dpl_6xhB97pwn3yVvP8aEMVmdtXXWfk5`, [immutable deployment URL](https://cerulean-crest-g1i4s1pvs-cerulean-works.vercel.app), status Ready, Node 24 / Frankfurt functions. It was built with production configuration, checked without changing the public domain, then promoted.
- Applied `006-reading-links.sql` to Production. Preview was still at migration 001, so its additive migrations 002–006 were applied too. The pre-existing tables were checked by row count and content hash and were unchanged. Production adoption retained 524 distinct links from 62 editions without recording any exposure.
- Validation: typecheck, 75 unit tests, production build, two authenticated HTTP integration flows, green GitHub push/PR checks, and desktop/mobile browser review. The separate Postgres concurrency/lifecycle tests and production-copy migration rehearsal passed during implementation. All 12 staged smoke checks passed, then passed directly against filtered.page after promotion: landing/brand assets, health, private-route redirects, API/MCP authentication and 404 handling. The deployed Auth0 redirect retains the filtered.page callback. No runtime errors were found for the promoted deployment in the release log scan.
- Staging caught a `require(ESM)` incompatibility in jsdom 30 before public promotion. jsdom is pinned to 26.1.0, the extractor has a matching regression test, and parser loading is deferred into the optional metadata worker so a parser failure cannot block reading routes.
- The previous public deployment was `dpl_77m3TGsjiGKqf6bVwNeRZYFVNCcn`. Migration 006 is additive; rolling back application code leaves the durable reading tables in place. Do not remove those tables to roll back the UI.

See [Reading model](READING.md) for exposure, retirement, capture and compatibility rules. The policy-review pages in the separate PR #1 are not included in this release.

## Filtered domain rollout — 28 October 2026

The product is named **Filtered**. `filtered.page` is registered at Porkbun and attached to the existing `cerulean-works/cerulean-crest` Vercel project. DNS is verified and a TLS certificate has been issued. The existing `cerulean-crest.vercel.app` endpoint remains available for integration compatibility.

Keep Porkbun's nameservers and configure the exact apex records returned by Vercel on 28 October:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `216.198.79.1` |
| A | `@` | `64.29.17.1` |

Replace conflicting apex parking records, preserving unrelated mail and verification records. Re-check with `npx vercel domains verify filtered.page --scope cerulean-works`; DNS acceptance alone does not establish working HTTPS.

The existing Production Auth0 browser client is named Filtered and permits `https://filtered.page/auth/callback`, with `https://filtered.page` in its logout and web-origin allowlists. Existing entries are retained. Production `CERULEAN_APP_URL` and `CERULEAN_MARKETING_URL` use `https://filtered.page`. Browser sessions are host-specific, so readers may need to sign in again on the new domain; their account and stored editions are unchanged.

Keep `CERULEAN_MCP_RESOURCE` and existing client IDs unchanged. The existing ChatGPT connection can continue using its current endpoint; changing its connection URL requires a separate live authorization check. Domain registration does not rename or recreate accounts or data.

Auth0 branding was updated on 28 October: the browser, ChatGPT, development and verification clients use Filtered names and the hosted Filtered book logo; the API display name is Filtered MCP. Universal Login uses `https://filtered.page/brand/filtered/filtered-mark.svg`, favicon `https://filtered.page/icon.svg`, primary color `#9B4B36`, and background `#F2EADB`. The live login HTML was verified to contain the new logo, favicon and colors. These theme defaults are tenant-wide; future unrelated applications in `cerulean-works` will need their own branding. Client IDs, API audience, scopes, callback lists and account data were preserved; scope descriptions now use cadence-neutral Filtered wording.

The recommended production stack is Vercel for the Next.js application and Neon Postgres for durable relational storage. Vercel’s Neon integration provisions the database and injects its connection string into the project. Both the database and server functions use Frankfurt (`fra1`) so database round trips stay within one region.

Current production: [filtered.page](https://filtered.page). The Vercel project is `cerulean-works/cerulean-crest`. Each environment has a separate Neon resource on the free plan:

| Environment | Resource | Neon project |
| --- | --- | --- |
| Production | `cerulean-crest-db` | `flat-tooth-73377286` |
| Preview | `cerulean-crest-preview-db` | `curly-sky-25679111` |
| Development | `cerulean-crest-development-db` | `fragrant-bar-24987248` |

Production's database and Basic publishing credential were preserved during isolation. Production MCP uses Auth0 OAuth with per-reader ownership; its temporary pilot token has been removed. Preview and development have independent publishing passwords and MCP tokens. The developer checkout's `.env.local` points to Development. Browser login additionally requires the [user-account configuration](USER_ACCOUNTS.md).

## Local production-copy test database

On 21 September 2026, the developer checkout was switched to a fresh production copy for local design testing:

- Project: `flat-tooth-73377286` (production's Neon project).
- Parent: `main` / `br-wandering-glitter-b2kcuoib`.
- Test branch: `localhost-daybook-20260921` / `br-floral-cake-b2pswqak`.
- Test compute: `ep-misty-mode-b21lyp4o` (use its pooled endpoint for the application).

This branch is isolated from production. Only the checkout's ignored `.env.local` database settings were changed; Vercel Production, Preview, and Development configuration was not changed. All six public tables matched production by row count and content hash immediately after copying: 22 issues, 140 sections, 272 items, 3 editorial settings, 3 article-feedback records, and 3 migration records. It is a point-in-time copy and does not receive later production editions automatically.

The previous local configuration is backed up at `.data/env.local.before-daybook-copy` (ignored by Git). Copy verification metadata is at `.data/localhost-copy-verification.json`. Both are local operational files. To refresh the test data later, create a fresh branch from production and update the local connection strings; do not reset or migrate the production parent. `vercel env pull` can replace local database settings with Vercel Development's database, so check the endpoint after pulling environment configuration.

Use the [localhost sign-in instructions](USER_ACCOUNTS.md#signing-in-locally) to test with the same account that owns the live editions.

## One-time account setup

From the project directory:

```bash
npx vercel login
npx vercel link --project cerulean-crest
# Existing resources are already provisioned. For a new project, scope each explicitly:
npx vercel integration add neon --plan free_v3 --name cerulean-crest-db -m region=fra1 -m auth=false -e production
```

Create separate resources for Preview and Development, using `-e preview` and `-e development`. Do not connect the production resource to those environments. Configure these server-only variables separately in each environment:

```text
APP_TIME_ZONE=Africa/Johannesburg
DATABASE_URL                 # supplied by the Neon integration
DATABASE_URL_UNPOOLED        # supplied by Neon; used only for explicit migrations
```

Never prefix secrets with `NEXT_PUBLIC_`. Production additionally requires `CERULEAN_OAUTH_ISSUER`, `CERULEAN_OAUTH_JWKS_URL` and `CERULEAN_MCP_RESOURCE`; see [agent access](AGENT_ACCESS.md). Preview and Development serve no MCP unless given their own OAuth API; the local dev token is ignored on Vercel.

## Validate and deploy

```bash
npm run typecheck
npm test
npm run build
npm run test:integration
# Apply migrations to the intended environment before deploying that environment.
# Supply DATABASE_URL_UNPOOLED through secure process environment injection.
node --experimental-strip-types scripts/migrate.ts
npx vercel --prod
```

Requests never migrate or seed Postgres. Migrations in `migrations/` run transactionally with an advisory lock and checksum journal. `001-initial.sql` adopts existing production tables without replacing their data. `npm run db:seed` is an optional create-only operation for local/preview examples. Verify:

```bash
curl --fail-with-body https://YOUR-DOMAIN/api/health
curl -s https://YOUR-DOMAIN/.well-known/oauth-protected-resource
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://YOUR-DOMAIN/mcp   # 401
```

## Custom domain

Keep the existing `cerulean-crest` Vercel project. The landing page and application share `https://filtered.page`: `/` is the landing page and `/latest` opens the signed-in reader. `/today` redirects to `/latest`. `/landing` is also available for reviewing the landing page.

Inspect the attached domain and verify its DNS configuration:

```bash
npx vercel domains inspect filtered.page --scope cerulean-works
npx vercel domains verify filtered.page --scope cerulean-works
```

Use the exact DNS records returned by Vercel at the registrar. The production origins are:

```text
CERULEAN_MARKETING_URL=https://filtered.page
CERULEAN_APP_URL=https://filtered.page
```

Signup and sign-in links use the application origin, keeping browser sessions on that host. A separate application subdomain is optional; if configured later with a different marketing origin, its homepage redirects to `/latest`. The project name and visible product name do not have to match the domain.

`CERULEAN_APP_URL` takes precedence over the Auth0 SDK's `APP_BASE_URL` and the legacy `CERULEAN_SITE_URL`. Use one consistent application origin per environment; for local browser login use `http://localhost:3000`. Do not copy production origins or credentials into Preview/Development. Browser OAuth needs an exact, registered callback, so authenticated preview testing needs a known preview origin and its own Auth0 browser client.

For a later rename, update these two origins plus Auth0's exact callback (`APP_ORIGIN/auth/callback`) and allowed logout URL (`APP_ORIGIN`). `CERULEAN_MCP_RESOURCE` is both the MCP connection URL and the OAuth audience, so a new MCP host needs a new Auth0 API, moved client grants and every AI tool reconnected. See [agent access](AGENT_ACCESS.md).

Vercel reference: [adding domains to a project](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## Operational notes

- Production must have `DATABASE_URL`; the application refuses to fall back to non-durable SQLite on Vercel.
- Normal requests use Neon's pooled URL. Explicit migrations use `DATABASE_URL_UNPOOLED` when available.
- Keep the Neon database and Vercel Functions in nearby regions when choosing regions.
- `/mcp` accepts only Auth0 access tokens on Vercel. Locally, `CERULEAN_MCP_DEV_TOKEN` adds a fixed bearer for MCP Inspector and integration tests.
- `.github/workflows/checks.yml` runs Node 24 type, unit, build and local HTTP checks. For the real Postgres checks, explicitly supply `TEST_DATABASE_URL`, `TEST_DATABASE_URL_UNPOOLED`, and `TEST_DATABASE_ALLOW_WRITES=true` for an isolated database. The test refuses to overwrite a pre-existing test date.
- New Vercel environment variables take effect in new deployments. Historical deployment URLs retain their old configuration; do not use historical previews to test publishing.
- `GET /api/health` returns liveness only.
- A rollback does not undo database changes. **Do not roll back to a pre-ownership reader after the multi-user migration**: its unscoped queries would expose or mix editions. Preserve ownership checks in any rollback, or restore a recovery branch under controlled access. Rehearse migrations on a production copy first.
