# Deployment

The recommended production stack is Vercel for the Next.js application and Neon Postgres for durable relational storage. Vercel’s Neon integration provisions the database and injects its connection string into the project. Both the database and server functions use Frankfurt (`fra1`) so database round trips stay within one region.

Current production: [cerulean-crest.vercel.app](https://cerulean-crest.vercel.app). The Vercel project is `cerulean-works/cerulean-crest`. Each environment has a separate Neon resource on the free plan:

| Environment | Resource | Neon project |
| --- | --- | --- |
| Production | `cerulean-crest-db` | `flat-tooth-73377286` |
| Preview | `cerulean-crest-preview-db` | `curly-sky-25679111` |
| Development | `cerulean-crest-development-db` | `fragrant-bar-24987248` |

Production's database and Basic publishing credential were preserved during isolation. Production MCP uses Auth0 OAuth with per-reader ownership; its temporary pilot token has been removed. Preview and development have independent publishing passwords and MCP tokens. The developer checkout's `.env.local` points to Development. Browser login additionally requires the [user-account configuration](USER_ACCOUNTS.md).

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
CERULEAN_API_USER
CERULEAN_API_PASSWORD
CERULEAN_MCP_TOKEN           # pilot only; use a different generated bearer secret
CERULEAN_MCP_AUTH_MODE        # oauth in Production; pilot in Preview/Development
APP_TIME_ZONE=Africa/Johannesburg
DATABASE_URL                 # supplied by the Neon integration
DATABASE_URL_UNPOOLED        # supplied by Neon; used only for explicit migrations
```

Use a generated, high-entropy API password. Do not prefix either credential with `NEXT_PUBLIC_`. Production additionally requires `CERULEAN_OAUTH_ISSUER`, `CERULEAN_OAUTH_JWKS_URL`, `CERULEAN_MCP_RESOURCE`, and `CERULEAN_OWNER_SUBJECT`; use the verified values described in [Auth0 setup](AUTH0_SETUP.md).

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
curl --fail-with-body https://YOUR-DOMAIN/
curl --fail-with-body \
  --user "$CERULEAN_API_USER:$CERULEAN_API_PASSWORD" \
  https://YOUR-DOMAIN/api/issues/2026-09-01
```

## Custom domain

Keep the existing `cerulean-crest` Vercel project. The landing page and application share one deployment. On the existing `cerulean-crest.vercel.app` domain, `/` is the landing page and `/today` opens the signed-in reader. `/landing` is also available for reviewing the landing page.

When a name is final, attach both the main domain and application subdomain to this project. For example, if `curation-station.com` is acquired and selected:

```bash
npx vercel domains add curation-station.com cerulean-crest
npx vercel domains add app.curation-station.com cerulean-crest
npx vercel domains inspect curation-station.com
npx vercel domains inspect app.curation-station.com
```

Use the exact DNS records returned by Vercel at the registrar; these commands do not purchase the domain. Configure production origins and redeploy:

```text
CERULEAN_MARKETING_URL=https://curation-station.com
CERULEAN_APP_URL=https://app.curation-station.com
```

The marketing homepage remains the landing page; the separately configured application host's homepage redirects to `/today`. Signup and sign-in links use the application origin, keeping browser sessions on that host. The project name and visible product name do not have to match either domain. Neither proposed domain has been registered or attached by this implementation.

`CERULEAN_APP_URL` takes precedence over the Auth0 SDK's `APP_BASE_URL` and the legacy `CERULEAN_SITE_URL`. Use one consistent application origin per environment; for local browser login use `http://localhost:3000`. Do not copy production origins or credentials into Preview/Development. Browser OAuth needs an exact, registered callback, so authenticated preview testing needs a known preview origin and its own Auth0 browser client.

For a later rename, update these two origins plus Auth0's exact callback (`APP_ORIGIN/auth/callback`) and allowed logout URL (`APP_ORIGIN`). Update the MCP connection URL in ChatGPT as well. The existing `CERULEAN_MCP_RESOURCE` is an OAuth audience identifier: do not silently derive or change it with the hostname. Changing that audience requires coordinated provider/client configuration and reauthorization. Retain the old audience until deliberately migrated. See [Auth0 setup](AUTH0_SETUP.md).

Vercel reference: [adding domains to a project](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## Operational notes

- Production must have `DATABASE_URL`; the application refuses to fall back to non-durable SQLite on Vercel.
- Normal requests use Neon's pooled URL. Explicit migrations use `DATABASE_URL_UNPOOLED` when available.
- Keep the Neon database and Vercel Functions in nearby regions when choosing regions.
- Rotate the publishing password if it is exposed, and update the scheduled publisher at the same time.
- The `/mcp` pilot endpoint requires `CERULEAN_MCP_AUTH_MODE=pilot` and `Authorization: Bearer $CERULEAN_MCP_TOKEN`. ChatGPT requires the OAuth setup in `MCP.md`; the custom bearer header is only for capable pilot clients.
- `.github/workflows/checks.yml` runs Node 24 type, unit, build and local HTTP checks. For the real Postgres checks, explicitly supply `TEST_DATABASE_URL`, `TEST_DATABASE_URL_UNPOOLED`, and `TEST_DATABASE_ALLOW_WRITES=true` for an isolated database. The test refuses to overwrite a pre-existing test date.
- New Vercel environment variables take effect in new deployments. Historical deployment URLs retain their old configuration; do not use historical previews to test publishing.
- Anonymous `GET /api/health` returns liveness only. With the Basic recovery credential it returns owner delivery status: `current` or `waiting` (200), `late` (503 after the default 09:00 Johannesburg deadline), or `unavailable` (503). The GitHub workflow needs the two publishing repository secrets and its updated version pushed to the default branch.
- A rollback does not undo database changes. **Do not roll back to a pre-ownership reader after the multi-user migration**: its unscoped queries would expose or mix editions. Preserve ownership checks in any rollback, or restore a recovery branch under controlled access. Rehearse migrations on a production copy first.
