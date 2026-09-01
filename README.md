# Cerulean Crest

Cerulean Crest is a finite, personal daily magazine. A scheduled curator publishes a complete issue through an authenticated API; the site opens on today’s issue (or the latest available issue) and keeps a calm archive of past editions.

## Start here

- [Publishing an edition](docs/PUBLISHING.md) — the short runbook for a person or another agent.
- [Deployment](docs/DEPLOYMENT.md) — production setup and required secrets.
- [Roadmap](docs/ROADMAP.md) — MVP, multi-user product, then agent platform.
- [SQLite schema](schema.sql) and [Postgres schema](schema.postgres.sql) — the current data model.

## Local development

Requirements: Node.js 22 or later and npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The app creates `.data/cerulean-crest.db` and seeds the 1 September 2026 issue when the database is empty.

Useful commands:

```bash
npm run typecheck
npm test
npm run build
```

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `CERULEAN_API_USER` | For publishing | HTTP Basic Auth username. |
| `CERULEAN_API_PASSWORD` | For publishing | Long, random HTTP Basic Auth password. |
| `APP_TIME_ZONE` | No | Time zone used to decide what “today” means. Defaults to `Africa/Johannesburg`. |
| `DATABASE_URL` | Production | Neon/Postgres connection string. When absent, the app uses local SQLite. |
| `DATABASE_PATH` | No | Override the local SQLite file path. Ignored when `DATABASE_URL` is present. |

Never commit real credentials. Basic Auth is safe here only behind HTTPS; production Vercel URLs provide HTTPS automatically.

## Architecture

- Next.js App Router renders the reader, archive and API.
- The public site reads directly from the database in Server Components.
- `PUT /api/issues/:date` validates and atomically replaces one complete issue.
- `GET /api/issues/:date` returns a stored issue for authenticated verification.
- Local reading progress lives in the browser. It intentionally requires no account in the MVP.
- Storage selects itself at runtime: SQLite locally, Neon Postgres when `DATABASE_URL` exists.

The relational hierarchy is intentionally small:

```text
issue (one date)
└── sections (ordered)
    └── items (ordered)
```

This keeps today’s payload usable in later versions. Multi-user support adds ownership and feedback without changing the editorial issue structure.

## API behaviour

- Authentication: HTTP Basic Auth.
- Content type: `application/json`.
- Success: `201` when a date is first created, `200` when it is replaced.
- Validation: `422` with field details; the declared duration must be within two minutes of the item total.
- Date mismatch: `409` when the body date differs from the URL.
- Unauthorized: `401` with a Basic Auth challenge.

Publishing is idempotent but replacement-based: sending the same date twice does not create duplicates, and the second complete payload replaces the first.
