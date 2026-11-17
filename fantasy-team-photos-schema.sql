-- Foto pública opcional de cada participante, aislada por liga.
-- La identidad del usuario se verifica en el servidor.
CREATE TABLE IF NOT EXISTS fantasy_team_photos (
 league_id TEXT NOT NULL,
 uid TEXT NOT NULL,
 photo_data TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(league_id,uid),
 FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid) ON DELETE CASCADE
);
