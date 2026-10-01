# Curiofold

Curiofold is a finite, personal magazine on your chosen schedule. Readers sign in to private editions and edit a Markdown editorial constitution. A connected ChatGPT curator reads that document with current feedback and friend recommendations, researches an edition, and publishes the complete final selection through MCP.

Production: [cerulean-crest.vercel.app](https://cerulean-crest.vercel.app)

## Start here

- [Publishing an edition](docs/PUBLISHING.md) — the short runbook for a person or another agent.
- [MCP integration](docs/MCP.md) — the scheduled-agent pilot, local test flow and external-user gates.
- [ADR 0001](docs/adr/0001-publish-scheduled-editions-through-mcp.md) — why scheduled editions use an MCP app instead of GitHub or email transport.
- [Deployment](docs/DEPLOYMENT.md) — production setup and required secrets.
- [Roadmap](docs/ROADMAP.md) — MVP, multi-user product, then agent platform.
- [User accounts](docs/USER_ACCOUNTS.md) — browser authentication, ownership migration, settings, and current onboarding limits.
- [SQLite schema](lib/sqlite-schema.ts) and [Postgres migrations](migrations/) — the current data model. SQLite applies its schema on startup; Postgres changes go through versioned migrations.

## Local development

Requirements: Node.js 24 (matching Vercel and CI) and npm. Run `nvm use` if you use nvm.

```bash
cp .env.example .env.local
npm ci
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Without `DATABASE_URL`, the app creates `.data/cerulean-crest.db`; demo content is added only by the explicit seed command. To use the project's isolated development Postgres instead, pull **development** variables with `vercel env pull .env.local --environment=development`, run `npm run db:migrate`, then optionally `npm run db:seed`. Never pull production credentials into `.env.local`.

Useful commands:

```bash
npm run typecheck
npm test
npm run build
npm run test:integration
```

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `CERULEAN_API_USER` | For publishing | HTTP Basic Auth username. |
| `CERULEAN_API_PASSWORD` | For publishing | Long, random HTTP Basic Auth password. |
| `APP_TIME_ZONE` | No | Time zone used to decide what “today” means. Defaults to `Africa/Johannesburg`. |
| `DATABASE_URL` | Production | Neon/Postgres connection string. When absent, the app uses local SQLite. |
| `DATABASE_URL_UNPOOLED` | Migrations | Direct Neon connection used by the explicit migration command, outside normal requests. |
| `DATABASE_PATH` | No | Override the local SQLite file path. Ignored when `DATABASE_URL` is present. |
| `CERULEAN_MCP_AUTH_MODE` | MCP | `pilot` for a dedicated bearer token; `oauth` for per-reader ChatGPT authorization. |
| `CERULEAN_MCP_TOKEN` | Pilot | A separate generated secret for each environment. |
| `CERULEAN_OAUTH_ISSUER`, `CERULEAN_OAUTH_JWKS_URL`, `CERULEAN_MCP_RESOURCE` | OAuth | Identity provider and token audience; see the MCP runbook. |
| `CERULEAN_OWNER_SUBJECT` | Pilot/recovery | Explicit owner for pilot MCP, Basic Auth publishing, health monitoring and legacy data migration. OAuth readers use their authenticated subject. |

Never commit real credentials. Basic Auth is safe here only behind HTTPS; production Vercel URLs provide HTTPS automatically.

## Architecture

- Next.js App Router renders the reader, archive and API.
- The public homepage is a landing page; `/latest`, dated editions, archive, and settings require a browser session. Legacy `/today` links redirect to `/latest`.
- Authenticated `/api/health` checks the owner's saved delivery schedule and timezone. Weekly and weekday schedules stay current between deliveries; readers without a saved schedule report `unscheduled`. The former `EDITION_DEADLINE_HOUR` setting is no longer used.
- Server Components read only the authenticated user's database rows. Edition dates are unique per user.
- `PUT /api/issues/:date` validates and atomically replaces one complete issue.
- `GET /api/issues/:date` returns a stored issue for authenticated verification.
- Reading progress remains browser-local, scoped by account and keyed by source URL so it survives replacement of database item IDs. Article feedback is stored per account and joins the read-only curation context; a general resurfacing queue remains later work.
- Storage selects itself at runtime: SQLite locally, Neon Postgres when `DATABASE_URL` exists.

The relational hierarchy is intentionally small:

```text
issue (one date)
└── sections (ordered)
    └── items (ordered)
```

Ownership scopes this hierarchy without changing the editorial payload structure. Per-user settings are returned by `get_editorial_brief`; scheduling remains external.

## API behaviour

- Authentication: HTTP Basic Auth.
- Content type: `application/json`.
- Success: `201` when a date is first created, `200` when it is replaced.
- Validation: `422` with field details for malformed or incomplete editions. Material minutes may vary from the sum of item estimates.
- Date mismatch: `409` when the body date differs from the URL.
- Unauthorized: `401` with a Basic Auth challenge.

Publishing is idempotent but replacement-based: sending the same date twice does not create duplicates, and the second complete payload replaces the first.
