CREATE TABLE IF NOT EXISTS club_kids_settings (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL DEFAULT 0,
 updated_by TEXT
);
INSERT OR IGNORE INTO club_kids_settings (id,enabled,revision,updated_at)
VALUES (1,1,1,0);
