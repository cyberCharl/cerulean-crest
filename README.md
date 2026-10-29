# Filtered

Filtered is a finite, personal magazine on your chosen schedule. Readers sign in to a small front page, optionally open the rest of the paper, and keep links as candidates, for later, or pinned. A connected AI curator (ChatGPT, Claude or another MCP tool) reads their Markdown editorial constitution alongside saved reading candidates, feedback and friend recommendations, then publishes the complete final selection through MCP.

The candidate collection and two-stage reader were deployed to production on **29 October 2026**. See [the release record](docs/DEPLOYMENT.md#reading-release--29-october-2026) for verification and rollout details.

Production: [filtered.page](https://filtered.page). AI tools connect to `https://filtered.page/mcp`.

## Start here

- [Reading model](docs/READING.md) — the signed-in paper, durable links, exposure, retirement and metadata behavior.
- [Reading backlog](docs/BACKLOG.md) — all six product ideas, implementation status, and deferred questions.
- [Agent access](docs/AGENT_ACCESS.md) — the MCP server, its tools, sign-in, Auth0 clients and ChatGPT publication.
- [ADR 0001](docs/adr/0001-publish-scheduled-editions-through-mcp.md) — why scheduled editions use an MCP app instead of GitHub or email transport.
- [Deployment](docs/DEPLOYMENT.md) — production setup and required secrets.
- [Roadmap](docs/ROADMAP.md) — MVP, multi-user product, then agent platform.
- [User accounts](docs/USER_ACCOUNTS.md) — browser authentication, ownership migration, settings, and current onboarding limits.
- [SQLite schema](lib/sqlite-schema.ts) and [Postgres migrations](migrations/) — the current data model. SQLite applies its schema on startup; Postgres changes go through versioned migrations.

## Local development

Requirements: **Node.js 24** and npm. Node 24.22.1 was used for implementation verification. The metadata parser is pinned to jsdom 26.1.0 so it also loads when the deployment runtime disables CommonJS `require()` of ES modules; a focused test checks that setting. Run `nvm use` if you use nvm.

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
| `APP_TIME_ZONE` | No | Time zone used to decide what “today” means. Defaults to `Africa/Johannesburg`. |
| `DATABASE_URL` | Production | Neon/Postgres connection string. When absent, the app uses local SQLite. |
| `DATABASE_URL_UNPOOLED` | Migrations | Direct Neon connection used by the explicit migration command, outside normal requests. |
| `DATABASE_PATH` | No | Override the local SQLite file path. Ignored when `DATABASE_URL` is present. |
| `CERULEAN_OAUTH_ISSUER`, `CERULEAN_OAUTH_JWKS_URL`, `CERULEAN_MCP_RESOURCE` | MCP | Identity provider and token audience. `CERULEAN_MCP_RESOURCE` is also the URL readers enter in their AI tool. |
| `CERULEAN_MCP_DEV_TOKEN`, `CERULEAN_MCP_DEV_SUBJECT` | Local only | A fixed bearer token for MCP Inspector and integration tests, acting as that subject (default `dev-reader`). Ignored on any Vercel deployment. |

Never commit real credentials.

## Architecture

- Next.js App Router renders the paper, link collection and API.
- The public homepage is a landing page; `/latest`, `/links`, dated editions, saved articles and settings require a browser session. `/today` redirects to `/latest`; `/archive` redirects signed-in readers to `/links`. The development prototype and its authentication bypass have been removed.
- `/api/health` is public liveness only.
- Server Components read only the authenticated user's database rows. Edition dates are unique per user.
- Editions arrive only through the MCP server at `/mcp`, from a reader's connected AI tool. Publishing is create-only: an existing date is left unchanged.
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
