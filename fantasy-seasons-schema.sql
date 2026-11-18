-- Historial permanente de las temporadas Fantasy, incluso tras reiniciar una liga.
-- Guarda únicamente clasificaciones y jornadas; no copia credenciales, fotografías ni saldos.
CREATE TABLE IF NOT EXISTS fantasy_season_archives(
 league_id TEXT NOT NULL REFERENCES fantasy_leagues(id),
 season TEXT NOT NULL CHECK(length(season)=7),
 standings_json TEXT NOT NULL,
 rounds_json TEXT NOT NULL,
 closed_at INTEGER NOT NULL,
 closed_by TEXT NOT NULL,
 PRIMARY KEY(league_id,season)
);
CREATE INDEX IF NOT EXISTS fantasy_season_archives_recent ON fantasy_season_archives(league_id,closed_at DESC);
