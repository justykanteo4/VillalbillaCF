CREATE TABLE IF NOT EXISTS fantasy_access_settings(id INTEGER PRIMARY KEY CHECK(id=1),disabled INTEGER NOT NULL CHECK(disabled IN(0,1)),revision INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0);
-- Cierre inicial solicitado; repetir la migración conserva la decisión del administrador.
INSERT OR IGNORE INTO fantasy_access_settings(id,disabled) VALUES(1,1);
