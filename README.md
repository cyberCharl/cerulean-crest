# Cerulean Crest

A small, self-hosted daily magazine: issues arrive through an authenticated API and are rendered as finite, calm reading editions.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`. `/` redirects to today’s issue when one exists, otherwise to the latest edition.

The SQLite database is created at `.data/cerulean-crest.db` and seeded with the 1 September 2026 issue when empty. Set `DATABASE_PATH` to override the location. A persistent disk is required in production; before a multi-instance/serverless deployment, migrate the same three-table model to Postgres.

## Issue API

`PUT /api/issues/:date` replaces or creates one complete issue. It requires HTTP Basic authentication using `CERULEAN_API_USER` and `CERULEAN_API_PASSWORD`. The body date must match the URL date.

```bash
curl --user "$CERULEAN_API_USER:$CERULEAN_API_PASSWORD" \
  --request PUT http://localhost:3000/api/issues/2026-09-02 \
  --header 'Content-Type: application/json' \
  --data @issue.json
```

The request shape is:

```json
{
  "date": "2026-09-02",
  "title": "Cerulean Crest",
  "editorNote": "What connects today’s edition.",
  "coverageGap": null,
  "availableMinutes": 12,
  "expectedMinutes": 6,
  "sections": [{
    "title": "Read First",
    "items": [{
      "title": "A useful piece",
      "author": "Author",
      "publication": "Publication",
      "publishedAt": "2 September 2026",
      "readingMinutes": 12,
      "type": "Essay",
      "url": "https://example.com/piece",
      "summary": "Why this earned a place in the edition."
    }]
  }]
}
```

The API rejects editions whose declared available time differs from the sum of item times by more than two minutes. An authenticated `GET` at the same URL returns the stored issue.

## Direction built into the MVP

The schema separates editorial hierarchy from presentation: issue → ordered sections → ordered items. For v2, add `owner_id` to issues, scope the date uniqueness to `(owner_id, issue_date)`, and move the current browser-local read state into an `item_feedback` table. The ingestion endpoint can then authenticate API tokens to an owner without changing the payload. v3’s curation agents can publish to exactly the same contract.
