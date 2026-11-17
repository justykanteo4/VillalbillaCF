CREATE TABLE IF NOT EXISTS fantasy_league_groups(league_id TEXT PRIMARY KEY,team_id TEXT NOT NULL,FOREIGN KEY(league_id) REFERENCES fantasy_leagues(id));
INSERT OR IGNORE INTO fantasy_league_groups SELECT id,json_extract(pool_json,'$.teamId') FROM fantasy_leagues WHERE json_extract(pool_json,'$.type')='team' AND json_extract(pool_json,'$.teamId') IS NOT NULL;
CREATE TABLE IF NOT EXISTS fantasy_player_values(player_id TEXT PRIMARY KEY,price_tenths INTEGER,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL,changed_by TEXT NOT NULL,CHECK(price_tenths IS NULL OR (price_tenths>=10 AND price_tenths<=1800 AND price_tenths=CAST(price_tenths AS INTEGER))));
INSERT OR IGNORE INTO fantasy_player_values SELECT player_id,CASE WHEN price IS NULL THEN NULL ELSE CAST(ROUND(price*18) AS INTEGER) END,revision+1,updated_at,changed_by FROM fantasy_player_prices;
CREATE TABLE IF NOT EXISTS fantasy_wallet_values(league_id TEXT NOT NULL,uid TEXT NOT NULL,delta_tenths INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(league_id,uid),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
INSERT OR IGNORE INTO fantasy_wallet_values SELECT league_id,uid,CAST(ROUND(delta_units*5) AS INTEGER) FROM fantasy_wallets;
CREATE TRIGGER IF NOT EXISTS fantasy_wallet_value_insert AFTER INSERT ON fantasy_wallets BEGIN INSERT OR IGNORE INTO fantasy_wallet_values(league_id,uid,delta_tenths) VALUES(NEW.league_id,NEW.uid,CAST(ROUND(NEW.delta_units*5) AS INTEGER)); END;
CREATE TRIGGER IF NOT EXISTS fantasy_legacy_price_insert AFTER INSERT ON fantasy_player_prices BEGIN INSERT INTO fantasy_player_values VALUES(NEW.player_id,CASE WHEN NEW.price IS NULL THEN NULL ELSE CAST(ROUND(NEW.price*18) AS INTEGER) END,NEW.revision+1,NEW.updated_at,NEW.changed_by) ON CONFLICT(player_id) DO UPDATE SET price_tenths=excluded.price_tenths,revision=fantasy_player_values.revision+1,updated_at=excluded.updated_at,changed_by=excluded.changed_by; END;
CREATE TRIGGER IF NOT EXISTS fantasy_legacy_price_update AFTER UPDATE ON fantasy_player_prices BEGIN INSERT INTO fantasy_player_values VALUES(NEW.player_id,CASE WHEN NEW.price IS NULL THEN NULL ELSE CAST(ROUND(NEW.price*18) AS INTEGER) END,NEW.revision+1,NEW.updated_at,NEW.changed_by) ON CONFLICT(player_id) DO UPDATE SET price_tenths=excluded.price_tenths,revision=fantasy_player_values.revision+1,updated_at=excluded.updated_at,changed_by=excluded.changed_by; END;
DROP TRIGGER IF EXISTS fantasy_trade_guard;
DROP TRIGGER IF EXISTS fantasy_trade_settle;
CREATE TRIGGER IF NOT EXISTS fantasy_trade_guard BEFORE INSERT ON fantasy_trades BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM fantasy_roster WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND (NEW.offer_id IS NULL OR uid=NEW.buyer_uid)) THEN RAISE(ABORT,'FANTASY_OWNED') END;
 SELECT CASE WHEN COALESCE((SELECT delta_tenths FROM fantasy_wallet_values WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid),-999999999)+ROUND(NEW.budget_units*5)<ROUND(NEW.amount_units*5) THEN RAISE(ABORT,'FANTASY_FUNDS') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_trades WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND week_key=NEW.week_key)>=CAST(json_extract((SELECT settings_json FROM fantasy_leagues WHERE id=NEW.league_id),'$.transfers') AS INTEGER) THEN RAISE(ABORT,'FANTASY_TRANSFERS') END;
 SELECT CASE WHEN NEW.offer_id IS NULL AND NOT EXISTS(SELECT 1 FROM fantasy_market_listings WHERE id=NEW.listing_id AND league_id=NEW.league_id AND player_id=NEW.player_id AND retired_day IS NULL AND listed_day>NEW.market_day-7 AND listed_day<=NEW.market_day) THEN RAISE(ABORT,'FANTASY_LISTING_CHANGED') END;
 SELECT CASE WHEN NEW.offer_id IS NULL AND COALESCE((SELECT revision FROM fantasy_player_values WHERE player_id=NEW.player_id),0)!=NEW.price_revision THEN RAISE(ABORT,'FANTASY_PRICE_CHANGED') END;
 SELECT CASE WHEN NEW.offer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM fantasy_offers o JOIN fantasy_roster r ON r.id=o.ownership_id WHERE o.id=NEW.offer_id AND o.league_id=NEW.league_id AND o.buyer_uid=NEW.buyer_uid AND o.seller_uid=NEW.seller_uid AND o.ownership_id=NEW.ownership_id AND o.player_id=NEW.player_id AND o.amount_units=NEW.amount_units AND o.status='pending' AND o.expires_at>NEW.created_at AND r.league_id=NEW.league_id AND r.uid=NEW.seller_uid AND r.player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_OFFER_CHANGED') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_trade_settle AFTER INSERT ON fantasy_trades BEGIN
 UPDATE fantasy_market_listings SET retired_day=NEW.market_day WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND retired_day IS NULL;
 UPDATE fantasy_wallet_values SET delta_tenths=delta_tenths-CAST(ROUND(NEW.amount_units*5) AS INTEGER) WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid;
 UPDATE fantasy_wallet_values SET delta_tenths=delta_tenths+CAST(ROUND(NEW.amount_units*5) AS INTEGER) WHERE league_id=NEW.league_id AND uid=NEW.seller_uid;
 UPDATE fantasy_wallets SET delta_units=(SELECT delta_tenths/5.0 FROM fantasy_wallet_values v WHERE v.league_id=fantasy_wallets.league_id AND v.uid=fantasy_wallets.uid) WHERE league_id=NEW.league_id AND uid IN(NEW.buyer_uid,NEW.seller_uid);
 DELETE FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.seller_uid;
 INSERT INTO fantasy_roster(id,league_id,uid,player_id,acquired_at,price_units) VALUES(NEW.id,NEW.league_id,NEW.buyer_uid,NEW.player_id,NEW.created_at,NEW.amount_units);
 UPDATE fantasy_offers SET status=CASE WHEN id=NEW.offer_id THEN 'accepted' ELSE 'cancelled' END WHERE ownership_id=NEW.ownership_id AND status='pending';
 UPDATE fantasy_offers SET status='cancelled' WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND player_id=NEW.player_id AND status='pending';
END;
