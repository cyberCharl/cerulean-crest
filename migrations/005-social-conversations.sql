ALTER TABLE social_shares ADD COLUMN read_at TEXT;

-- A dismissed share was the pilot's closest equivalent to "done". Preserve
-- that intent while making the article visible in conversation history again.
UPDATE social_shares SET read_at = created_at WHERE dismissed = 1;

CREATE INDEX social_shares_recipient_read ON social_shares(recipient, read_at);
