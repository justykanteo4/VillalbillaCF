CREATE TABLE IF NOT EXISTS app_activity_sessions (
 id TEXT PRIMARY KEY,
 device_id TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('trainer','player','fan')),
 started_at INTEGER NOT NULL,
 last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_seen ON app_activity_sessions(last_seen);
