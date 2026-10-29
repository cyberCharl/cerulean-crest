// Shared portable DDL for local SQLite. Postgres applies migration 006 explicitly.
export const readingSchema = `
CREATE TABLE IF NOT EXISTS reading_links (
  owner_subject TEXT NOT NULL, url TEXT NOT NULL,
  title TEXT NOT NULL, publication TEXT NOT NULL, reading_minutes INTEGER,
  title_override INTEGER NOT NULL DEFAULT 0 CHECK(title_override IN (0,1)),
  commitment TEXT NOT NULL DEFAULT 'candidate' CHECK(commitment IN ('candidate','later','pinned')),
  dormant INTEGER NOT NULL DEFAULT 0 CHECK(dormant IN (0,1)),
  is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)), read_updated_at TEXT,
  eligible_after INTEGER NOT NULL DEFAULT 0,
  metadata_status TEXT NOT NULL DEFAULT 'pending' CHECK(metadata_status IN ('pending','fetching','ready','unavailable')),
  metadata_attempts INTEGER NOT NULL DEFAULT 0, metadata_claimed_at TEXT, metadata_token TEXT, metadata_retry_at TEXT,
  last_presented_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(owner_subject,url), CHECK(reading_minutes IS NULL OR reading_minutes BETWEEN 1 AND 240)
);
CREATE INDEX IF NOT EXISTS reading_links_owner_state ON reading_links(owner_subject,dormant,is_read,commitment);
CREATE INDEX IF NOT EXISTS reading_links_metadata ON reading_links(metadata_status,metadata_retry_at);
CREATE TABLE IF NOT EXISTS reading_legacy_bookmarks (
  owner_subject TEXT NOT NULL, url TEXT NOT NULL, PRIMARY KEY(owner_subject,url)
);
CREATE TABLE IF NOT EXISTS reading_editions (
  owner_subject TEXT NOT NULL, issue_date TEXT NOT NULL, sequence INTEGER NOT NULL,
  source_revision TEXT NOT NULL, retired INTEGER NOT NULL DEFAULT 0 CHECK(retired IN (0,1)),
  PRIMARY KEY(owner_subject,issue_date)
);
CREATE TABLE IF NOT EXISTS reading_selections (
  owner_subject TEXT NOT NULL, issue_date TEXT NOT NULL, url TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('front','inside')), position INTEGER NOT NULL, presented_at TEXT,
  PRIMARY KEY(owner_subject,issue_date,url),
  FOREIGN KEY(owner_subject,issue_date) REFERENCES reading_editions(owner_subject,issue_date) ON DELETE CASCADE,
  FOREIGN KEY(owner_subject,url) REFERENCES reading_links(owner_subject,url) ON DELETE CASCADE
);
`;
