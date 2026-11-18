-- Optional double-scoring round for one league and one competition week.
-- No row means the existing x1 scoring rules. Only unstarted rounds may be changed.
CREATE TABLE IF NOT EXISTS fantasy_special_rounds(
 league_id TEXT NOT NULL REFERENCES fantasy_leagues(id),
 week INTEGER NOT NULL CHECK(week BETWEEN 2000 AND 10000),
 multiplier INTEGER NOT NULL DEFAULT 1 CHECK(multiplier IN (1,2)),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
 actor_uid TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(league_id,week)
);
CREATE INDEX IF NOT EXISTS fantasy_special_rounds_by_league ON fantasy_special_rounds(league_id,week);
