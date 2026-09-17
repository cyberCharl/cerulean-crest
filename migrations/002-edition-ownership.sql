-- NULL ownership deliberately quarantines legacy editions until explicitly assigned.
ALTER TABLE issues ADD COLUMN owner_subject TEXT;
ALTER TABLE issues DROP CONSTRAINT issues_issue_date_key;
ALTER TABLE issues ADD CONSTRAINT issues_owner_date_key UNIQUE (owner_subject, issue_date);
CREATE TABLE editorial_settings (owner_subject TEXT PRIMARY KEY, settings JSONB NOT NULL);
