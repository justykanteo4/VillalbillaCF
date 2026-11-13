-- Importes en céntimos de millón; el aumento se aplica una sola vez.
CREATE TABLE IF NOT EXISTS fantasy_player_cents(player_id TEXT PRIMARY KEY,price_cents INTEGER,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL,changed_by TEXT NOT NULL,CHECK(price_cents IS NULL OR (price_cents BETWEEN 100 AND 23400 AND price_cents=CAST(price_cents AS INTEGER))));
INSERT OR IGNORE INTO fantasy_player_cents SELECT player_id,price_tenths*13,revision+1,updated_at,changed_by FROM fantasy_player_values;
CREATE TRIGGER IF NOT EXISTS fantasy_cents_price_insert AFTER INSERT ON fantasy_player_values BEGIN INSERT INTO fantasy_player_cents VALUES(NEW.player_id,NEW.price_tenths*13,NEW.revision+1,NEW.updated_at,NEW.changed_by) ON CONFLICT(player_id) DO UPDATE SET price_cents=excluded.price_cents,revision=fantasy_player_cents.revision+1,updated_at=excluded.updated_at,changed_by=excluded.changed_by; END;
CREATE TRIGGER IF NOT EXISTS fantasy_cents_price_update AFTER UPDATE ON fantasy_player_values BEGIN INSERT INTO fantasy_player_cents VALUES(NEW.player_id,NEW.price_tenths*13,NEW.revision+1,NEW.updated_at,NEW.changed_by) ON CONFLICT(player_id) DO UPDATE SET price_cents=excluded.price_cents,revision=fantasy_player_cents.revision+1,updated_at=excluded.updated_at,changed_by=excluded.changed_by; END;
CREATE TABLE IF NOT EXISTS fantasy_wallet_cents(league_id TEXT NOT NULL,uid TEXT NOT NULL,delta_cents INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(league_id,uid),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
INSERT OR IGNORE INTO fantasy_wallet_cents SELECT league_id,uid,CAST(ROUND(delta_tenths*10) AS INTEGER) FROM fantasy_wallet_values;
CREATE TRIGGER IF NOT EXISTS fantasy_wallet_cents_insert AFTER INSERT ON fantasy_wallets BEGIN INSERT OR IGNORE INTO fantasy_wallet_cents VALUES(NEW.league_id,NEW.uid,CAST(ROUND(NEW.delta_units*50) AS INTEGER)); END;
CREATE TABLE IF NOT EXISTS fantasy_budget_increase(league_id TEXT PRIMARY KEY,previous_budget REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fantasy_policy_migrations(id TEXT PRIMARY KEY);
INSERT OR IGNORE INTO fantasy_budget_increase SELECT id,json_extract(settings_json,'$.budget') FROM fantasy_leagues WHERE NOT EXISTS(SELECT 1 FROM fantasy_policy_migrations WHERE id='prices-and-budget-30');
UPDATE fantasy_leagues SET settings_json=json_set(settings_json,'$.budget',ROUND((SELECT previous_budget FROM fantasy_budget_increase WHERE league_id=fantasy_leagues.id)*1.3,2)) WHERE NOT EXISTS(SELECT 1 FROM fantasy_policy_migrations WHERE id='prices-and-budget-30') AND id IN(SELECT league_id FROM fantasy_budget_increase) AND json_extract(settings_json,'$.budget')=(SELECT previous_budget FROM fantasy_budget_increase WHERE league_id=fantasy_leagues.id);
CREATE TABLE IF NOT EXISTS fantasy_participant_teams(uid TEXT NOT NULL,team_id TEXT NOT NULL,verified_at INTEGER NOT NULL,PRIMARY KEY(uid,team_id));
CREATE TABLE IF NOT EXISTS fantasy_official_leagues(team_id TEXT PRIMARY KEY,league_id TEXT NOT NULL UNIQUE,FOREIGN KEY(league_id) REFERENCES fantasy_leagues(id));
INSERT OR IGNORE INTO fantasy_official_leagues SELECT g.team_id,l.id FROM fantasy_leagues l JOIN fantasy_league_groups g ON g.league_id=l.id WHERE l.mode='classic' ORDER BY l.created_at,l.id;
-- Las clásicas tenían 40 M efectivos aunque un registro antiguo guardase otro valor.
UPDATE fantasy_leagues SET settings_json=json_set(settings_json,'$.budget',52) WHERE mode='classic';
INSERT OR IGNORE INTO fantasy_policy_migrations VALUES('prices-and-budget-30');
DROP TRIGGER IF EXISTS fantasy_trade_guard;
DROP TRIGGER IF EXISTS fantasy_trade_settle;
CREATE TRIGGER IF NOT EXISTS fantasy_trade_guard BEFORE INSERT ON fantasy_trades BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM fantasy_roster WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND (NEW.offer_id IS NULL OR uid=NEW.buyer_uid)) THEN RAISE(ABORT,'FANTASY_OWNED') END;
 SELECT CASE WHEN COALESCE((SELECT delta_cents FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid),-999999999)+ROUND(NEW.budget_units*50)<ROUND(NEW.amount_units*50) THEN RAISE(ABORT,'FANTASY_FUNDS') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_trades WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND week_key=NEW.week_key)>=CAST(json_extract((SELECT settings_json FROM fantasy_leagues WHERE id=NEW.league_id),'$.transfers') AS INTEGER) THEN RAISE(ABORT,'FANTASY_TRANSFERS') END;
 SELECT CASE WHEN NEW.offer_id IS NULL AND NOT EXISTS(SELECT 1 FROM fantasy_market_listings WHERE id=NEW.listing_id AND league_id=NEW.league_id AND player_id=NEW.player_id AND retired_day IS NULL AND listed_day>NEW.market_day-7 AND listed_day<=NEW.market_day) THEN RAISE(ABORT,'FANTASY_LISTING_CHANGED') END;
 SELECT CASE WHEN NEW.offer_id IS NULL AND COALESCE((SELECT revision FROM fantasy_player_cents WHERE player_id=NEW.player_id),0)!=NEW.price_revision THEN RAISE(ABORT,'FANTASY_PRICE_CHANGED') END;
 SELECT CASE WHEN NEW.offer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM fantasy_offers o JOIN fantasy_roster r ON r.id=o.ownership_id WHERE o.id=NEW.offer_id AND o.league_id=NEW.league_id AND o.buyer_uid=NEW.buyer_uid AND o.seller_uid=NEW.seller_uid AND o.ownership_id=NEW.ownership_id AND o.player_id=NEW.player_id AND o.amount_units=NEW.amount_units AND o.status='pending' AND o.expires_at>NEW.created_at AND r.league_id=NEW.league_id AND r.uid=NEW.seller_uid AND r.player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_OFFER_CHANGED') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_trade_settle AFTER INSERT ON fantasy_trades BEGIN
 UPDATE fantasy_market_listings SET retired_day=NEW.market_day WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND retired_day IS NULL;
 UPDATE fantasy_wallet_cents SET delta_cents=delta_cents-CAST(ROUND(NEW.amount_units*50) AS INTEGER) WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid;
 UPDATE fantasy_wallet_cents SET delta_cents=delta_cents+CAST(ROUND(NEW.amount_units*50) AS INTEGER) WHERE league_id=NEW.league_id AND uid=NEW.seller_uid;
 UPDATE fantasy_wallet_values SET delta_tenths=(SELECT delta_cents/10.0 FROM fantasy_wallet_cents v WHERE v.league_id=fantasy_wallet_values.league_id AND v.uid=fantasy_wallet_values.uid) WHERE league_id=NEW.league_id AND uid IN(NEW.buyer_uid,NEW.seller_uid);
 UPDATE fantasy_wallets SET delta_units=(SELECT delta_cents/50.0 FROM fantasy_wallet_cents v WHERE v.league_id=fantasy_wallets.league_id AND v.uid=fantasy_wallets.uid) WHERE league_id=NEW.league_id AND uid IN(NEW.buyer_uid,NEW.seller_uid);
 DELETE FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.seller_uid;
 INSERT INTO fantasy_roster(id,league_id,uid,player_id,acquired_at,price_units) VALUES(NEW.id,NEW.league_id,NEW.buyer_uid,NEW.player_id,NEW.created_at,NEW.amount_units);
 UPDATE fantasy_offers SET status=CASE WHEN id=NEW.offer_id THEN 'accepted' ELSE 'cancelled' END WHERE ownership_id=NEW.ownership_id AND status='pending';
 UPDATE fantasy_offers SET status='cancelled' WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND player_id=NEW.player_id AND status='pending';
END;
