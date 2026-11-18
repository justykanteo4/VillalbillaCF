-- Fantasy-only manual stats. Never modifies official federation reports.
CREATE TABLE IF NOT EXISTS fantasy_stat_corrections(
 team_id TEXT NOT NULL,
 match_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 stats_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL,
 actor_uid TEXT NOT NULL,
 PRIMARY KEY(team_id,match_id,player_id)
);
CREATE TABLE IF NOT EXISTS fantasy_stat_correction_history(
 id TEXT PRIMARY KEY,
 team_id TEXT NOT NULL,
 match_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 previous_json TEXT,
 stats_json TEXT,
 revision INTEGER NOT NULL,
 actor_uid TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS fantasy_stat_correction_history_match ON fantasy_stat_correction_history(team_id,match_id,updated_at);
