-- Intentionally independent of issue/item foreign keys: saves and private notes
-- must survive replacing an edition. Owners and article URLs are exact identities.
CREATE TABLE article_feedback (
  owner_subject TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  publication TEXT NOT NULL,
  saved BOOLEAN NOT NULL DEFAULT false,
  reaction TEXT CHECK (reaction IN ('more', 'less')),
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner_subject, url)
);
CREATE INDEX idx_article_feedback_owner_updated ON article_feedback(owner_subject, updated_at DESC);
