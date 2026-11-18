-- Append-only records for changes to global Fantasy scoring rules.
CREATE TABLE IF NOT EXISTS fantasy_point_history(
 id TEXT PRIMARY KEY NOT NULL,
 revision INTEGER NOT NULL UNIQUE,
 actor_uid TEXT NOT NULL,
 before_json TEXT NOT NULL,
 after_json TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS fantasy_point_history_recent ON fantasy_point_history(created_at DESC,id);
