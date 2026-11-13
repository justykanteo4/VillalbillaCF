CREATE TABLE IF NOT EXISTS fantasy_leagues(id TEXT PRIMARY KEY,owner_uid TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,name TEXT NOT NULL,mode TEXT NOT NULL,pool_json TEXT NOT NULL,settings_json TEXT NOT NULL,code TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,UNIQUE(owner_uid,request_id));
CREATE INDEX IF NOT EXISTS fantasy_league_owner ON fantasy_leagues(owner_uid);
CREATE TABLE IF NOT EXISTS fantasy_members(league_id TEXT NOT NULL,uid TEXT NOT NULL,nickname TEXT NOT NULL,joined_at INTEGER NOT NULL,PRIMARY KEY(league_id,uid),FOREIGN KEY(league_id) REFERENCES fantasy_leagues(id));
CREATE INDEX IF NOT EXISTS fantasy_member_user ON fantasy_members(uid,league_id);
CREATE TRIGGER IF NOT EXISTS fantasy_members_capacity BEFORE INSERT ON fantasy_members WHEN NOT EXISTS(SELECT 1 FROM fantasy_members WHERE league_id=NEW.league_id AND uid=NEW.uid) BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_members WHERE league_id=NEW.league_id)>=CAST(json_extract((SELECT settings_json FROM fantasy_leagues WHERE id=NEW.league_id),'$.maxMembers') AS INTEGER) THEN RAISE(ABORT,'FANTASY_FULL') END;
END;
CREATE TABLE IF NOT EXISTS fantasy_player_prices(player_id TEXT PRIMARY KEY,price REAL,revision INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL,changed_by TEXT NOT NULL,CHECK(price IS NULL OR (price>=1 AND price<=100 AND price*2=CAST(price*2 AS INTEGER))));
CREATE TABLE IF NOT EXISTS fantasy_market_state(league_id TEXT PRIMARY KEY,player_ids_json TEXT NOT NULL,last_day INTEGER NOT NULL DEFAULT -1,FOREIGN KEY(league_id) REFERENCES fantasy_leagues(id));
CREATE TABLE IF NOT EXISTS fantasy_wallets(league_id TEXT NOT NULL,uid TEXT NOT NULL,delta_units INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(league_id,uid),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
INSERT OR IGNORE INTO fantasy_wallets(league_id,uid) SELECT league_id,uid FROM fantasy_members;
CREATE TRIGGER IF NOT EXISTS fantasy_member_wallet AFTER INSERT ON fantasy_members BEGIN INSERT OR IGNORE INTO fantasy_wallets(league_id,uid) VALUES(NEW.league_id,NEW.uid); END;
CREATE TABLE IF NOT EXISTS fantasy_roster(id TEXT PRIMARY KEY,league_id TEXT NOT NULL,uid TEXT NOT NULL,player_id TEXT NOT NULL,acquired_at INTEGER NOT NULL,price_units INTEGER NOT NULL,UNIQUE(league_id,uid,player_id),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
CREATE UNIQUE INDEX IF NOT EXISTS fantasy_roster_unique_player ON fantasy_roster(league_id,player_id);
CREATE INDEX IF NOT EXISTS fantasy_roster_league ON fantasy_roster(league_id,uid);
CREATE TABLE IF NOT EXISTS fantasy_offers(id TEXT PRIMARY KEY,league_id TEXT NOT NULL,buyer_uid TEXT NOT NULL,seller_uid TEXT NOT NULL,ownership_id TEXT NOT NULL,player_id TEXT NOT NULL,amount_units INTEGER NOT NULL CHECK(amount_units>=2 AND amount_units<=2000),status TEXT NOT NULL DEFAULT 'pending',request_id TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,UNIQUE(league_id,buyer_uid,request_id),FOREIGN KEY(league_id,buyer_uid) REFERENCES fantasy_members(league_id,uid),FOREIGN KEY(league_id,seller_uid) REFERENCES fantasy_members(league_id,uid));
CREATE INDEX IF NOT EXISTS fantasy_offers_league ON fantasy_offers(league_id,buyer_uid,seller_uid,status);
CREATE TRIGGER IF NOT EXISTS fantasy_offer_limit BEFORE INSERT ON fantasy_offers WHEN NOT EXISTS(SELECT 1 FROM fantasy_offers WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND request_id=NEW.request_id) BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_offers WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND status='pending' AND expires_at>NEW.created_at)>=20 THEN RAISE(ABORT,'FANTASY_OFFERS_LIMIT') END;
END;
CREATE TABLE IF NOT EXISTS fantasy_market_listings(id TEXT PRIMARY KEY,league_id TEXT NOT NULL,player_id TEXT NOT NULL,listed_day INTEGER NOT NULL,slot INTEGER NOT NULL,retired_day INTEGER,UNIQUE(league_id,listed_day,slot),FOREIGN KEY(league_id) REFERENCES fantasy_leagues(id));
CREATE UNIQUE INDEX IF NOT EXISTS fantasy_market_active_player ON fantasy_market_listings(league_id,player_id) WHERE retired_day IS NULL;
CREATE TABLE IF NOT EXISTS fantasy_trades(id TEXT PRIMARY KEY,league_id TEXT NOT NULL,buyer_uid TEXT NOT NULL,seller_uid TEXT,ownership_id TEXT,player_id TEXT NOT NULL,amount_units INTEGER NOT NULL CHECK(amount_units>=2),request_id TEXT NOT NULL,offer_id TEXT,listing_id TEXT,market_day INTEGER NOT NULL,week_key INTEGER NOT NULL,budget_units INTEGER NOT NULL,price_revision INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,UNIQUE(league_id,buyer_uid,request_id),FOREIGN KEY(league_id,buyer_uid) REFERENCES fantasy_members(league_id,uid));
CREATE INDEX IF NOT EXISTS fantasy_trades_quota ON fantasy_trades(league_id,buyer_uid,week_key);
CREATE TRIGGER IF NOT EXISTS fantasy_trade_guard BEFORE INSERT ON fantasy_trades BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM fantasy_roster WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND (NEW.offer_id IS NULL OR uid=NEW.buyer_uid)) THEN RAISE(ABORT,'FANTASY_OWNED') END;
 SELECT CASE WHEN COALESCE((SELECT delta_units FROM fantasy_wallets WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid),-999999999)+NEW.budget_units<NEW.amount_units THEN RAISE(ABORT,'FANTASY_FUNDS') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_trades WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND week_key=NEW.week_key)>=CAST(json_extract((SELECT settings_json FROM fantasy_leagues WHERE id=NEW.league_id),'$.transfers') AS INTEGER) THEN RAISE(ABORT,'FANTASY_TRANSFERS') END;
 SELECT CASE WHEN NEW.offer_id IS NULL AND NOT EXISTS(SELECT 1 FROM fantasy_market_listings WHERE id=NEW.listing_id AND league_id=NEW.league_id AND player_id=NEW.player_id AND retired_day IS NULL AND listed_day>NEW.market_day-7 AND listed_day<=NEW.market_day) THEN RAISE(ABORT,'FANTASY_LISTING_CHANGED') END;
 SELECT CASE WHEN NEW.offer_id IS NULL AND COALESCE((SELECT revision FROM fantasy_player_prices WHERE player_id=NEW.player_id),0)!=NEW.price_revision THEN RAISE(ABORT,'FANTASY_PRICE_CHANGED') END;
 SELECT CASE WHEN NEW.offer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM fantasy_offers o JOIN fantasy_roster r ON r.id=o.ownership_id WHERE o.id=NEW.offer_id AND o.league_id=NEW.league_id AND o.buyer_uid=NEW.buyer_uid AND o.seller_uid=NEW.seller_uid AND o.ownership_id=NEW.ownership_id AND o.player_id=NEW.player_id AND o.amount_units=NEW.amount_units AND o.status='pending' AND o.expires_at>NEW.created_at AND r.league_id=NEW.league_id AND r.uid=NEW.seller_uid AND r.player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_OFFER_CHANGED') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_trade_settle AFTER INSERT ON fantasy_trades BEGIN
 UPDATE fantasy_market_listings SET retired_day=NEW.market_day WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND retired_day IS NULL;
 UPDATE fantasy_wallets SET delta_units=delta_units-NEW.amount_units WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid;
 UPDATE fantasy_wallets SET delta_units=delta_units+NEW.amount_units WHERE league_id=NEW.league_id AND uid=NEW.seller_uid;
 DELETE FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.seller_uid;
 INSERT INTO fantasy_roster(id,league_id,uid,player_id,acquired_at,price_units) VALUES(NEW.id,NEW.league_id,NEW.buyer_uid,NEW.player_id,NEW.created_at,NEW.amount_units);
 UPDATE fantasy_offers SET status=CASE WHEN id=NEW.offer_id THEN 'accepted' ELSE 'cancelled' END WHERE ownership_id=NEW.ownership_id AND status='pending';
 UPDATE fantasy_offers SET status='cancelled' WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND player_id=NEW.player_id AND status='pending';
END;
