-- Prevent writes to locked Fantasy lineups even if a client bypasses application checks.
CREATE TRIGGER IF NOT EXISTS fantasy_lineup_club_lock_insert
BEFORE INSERT ON fantasy_lineups
WHEN EXISTS(SELECT 1 FROM fantasy_leagues WHERE id=NEW.league_id AND json_extract(settings_json,'$.lineupsLocked')=1)
BEGIN SELECT RAISE(ABORT,'FANTASY_LINEUPS_LOCKED'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_lineup_club_lock_update
BEFORE UPDATE ON fantasy_lineups
WHEN EXISTS(SELECT 1 FROM fantasy_leagues WHERE id=NEW.league_id AND json_extract(settings_json,'$.lineupsLocked')=1)
BEGIN SELECT RAISE(ABORT,'FANTASY_LINEUPS_LOCKED'); END;
