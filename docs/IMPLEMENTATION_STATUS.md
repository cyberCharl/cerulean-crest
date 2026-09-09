# Implementation status — 9 September 2026

The hardened owner pilot is deployed at [cerulean-crest.vercel.app](https://cerulean-crest.vercel.app). Production deployment `dpl_GYw85eZzXE4kj9ukpe9qodjftSQg` is Ready. This report supersedes the observed state in the 7 September launch review; that review remains the historical record and longer-term roadmap.

## Completed

- Production, Preview, and Development use separate Neon databases and publishing credentials. The production database URL and existing Basic publishing credential were preserved. The developer checkout now selects Development. New databases use the existing integration's free plan in Frankfurt.
- Real calendar dates and HTTP(S) source URLs are validated before storage. Invalid public date routes return 404.
- Concurrent Postgres creates recover the winning edition without replacement. Explicit versioned migrations replace request-time Postgres schema setup and demo seeding.
- Reading progress uses source URLs and survives edition replacement; invalid or unavailable browser storage is handled.
- Production `/mcp` is deployed with a dedicated pilot token and three tools: editorial brief, recent editions, and create-only publishing. The brief includes the current local date and timezone.
- OAuth resource-server support validates issuer, signature, audience, expiry, owner subject, and tool scopes. OAuth configuration fails closed. An identity provider and actual ChatGPT connection are still required.
- The reader explains when today's edition is missing. `/api/health` reports delivery status, and publication logs omit credentials.
- Node 24 configuration, CI checks, a scheduled delivery-health workflow, deployment instructions, and recovery guidance are included in the repository.

## Verification

- Node 24: 17 unit tests, typecheck, production build, and local HTTP integration checks passed.
- Isolated Development Postgres: migrations are repeatable; 12 simultaneous creates produce one complete edition; replacement and transaction rollback checks passed. Test data was removed.
- Protected Vercel Preview: MCP initialization, three-tool discovery, create, duplicate preservation, recent-source retrieval, API readback, and public rendering passed. Preview credentials were rejected by Production. The temporary preview edition was removed.
- Browser: reading progress survived replacing an edition and reloading. The deployed production reader renders its latest-available notice.
- Live Production: archive and existing edition return 200; malformed dates return 404; unauthenticated MCP returns 401; authenticated MCP initialization, brief, and recent editions succeed. Basic readback confirms the original seven sections and twelve items remain intact. No test edition was written to Production.

The latest production edition remains **1 September 2026**. On 9 September the health endpoint correctly returned `late` with HTTP 503. This indicates missing daily delivery, not a failed reader deployment.

## Remaining setup and launch gates

1. **ChatGPT OAuth:** Auth0 has been selected; owner signup is pending. Follow `AUTH0_SETUP.md` to configure the tenant, client, resource/audience, JWKS URL, and owner subject; then switch the environment from `pilot` to `oauth` and redeploy. The bearer pilot cannot establish the ChatGPT connection by itself.
2. **Real publishing pilot:** complete an authenticated ChatGPT curation and publish, followed by three unattended scheduled runs. Check source quality, dates, retries, persistence, and notification delivery. These runs have not been completed.
3. **Git automation:** Vercel's project has no Git connection. The CLI connection attempt failed even though the local GitHub account has repository admin access. Repair the Vercel GitHub installation's access to `cyberCharl/cerulean-crest` in project settings. This release was deployed directly from the local checkout. The new CI and daily-health workflows become active only after their commit is pushed to GitHub (the schedule requires the default branch).
4. **Recovery rehearsal:** rollback and restore instructions are documented; a full database restore rehearsal remains outstanding.

Multi-user ownership and private readers, public plugin submission, policy/listing materials, and integrated EPUB export remain later roadmap work. They are not part of the verified owner pilot.

See [deployment and environment setup](DEPLOYMENT.md), [MCP authentication](MCP.md), and [the original launch review](LAUNCH_REVIEW.md).
