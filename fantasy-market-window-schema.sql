-- Optional market opening / closing dates for each Fantasy league.
-- Absence of a row means the existing always-open market policy remains unchanged.
CREATE TABLE IF NOT EXISTS fantasy_market_windows(
 league_id TEXT PRIMARY KEY NOT NULL REFERENCES fantasy_leagues(id),
 start_day INTEGER,
 end_day INTEGER,
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL DEFAULT 0,
 updated_by TEXT NOT NULL DEFAULT 'system',
 CHECK(start_day IS NULL OR (start_day BETWEEN 16000 AND 50000)),
 CHECK(end_day IS NULL OR (end_day BETWEEN 16000 AND 50000)),
 CHECK(start_day IS NULL OR end_day IS NULL OR end_day >= start_day)
);
