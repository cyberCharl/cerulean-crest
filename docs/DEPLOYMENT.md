# Deployment

The recommended production stack is Vercel for the Next.js application and Neon Postgres for durable relational storage. Vercel’s Neon integration provisions the database and injects its connection string into the project. Both the database and server functions use Frankfurt (`fra1`) so database round trips stay within one region.

Current production: [cerulean-crest.vercel.app](https://cerulean-crest.vercel.app). The Vercel project is `cerulean-works/cerulean-crest`; the Neon resource is `cerulean-crest-db` on its free plan.

## One-time account setup

From the project directory:

```bash
npx vercel login
npx vercel link --project cerulean-crest
npx vercel integration add neon --plan free_v3 --name cerulean-crest-db -m region=fra1 -m auth=false
```

During the Neon step, choose the free plan for the MVP and connect it to all environments you intend to use. Then configure these server-only variables in Vercel:

```text
CERULEAN_API_USER
CERULEAN_API_PASSWORD
APP_TIME_ZONE=Africa/Johannesburg
DATABASE_URL                 # supplied by the Neon integration
DATABASE_URL_UNPOOLED        # supplied by Neon; used only for schema setup
```

Use a generated, high-entropy API password. Do not prefix either credential with `NEXT_PUBLIC_`.

## Validate and deploy

```bash
npm run typecheck
npm test
npm run build
npx vercel --prod
```

The first database request creates the three tables and seeds the example issue if the database is empty. Verify:

```bash
curl --fail-with-body https://YOUR-DOMAIN/
curl --fail-with-body \
  --user "$CERULEAN_API_USER:$CERULEAN_API_PASSWORD" \
  https://YOUR-DOMAIN/api/issues/2026-09-01
```

## Custom domain

The generated `*.vercel.app` domain is sufficient for launch. A custom domain is optional and can be attached later in the Vercel project’s Domains settings; Vercel will provide the required DNS record.

## Operational notes

- Production must have `DATABASE_URL`; the application refuses to fall back to non-durable SQLite on Vercel.
- Normal requests use Neon's pooled URL. Initial schema setup uses `DATABASE_URL_UNPOOLED` when available.
- Keep the Neon database and Vercel Functions in nearby regions when choosing regions.
- Rotate the publishing password if it is exposed, and update the scheduled publisher at the same time.
- Preview deployments should use a separate database branch or database from production before multi-user data exists.
- This initial production release was deployed directly from the local checkout. Connect the intended Git repository when automatic deploys on push become useful.
