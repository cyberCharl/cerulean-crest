# Filtered

Filtered is a finite, personal magazine on your chosen schedule. Readers sign in to a small front page, optionally open the rest of the paper, and keep links as candidates, for later, or pinned. A connected ChatGPT curator reads their Markdown editorial constitution alongside saved reading candidates, feedback and friend recommendations, then publishes the complete final selection through MCP.

The candidate collection and two-stage reader are implemented on this branch; they have **not yet been deployed to production**.

Production: [filtered.page](https://filtered.page). The existing `cerulean-crest.vercel.app` endpoint remains available for integration compatibility.

## Start here

- [Reading model](docs/READING.md) — the signed-in paper, durable links, exposure, retirement and metadata behavior.
- [Reading backlog](docs/BACKLOG.md) — all six product ideas, implementation status, and deferred questions.
- [Publishing an edition](docs/PUBLISHING.md) — the short runbook for a person or another agent.
- [MCP integration](docs/MCP.md) — the scheduled-agent pilot, local test flow and external-user gates.
- [ADR 0001](docs/adr/0001-publish-scheduled-editions-through-mcp.md) — why scheduled editions use an MCP app instead of GitHub or email transport.
- [Deployment](docs/DEPLOYMENT.md) — production setup and required secrets.
- [Roadmap](docs/ROADMAP.md) — MVP, multi-user product, then agent platform.
- [User accounts](docs/USER_ACCOUNTS.md) — browser authentication, ownership migration, settings, and current onboarding limits.
- [SQLite schema](lib/sqlite-schema.ts) and [Postgres migrations](migrations/) — the current data model. SQLite applies its schema on startup; Postgres changes go through versioned migrations.

## Local development

Requirements: **Node.js 24.15 or newer in the Node 24 line** and npm. The metadata parser uses jsdom 30, which requires Node 24.15+; an older Node 24 release is insufficient. Node 24.22.1 was used for implementation verification. Run `nvm use` if you use nvm.

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

- Next.js App Router renders the paper, link collection and API.
- The public homepage is a landing page; `/latest`, `/links`, dated editions, saved articles and settings require a browser session. `/today` redirects to `/latest`; `/archive` redirects signed-in readers to `/links`. The development prototype and its authentication bypass have been removed.
- Authenticated `/api/health` checks the owner's saved delivery schedule and timezone. Weekly and weekday schedules stay current between deliveries; readers without a saved schedule report `unscheduled`. The former `EDITION_DEADLINE_HOUR` setting is no longer used.
- Server Components read only the authenticated user's database rows. Edition dates are unique per user.
- `PUT /api/issues/:date` validates and atomically replaces one complete issue.
- `GET /api/issues/:date` returns a stored issue for authenticated verification.
- Commitments, dormancy, explicit read marks and stage exposure are persisted per account and source URL across devices. Opening a source does not mark it read. Only an opened stage affects retirement; ordinary unread candidates become dormant, Maybe later skips one edition, and Pinned remains eligible. There is no completion counter.
- Capturing a link requires only its URL; a title is optional. Bounded background work extracts title and reading-time metadata when available, without storing source article bodies. Inaccessible or unsuitable pages keep their links and an unknown reading time.
- Existing bookmarks are adopted as pinned once. Account-scoped version-2 browser read marks are imported when the reader opens the paper or link collection, without overwriting newer explicit server choices. See [Reading model](docs/READING.md) for migration boundaries.
- The assembled editorial brief includes eligible saved candidates and excluded URLs; complete-edition publishing remains compatible. Personal notebook and managed-curator features remain backlog work.
- Storage selects itself at runtime: SQLite locally, Neon Postgres when `DATABASE_URL` exists.

The relational hierarchy is intentionally small:

```text
issue (one date)
└── sections (ordered)
    └── items (ordered)
```

Ownership scopes this hierarchy without changing the editorial payload structure. Separate reading-link, edition and selection records preserve reader choices and exposure independently of the publication layout. Retired dated pages show a quiet retirement message instead of the old paper; the stored publishing payload is retained for compatibility and history. Per-user settings and candidate context are returned by `get_editorial_brief`; scheduling remains external.

## API behaviour

- Authentication: HTTP Basic Auth.
- Content type: `application/json`.
- Success: `201` when a date is first created, `200` when it is replaced.
- Validation: `422` with field details for malformed or incomplete editions. Material minutes may vary from the sum of item estimates.
- Date mismatch: `409` when the body date differs from the URL.
- Unauthorized: `401` with a Basic Auth challenge.

Publishing is idempotent but replacement-based: sending the same date twice does not create duplicates, and the second complete payload replaces the first.
