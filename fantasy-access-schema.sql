CREATE TABLE IF NOT EXISTS fantasy_access_settings(id INTEGER PRIMARY KEY CHECK(id=1),disabled INTEGER NOT NULL CHECK(disabled IN(0,1)),revision INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0);
-- Cierre inicial solicitado; repetir la migración conserva la decisión del administrador.
INSERT OR IGNORE INTO fantasy_access_settings(id,disabled) VALUES(1,1);

CREATE TABLE IF NOT EXISTS fantasy_excluded_users (
 uid TEXT PRIMARY KEY NOT NULL,
 excluded_at INTEGER NOT NULL,
 excluded_by TEXT NOT NULL
);

-- Administrative switch for enabling new participant-created leagues.
-- Disabled by default. Existing leagues continue working.
CREATE TABLE IF NOT EXISTS fantasy_league_creation_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO fantasy_league_creation_settings(id,enabled) VALUES(1,0);

-- Server-side Fantasy point values; existing leagues are migrated on every admin save.
CREATE TABLE IF NOT EXISTS fantasy_point_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 points_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO fantasy_point_settings(id,points_json) VALUES(1,'{"win":6,"draw":5,"loss":4,"goal":1,"cleanSheet":1,"mvp":1,"idealXI":0,"captain":2,"yellow":-1,"secondYellow":-3,"red":-4,"ownGoal":-1}');
