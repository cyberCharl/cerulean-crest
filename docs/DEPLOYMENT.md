# Deployment

The recommended production stack is Vercel for the Next.js application and Neon Postgres for durable relational storage. Vercel’s Neon integration provisions the database and injects its connection string into the project.

## One-time account setup

From the project directory:

```bash
npx vercel login
npx vercel link
npx vercel integration add neon
```

During the Neon step, choose the free plan for the MVP and connect it to all environments you intend to use. Then configure these server-only variables in Vercel:

```text
CERULEAN_API_USER
CERULEAN_API_PASSWORD
APP_TIME_ZONE=Africa/Johannesburg
DATABASE_URL                 # supplied by the Neon integration
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

- Production must have `DATABASE_URL`; otherwise a serverless function would fall back to non-durable SQLite.
- Keep the Neon database and Vercel Functions in nearby regions when choosing regions.
- Rotate the publishing password if it is exposed, and update the scheduled publisher at the same time.
- Preview deployments should use a separate database branch or database from production before multi-user data exists.
