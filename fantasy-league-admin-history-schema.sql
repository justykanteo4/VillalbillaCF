-- Auditable, additive administrative history for per-league settings.
-- No existing league, market, roster or wallet rows are modified by this migration.
CREATE TABLE IF NOT EXISTS fantasy_league_admin_events(
 id TEXT PRIMARY KEY NOT NULL,
 league_id TEXT NOT NULL,
 actor_uid TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('settings')),
 before_json TEXT NOT NULL,
 after_json TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS fantasy_league_admin_events_recent ON fantasy_league_admin_events(league_id,created_at DESC,id);
