CREATE TABLE IF NOT EXISTS app_diagnostics (
 id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, category TEXT NOT NULL, code TEXT NOT NULL,
 resource TEXT NOT NULL, status INTEGER, platform TEXT NOT NULL, occurrences INTEGER NOT NULL,
 first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS diagnostics_last ON app_diagnostics(last_seen);
CREATE INDEX IF NOT EXISTS diagnostics_owner ON app_diagnostics(owner_hash,last_seen);
CREATE TABLE IF NOT EXISTS diagnostic_reads(id TEXT PRIMARY KEY,seen_through INTEGER NOT NULL,seen_count INTEGER NOT NULL,seen_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS diagnostic_reads_date ON diagnostic_reads(seen_at);
