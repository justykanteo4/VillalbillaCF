-- Server-side Fantasy point values; existing leagues are migrated on every admin save.
CREATE TABLE IF NOT EXISTS fantasy_point_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 points_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO fantasy_point_settings(id,points_json) VALUES(1,'{"win":6,"draw":5,"loss":4,"goal":1,"cleanSheet":1,"mvp":1,"idealXI":0,"captain":2,"yellow":-1,"secondYellow":-3,"red":-4,"ownGoal":-1}');
