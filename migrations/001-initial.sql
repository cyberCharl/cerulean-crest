-- Baseline migration; safe to adopt the existing production tables.
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  issue_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  editor_note TEXT NOT NULL,
  coverage_gap TEXT,
  available_minutes INTEGER NOT NULL,
  expected_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sections (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(issue_id, position)
);

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  publication TEXT NOT NULL,
  published_at TEXT NOT NULL,
  reading_minutes INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT NOT NULL,
  UNIQUE(section_id, position)
);

CREATE INDEX IF NOT EXISTS idx_sections_issue ON sections(issue_id, position);
CREATE INDEX IF NOT EXISTS idx_items_section ON items(section_id, position);

-- v2: add owners, change the issue uniqueness constraint to
-- UNIQUE(owner_id, issue_date), and add item_feedback(user_id, item_id, state).
