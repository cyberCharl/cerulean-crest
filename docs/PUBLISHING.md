# Publishing an edition

This is the handoff for a person, scheduled job or another agent that has already generated an issue.

ChatGPT scheduled publishing is designed to use the MCP integration described in [ADR 0001](adr/0001-publish-scheduled-editions-through-mcp.md). The OAuth connection and three-run pilot must pass before unattended publishing is considered live. This Basic-authenticated API is the manual and recovery path for `CERULEAN_OWNER_SUBJECT` only, and intentionally permits complete replacement. General readers publish through their own OAuth-authorized MCP connection.

Production site: `https://cerulean-crest.vercel.app`

## Agent instruction

> Publish one **complete** Cerulean Crest edition. Read `CERULEAN_APP_URL` (or legacy `CERULEAN_SITE_URL`), `CERULEAN_API_USER` and `CERULEAN_API_PASSWORD` from secrets. Produce JSON matching the contract below, confirm that `availableMinutes` is within two minutes of the sum of all item `readingMinutes`, then PUT it to the configured app origin's `/api/issues/YYYY-MM-DD` using HTTP Basic Auth. Never print credentials. A PUT for an existing date replaces the whole edition, so never send a partial issue. After publishing, GET the same authenticated endpoint and confirm the date and item count. The reader URL requires browser sign-in as the edition owner.

The current values are:

```text
CERULEAN_SITE_URL=https://cerulean-crest.vercel.app
CERULEAN_API_USER=cerulean
CERULEAN_API_PASSWORD=<secret>
```

On the deployment owner’s Mac, the production password is stored in Keychain under service `cerulean-crest-publisher`. Load it without placing it in shell history:

```bash
export CERULEAN_API_PASSWORD="$(security find-generic-password \
  -a cerulean -s cerulean-crest-publisher -w)"
```

For a hosted scheduler, copy the password into its secret configuration; do not include it in the agent prompt.

## Request

```bash
curl --fail-with-body \
  --user "$CERULEAN_API_USER:$CERULEAN_API_PASSWORD" \
  --request PUT "$CERULEAN_SITE_URL/api/issues/2026-09-02" \
  --header 'Content-Type: application/json' \
  --data-binary @issue.json
```

Expected response:

```json
{
  "ok": true,
  "date": "2026-09-02",
  "url": "/issues/2026-09-02"
}
```

## Payload contract

```json
{
  "date": "2026-09-02",
  "title": "Cerulean Crest",
  "editorNote": "The editorial thread connecting today’s edition.",
  "coverageGap": null,
  "availableMinutes": 12,
  "expectedMinutes": 6,
  "sections": [
    {
      "title": "Read First",
      "items": [
        {
          "title": "A useful piece",
          "author": "Author name",
          "publication": "Publication",
          "publishedAt": "2 September 2026",
          "readingMinutes": 12,
          "type": "Essay",
          "url": "https://example.com/piece",
          "summary": "Why this piece earned a place in the edition."
        }
      ]
    }
  ]
}
```

Rules:

- Use an ISO `YYYY-MM-DD` date in both URL and body.
- The date must exist on the calendar, and source links must use HTTP or HTTPS.
- Preserve editorial section order and item order in the arrays.
- Send the canonical source URL, without tracking parameters where possible.
- Every string must be non-empty; every item needs at least one reading minute.
- `coverageGap` may be `null`.
- `expectedMinutes` is the intended consumption target; `availableMinutes` is the sum of item durations.
- The maximum accepted issue is 20 sections and 50 items per section.

## Verify the publication

```bash
curl --fail-with-body \
  --user "$CERULEAN_API_USER:$CERULEAN_API_PASSWORD" \
  "$CERULEAN_SITE_URL/api/issues/2026-09-02"

# Open the reader URL in a browser signed in as the edition owner.
```

If the PUT returns `422`, inspect `details.fieldErrors` and `details.formErrors`. Fix the complete payload and resend it. A failed validation does not alter the existing issue.
