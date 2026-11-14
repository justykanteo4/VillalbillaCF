CREATE TABLE IF NOT EXISTS fantasy_player_sales(id TEXT PRIMARY KEY,league_id TEXT NOT NULL,uid TEXT NOT NULL,player_id TEXT NOT NULL,ownership_id TEXT NOT NULL UNIQUE,request_id TEXT NOT NULL,market_cents INTEGER NOT NULL CHECK(market_cents>0),amount_cents INTEGER NOT NULL CHECK(amount_cents=CAST((market_cents*92+50)/100 AS INTEGER)),price_revision INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(league_id,uid,request_id),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
CREATE INDEX IF NOT EXISTS fantasy_sales_user ON fantasy_player_sales(league_id,uid,created_at);
CREATE TRIGGER IF NOT EXISTS fantasy_sale_guard BEFORE INSERT ON fantasy_player_sales BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.uid AND player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_SALE_OWNERSHIP') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_managers WHERE league_id=NEW.league_id AND uid=NEW.uid) THEN RAISE(ABORT,'FANTASY_SALE_MANAGER') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.uid)<=12 THEN RAISE(ABORT,'FANTASY_ROSTER_MIN') END;
 SELECT CASE WHEN COALESCE((SELECT revision FROM fantasy_player_cents WHERE player_id=NEW.player_id),0)!=NEW.price_revision THEN RAISE(ABORT,'FANTASY_PRICE_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM fantasy_player_cents WHERE player_id=NEW.player_id AND price_cents IS NOT NULL AND price_cents!=NEW.market_cents) THEN RAISE(ABORT,'FANTASY_PRICE_CHANGED') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_sale_settle AFTER INSERT ON fantasy_player_sales BEGIN
 DELETE FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallet_cents SET delta_cents=delta_cents+NEW.amount_cents WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallet_values SET delta_tenths=(SELECT delta_cents/10.0 FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallets SET delta_units=(SELECT delta_cents/50.0 FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_offers SET status='cancelled' WHERE league_id=NEW.league_id AND ownership_id=NEW.ownership_id AND status='pending';
 UPDATE fantasy_lineups SET players_json=COALESCE((SELECT json_group_array(value) FROM json_each(players_json) WHERE value!=NEW.player_id),'[]'),captain_id=CASE WHEN captain_id=NEW.player_id THEN '' ELSE captain_id END,revision=revision+1 WHERE league_id=NEW.league_id AND uid=NEW.uid AND deadline_at>NEW.created_at AND EXISTS(SELECT 1 FROM json_each(players_json) WHERE value=NEW.player_id);
END;
