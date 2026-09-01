-- MVP schema. SQLite today; column types and relationships migrate directly to Postgres.
CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_date TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  editor_note TEXT NOT NULL,
  coverage_gap TEXT,
  available_minutes INTEGER NOT NULL,
  expected_minutes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(issue_id, position)
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- v2 migration seam:
-- 1. Add users/workspaces.
-- 2. Add owner_id to issues and change UNIQUE(issue_date) to UNIQUE(owner_id, issue_date).
-- 3. Persist read/feedback state in an item_feedback(user_id, item_id, state) table.
