# Publishing an edition

This is the handoff for a person, scheduled job or another agent that has already generated an issue.

## Agent instruction

> Publish one **complete** Cerulean Crest edition. Read `CERULEAN_SITE_URL`, `CERULEAN_API_USER` and `CERULEAN_API_PASSWORD` from secrets. Produce JSON matching the contract below, confirm that `availableMinutes` is within two minutes of the sum of all item `readingMinutes`, then PUT it to `${CERULEAN_SITE_URL}/api/issues/YYYY-MM-DD` using HTTP Basic Auth. Never print credentials. A PUT for an existing date replaces the whole edition, so never send a partial issue. After publishing, GET the same authenticated endpoint and confirm the date and item count, then check that the public issue URL returns successfully.

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

curl --fail-with-body \
  "$CERULEAN_SITE_URL/issues/2026-09-02"
```

If the PUT returns `422`, inspect `details.fieldErrors` and `details.formErrors`. Fix the complete payload and resend it. A failed validation does not alter the existing issue.
