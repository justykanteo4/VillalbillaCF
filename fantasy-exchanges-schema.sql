-- Intercambios 1 por 1 entre dos participantes de una misma liga.
-- Aplicar tras fantasy-schema.sql, fantasy-lineup-schema.sql y fantasy-league-lifecycle-schema.sql.
CREATE TABLE IF NOT EXISTS fantasy_player_exchanges (
 id TEXT PRIMARY KEY NOT NULL,
 league_id TEXT NOT NULL REFERENCES fantasy_leagues(id),
 proposer_uid TEXT NOT NULL,
 receiver_uid TEXT NOT NULL,
 proposer_ownership_id TEXT NOT NULL,
 receiver_ownership_id TEXT NOT NULL,
 proposer_player_id TEXT NOT NULL,
 receiver_player_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','cancelled')),
 request_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 completed_at INTEGER,
 UNIQUE(league_id,proposer_uid,request_id),
 CHECK(proposer_uid<>receiver_uid),
 CHECK(proposer_player_id<>receiver_player_id),
 FOREIGN KEY(league_id,proposer_uid) REFERENCES fantasy_members(league_id,uid),
 FOREIGN KEY(league_id,receiver_uid) REFERENCES fantasy_members(league_id,uid)
);
CREATE INDEX IF NOT EXISTS fantasy_exchanges_received ON fantasy_player_exchanges(league_id,receiver_uid,status,created_at DESC);
CREATE INDEX IF NOT EXISTS fantasy_exchanges_sent ON fantasy_player_exchanges(league_id,proposer_uid,status,created_at DESC);
CREATE TRIGGER IF NOT EXISTS fantasy_exchange_propose_guard BEFORE INSERT ON fantasy_player_exchanges BEGIN
 SELECT CASE WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active' THEN RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_managers WHERE league_id=NEW.league_id AND uid=NEW.proposer_uid)
    OR NOT EXISTS(SELECT 1 FROM fantasy_managers WHERE league_id=NEW.league_id AND uid=NEW.receiver_uid) THEN RAISE(ABORT,'FANTASY_EXCHANGE_MANAGER') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE id=NEW.proposer_ownership_id AND league_id=NEW.league_id AND uid=NEW.proposer_uid AND player_id=NEW.proposer_player_id)
    OR NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE id=NEW.receiver_ownership_id AND league_id=NEW.league_id AND uid=NEW.receiver_uid AND player_id=NEW.receiver_player_id) THEN RAISE(ABORT,'FANTASY_EXCHANGE_CHANGED') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_exchange_accept_guard BEFORE UPDATE OF status ON fantasy_player_exchanges
WHEN NEW.status='accepted' AND OLD.status<>'accepted'
BEGIN
 SELECT CASE WHEN OLD.status<>'pending' OR OLD.expires_at<=NEW.completed_at THEN RAISE(ABORT,'FANTASY_EXCHANGE_EXPIRED') END;
 SELECT CASE WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active' THEN RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE id=NEW.proposer_ownership_id AND league_id=NEW.league_id AND uid=NEW.proposer_uid AND player_id=NEW.proposer_player_id)
    OR NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE id=NEW.receiver_ownership_id AND league_id=NEW.league_id AND uid=NEW.receiver_uid AND player_id=NEW.receiver_player_id) THEN RAISE(ABORT,'FANTASY_EXCHANGE_CHANGED') END;
 SELECT CASE WHEN EXISTS(
  SELECT 1 FROM fantasy_market_listings WHERE league_id=NEW.league_id AND retired_day IS NULL AND player_id IN(NEW.proposer_player_id,NEW.receiver_player_id)
 ) THEN RAISE(ABORT,'FANTASY_EXCHANGE_LISTED') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_exchange_settle AFTER UPDATE OF status ON fantasy_player_exchanges
WHEN OLD.status='pending' AND NEW.status='accepted'
BEGIN
 UPDATE fantasy_roster SET uid=CASE WHEN id=NEW.proposer_ownership_id THEN NEW.receiver_uid ELSE NEW.proposer_uid END,
   acquired_at=NEW.completed_at
 WHERE league_id=NEW.league_id AND id IN(NEW.proposer_ownership_id,NEW.receiver_ownership_id);
 UPDATE fantasy_offers SET status='cancelled' WHERE league_id=NEW.league_id
  AND ownership_id IN(NEW.proposer_ownership_id,NEW.receiver_ownership_id) AND status='pending';
 -- Las alineaciones ya cerradas se mantienen; los borradores abiertos dejan de contener jugadores cedidos.
 UPDATE fantasy_lineups SET
  players_json=COALESCE((SELECT json_group_array(value) FROM json_each(players_json)
    WHERE value<>CASE WHEN fantasy_lineups.uid=NEW.proposer_uid THEN NEW.proposer_player_id ELSE NEW.receiver_player_id END),'[]'),
  captain_id=CASE WHEN captain_id=CASE WHEN uid=NEW.proposer_uid THEN NEW.proposer_player_id ELSE NEW.receiver_player_id END THEN '' ELSE captain_id END,
  revision=revision+1
 WHERE league_id=NEW.league_id AND uid IN(NEW.proposer_uid,NEW.receiver_uid) AND deadline_at>NEW.completed_at
  AND EXISTS(SELECT 1 FROM json_each(players_json) WHERE value=CASE WHEN fantasy_lineups.uid=NEW.proposer_uid THEN NEW.proposer_player_id ELSE NEW.receiver_player_id END);
END;
