# Cerulean Crest

Cerulean Crest is a finite, personal daily magazine. Readers sign in to private editions and configure their reading volume and editorial guidelines in the app. An externally scheduled ChatGPT curator retrieves that brief and publishes complete editions through authenticated MCP tools.

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
| `CERULEAN_MCP_AUTH_MODE` | MCP | `pilot` for a dedicated bearer token; `oauth` for the owner-only ChatGPT integration. |
| `CERULEAN_MCP_TOKEN` | Pilot | A separate generated secret for each environment. |
| `CERULEAN_OAUTH_ISSUER`, `CERULEAN_OAUTH_JWKS_URL`, `CERULEAN_MCP_RESOURCE`, `CERULEAN_OWNER_SUBJECT` | OAuth | Identity provider, token audience, and allowed owner; see the MCP runbook. |
| `EDITION_DEADLINE_HOUR` | No | Local hour after which missing today's edition makes `/api/health` return 503; defaults to 9. |

Never commit real credentials. Basic Auth is safe here only behind HTTPS; production Vercel URLs provide HTTPS automatically.

## Architecture

- Next.js App Router renders the reader, archive and API.
- The public homepage is a landing page; `/today`, dated editions, archive, and settings require a browser session.
- Server Components read only the authenticated user's database rows. Edition dates are unique per user.
- `PUT /api/issues/:date` validates and atomically replaces one complete issue.
- `GET /api/issues/:date` returns a stored issue for authenticated verification.
- Reading progress remains browser-local, scoped by account and keyed by source URL so it survives replacement of database item IDs. Server feedback and resurfacing requests are later work.
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
- Validation: `422` with field details; the declared duration must be within two minutes of the item total.
- Date mismatch: `409` when the body date differs from the URL.
- Unauthorized: `401` with a Basic Auth challenge.

Publishing is idempotent but replacement-based: sending the same date twice does not create duplicates, and the second complete payload replaces the first.
