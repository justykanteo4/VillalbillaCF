-- Administrative switch for enabling new participant-created leagues.
-- Disabled by default. Existing leagues continue working.
CREATE TABLE IF NOT EXISTS fantasy_league_creation_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO fantasy_league_creation_settings(id,enabled) VALUES(1,0);
