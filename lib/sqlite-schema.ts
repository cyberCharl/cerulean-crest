// Canonical local SQLite schema. Postgres uses the versioned SQL migrations.
// Existing SQLite databases are preserved; legacy issue ownership is migrated after setup.
export const sqliteSchema = `
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_subject TEXT,
  issue_date TEXT NOT NULL,
  title TEXT NOT NULL,
  editor_note TEXT NOT NULL,
  coverage_gap TEXT,
  available_minutes INTEGER NOT NULL,
  expected_minutes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_subject, issue_date)
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(issue_id, position)
);

CREATE TABLE IF NOT EXISTS items (
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
CREATE INDEX IF NOT EXISTS idx_sections_issue ON sections(issue_id, position);
CREATE INDEX IF NOT EXISTS idx_items_section ON items(section_id, position);

CREATE TABLE IF NOT EXISTS editorial_settings (
  owner_subject TEXT PRIMARY KEY,
  settings TEXT NOT NULL
);

-- No edition foreign key: saved articles and notes survive edition replacement.
CREATE TABLE IF NOT EXISTS article_feedback (
  owner_subject TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  publication TEXT NOT NULL,
  saved INTEGER NOT NULL DEFAULT 0 CHECK(saved IN (0, 1)),
  reaction TEXT CHECK(reaction IN ('more', 'less')),
  note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 2000),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(owner_subject, url)
);
CREATE INDEX IF NOT EXISTS idx_article_feedback_owner_updated ON article_feedback(owner_subject, updated_at DESC);

CREATE TABLE IF NOT EXISTS social_profiles (
  owner_subject TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1))
);
CREATE TABLE IF NOT EXISTS social_friendships (
  id TEXT PRIMARY KEY,
  member_a TEXT NOT NULL REFERENCES social_profiles(owner_subject),
  member_b TEXT NOT NULL REFERENCES social_profiles(owner_subject),
  requester TEXT NOT NULL REFERENCES social_profiles(owner_subject),
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted')),
  UNIQUE(member_a, member_b),
  CHECK(member_a < member_b),
  CHECK(requester = member_a OR requester = member_b)
);
CREATE TABLE IF NOT EXISTS social_shares (
  id TEXT PRIMARY KEY,
  friendship_id TEXT NOT NULL REFERENCES social_friendships(id) ON DELETE CASCADE,
  sender TEXT NOT NULL REFERENCES social_profiles(owner_subject),
  recipient TEXT NOT NULL REFERENCES social_profiles(owner_subject),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL,
  recommend INTEGER NOT NULL CHECK(recommend IN (0, 1)),
  dismissed INTEGER NOT NULL DEFAULT 0 CHECK(dismissed IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE(sender, recipient, url),
  CHECK(sender <> recipient)
);
CREATE INDEX IF NOT EXISTS social_shares_recipient ON social_shares(recipient, dismissed);
`;
