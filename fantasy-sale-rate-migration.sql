-- Preserve historical 92% sales without permitting new ones. Run as one D1 file after backup.
DROP TRIGGER IF EXISTS fantasy_resale_register;
DROP TRIGGER IF EXISTS fantasy_sale_relist;
DROP TRIGGER IF EXISTS fantasy_sale_guard;
DROP TRIGGER IF EXISTS fantasy_sale_settle;
DROP TRIGGER IF EXISTS fantasy_sale_manager_listing_guard;
CREATE TABLE fantasy_sale_migration_copy AS SELECT * FROM fantasy_player_sales;
CREATE TABLE fantasy_resale_migration_copy AS SELECT * FROM fantasy_resale_listings;
DROP TABLE fantasy_resale_listings;
DROP TABLE fantasy_player_sales;
CREATE TABLE IF NOT EXISTS fantasy_player_sales(id TEXT PRIMARY KEY,league_id TEXT NOT NULL,uid TEXT NOT NULL,player_id TEXT NOT NULL,ownership_id TEXT NOT NULL UNIQUE,request_id TEXT NOT NULL,market_cents INTEGER NOT NULL CHECK(market_cents>0),amount_cents INTEGER NOT NULL CHECK(amount_cents IN (CAST((market_cents*60+50)/100 AS INTEGER),CAST((market_cents*92+50)/100 AS INTEGER))),price_revision INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(league_id,uid,request_id),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
CREATE TABLE IF NOT EXISTS fantasy_resale_listings(sale_id TEXT PRIMARY KEY,listing_id TEXT NOT NULL UNIQUE,listed_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,FOREIGN KEY(sale_id) REFERENCES fantasy_player_sales(id),FOREIGN KEY(listing_id) REFERENCES fantasy_market_listings(id));
CREATE INDEX IF NOT EXISTS fantasy_resale_expiry ON fantasy_resale_listings(expires_at);

INSERT INTO fantasy_player_sales SELECT * FROM fantasy_sale_migration_copy;
INSERT INTO fantasy_resale_listings SELECT * FROM fantasy_resale_migration_copy;
DROP TABLE fantasy_resale_migration_copy;
DROP TABLE fantasy_sale_migration_copy;
CREATE INDEX IF NOT EXISTS fantasy_sales_user ON fantasy_player_sales(league_id,uid,created_at);
CREATE TRIGGER IF NOT EXISTS fantasy_sale_guard BEFORE INSERT ON fantasy_player_sales BEGIN
 SELECT CASE WHEN NEW.amount_cents!=CAST((NEW.market_cents*60+50)/100 AS INTEGER) THEN RAISE(ABORT,'FANTASY_SALE_AMOUNT') END;
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
 UPDATE fantasy_lineups SET players_json=COALESCE((SELECT json_group_array(value) FROM json_each(players_json) WHERE value!=NEW.player_id),'[]'),captain_id=CASE WHEN captain_id=NEW.player_id THEN '' ELSE captain_id END,revision=revision+1 WHERE league_id=NEW.league_id AND uid=NEW.uid AND deadline_at>NEW.created_at AND EXISTS(SELECT 1 FROM json_each(players_json) WHERE value=NEW.player_id) AND COALESCE((SELECT json_extract(settings_json,'$.lineupsLocked') FROM fantasy_leagues WHERE id=NEW.league_id),0)<>1;
END;

CREATE TRIGGER IF NOT EXISTS fantasy_resale_register AFTER INSERT ON fantasy_market_listings WHEN NEW.id LIKE 'resale-%' AND EXISTS(SELECT 1 FROM fantasy_player_sales WHERE id=substr(NEW.id,8)) BEGIN
 INSERT INTO fantasy_resale_listings(sale_id,listing_id,listed_at,expires_at) SELECT id,NEW.id,created_at,created_at+604800000 FROM fantasy_player_sales WHERE id=substr(NEW.id,8);
END;
CREATE TRIGGER IF NOT EXISTS fantasy_sale_relist AFTER INSERT ON fantasy_player_sales BEGIN
 INSERT INTO fantasy_market_listings(id,league_id,player_id,listed_day,slot) VALUES('resale-'||NEW.id,NEW.league_id,NEW.player_id,CAST(NEW.created_at/86400000 AS INTEGER),COALESCE((SELECT MIN(slot) FROM fantasy_market_listings WHERE league_id=NEW.league_id AND listed_day=CAST(NEW.created_at/86400000 AS INTEGER)),0)-1);
END;


-- Do not sell directly while a manager auction is still open.
CREATE TRIGGER IF NOT EXISTS fantasy_sale_manager_listing_guard BEFORE INSERT ON fantasy_player_sales
WHEN EXISTS(SELECT 1 FROM fantasy_manager_listings m JOIN fantasy_market_listings l ON l.id=m.listing_id
 WHERE m.league_id=NEW.league_id AND m.ownership_id=NEW.ownership_id AND l.retired_day IS NULL AND m.expires_at>NEW.created_at)
BEGIN
 SELECT RAISE(ABORT,'FANTASY_LISTED');
END;

