CREATE TABLE IF NOT EXISTS official_sanction_groups(group_key TEXT PRIMARY KEY,competition TEXT NOT NULL,group_id TEXT NOT NULL,records_json TEXT NOT NULL,checked_at TEXT NOT NULL,attempted_at INTEGER NOT NULL,last_error TEXT,fixtures_json TEXT);
CREATE TABLE IF NOT EXISTS official_sanctions_sync(id INTEGER PRIMARY KEY CHECK(id=1),last_touch INTEGER NOT NULL DEFAULT 0,fingerprint TEXT,blocked_until INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO official_sanctions_sync(id) VALUES(1);
