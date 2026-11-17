-- Recupera los onces que la interfaz antigua desvió a la próxima semana.
-- Conserva el próximo once y no sustituye uno ya existente en la jornada actual.
CREATE TABLE IF NOT EXISTS fantasy_lineup_recoveries(league_id TEXT NOT NULL,uid TEXT NOT NULL,source_week INTEGER NOT NULL,target_week INTEGER NOT NULL,players_json TEXT NOT NULL,captain_id TEXT NOT NULL,coach_id TEXT NOT NULL,formation TEXT NOT NULL,original_updated_at INTEGER NOT NULL,recovered_at INTEGER NOT NULL,PRIMARY KEY(league_id,uid,target_week));
INSERT OR IGNORE INTO fantasy_lineup_recoveries
SELECT l.league_id,l.uid,2968,2967,l.players_json,l.captain_id,l.coach_id,COALESCE(f.formation,'4-4-2'),l.updated_at,CAST(strftime('%s','now') AS INTEGER)*1000
FROM fantasy_lineups l JOIN fantasy_members m ON m.league_id=l.league_id AND m.uid=l.uid
LEFT JOIN fantasy_lineup_formations f ON f.league_id=l.league_id AND f.uid=l.uid AND f.week=l.week
WHERE l.week=2968 AND l.updated_at>=1794178800000 AND l.updated_at<1794738259000
AND json_array_length(l.players_json)=11 AND (SELECT COUNT(DISTINCT value) FROM json_each(l.players_json))=11
AND EXISTS(SELECT 1 FROM json_each(l.players_json) WHERE value=l.captain_id)
AND NOT EXISTS(SELECT 1 FROM fantasy_lineups old WHERE old.league_id=l.league_id AND old.uid=l.uid AND old.week=2967);
INSERT OR IGNORE INTO fantasy_lineups(league_id,uid,week,players_json,captain_id,coach_id,deadline_at,updated_at,revision)
SELECT league_id,uid,target_week,players_json,captain_id,coach_id,1794330900000,original_updated_at,1 FROM fantasy_lineup_recoveries WHERE source_week=2968 AND target_week=2967;
INSERT OR IGNORE INTO fantasy_lineup_formations(league_id,uid,week,formation,revision)
SELECT r.league_id,r.uid,r.target_week,r.formation,l.revision FROM fantasy_lineup_recoveries r JOIN fantasy_lineups l ON l.league_id=r.league_id AND l.uid=r.uid AND l.week=r.target_week WHERE r.source_week=2968 AND r.target_week=2967 AND l.updated_at=r.original_updated_at AND l.players_json=r.players_json;
UPDATE fantasy_prize_state SET next_at=0,fingerprint=NULL WHERE league_id IN(SELECT league_id FROM fantasy_lineup_recoveries);
