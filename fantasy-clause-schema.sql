-- Apply AFTER fantasy-auction-schema.sql. Existing leagues stay disabled
-- because the feature flag defaults to false when absent.
CREATE TABLE IF NOT EXISTS fantasy_clause_boosts(
  ownership_id TEXT PRIMARY KEY, league_id TEXT NOT NULL,
  extra_cents INTEGER NOT NULL DEFAULT 0 CHECK(extra_cents>=0),
  start_round INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS fantasy_clause_boost_events(
  id TEXT PRIMARY KEY, league_id TEXT NOT NULL, uid TEXT NOT NULL,
  ownership_id TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000),
  gross_cents INTEGER NOT NULL, created_at INTEGER NOT NULL,
  start_round INTEGER NOT NULL, request_id TEXT NOT NULL,
  UNIQUE(league_id,uid,request_id));
CREATE TRIGGER IF NOT EXISTS fantasy_clause_boost_guard BEFORE INSERT ON fantasy_clause_boost_events BEGIN
 SELECT CASE WHEN COALESCE(json_extract((SELECT settings_json FROM fantasy_leagues WHERE id=NEW.league_id),'$.clausesEnabled'),0)!=1 THEN RAISE(ABORT,'FANTASY_CLAUSES_DISABLED') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.uid) THEN RAISE(ABORT,'FANTASY_CLAUSE_OWNER_CHANGED') END;
 SELECT CASE WHEN NEW.gross_cents+COALESCE((SELECT delta_cents FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.uid),-999999999)-COALESCE((SELECT SUM(b.amount_cents) FROM fantasy_auction_bids b JOIN fantasy_auction_rounds r ON r.league_id=b.league_id AND r.listing_id=b.listing_id AND r.day=b.day WHERE b.league_id=NEW.league_id AND b.uid=NEW.uid AND b.status='active' AND r.status='open'),0)<NEW.amount_cents THEN RAISE(ABORT,'FANTASY_FUNDS') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_clause_boost_apply AFTER INSERT ON fantasy_clause_boost_events BEGIN
 INSERT INTO fantasy_clause_boosts(ownership_id,league_id,extra_cents,start_round)
 VALUES(NEW.ownership_id,NEW.league_id,NEW.amount_cents*2,NEW.start_round)
 ON CONFLICT(ownership_id) DO UPDATE SET
 extra_cents=CASE WHEN fantasy_clause_boosts.start_round+2>excluded.start_round
 THEN fantasy_clause_boosts.extra_cents+excluded.extra_cents ELSE excluded.extra_cents END,
 start_round=excluded.start_round;
 UPDATE fantasy_wallet_cents SET delta_cents=delta_cents-NEW.amount_cents WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallet_values SET delta_tenths=(SELECT delta_cents/10.0 FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallets SET delta_units=(SELECT delta_cents/50.0 FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
END;

CREATE TABLE IF NOT EXISTS fantasy_clause_purchases(
 id TEXT PRIMARY KEY, league_id TEXT NOT NULL, buyer_uid TEXT NOT NULL,
 request_id TEXT NOT NULL, seller_uid TEXT NOT NULL, ownership_id TEXT NOT NULL, player_id TEXT NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 minimum_cents INTEGER NOT NULL CHECK(minimum_cents>0),
 created_at INTEGER NOT NULL, acquired_round INTEGER NOT NULL, current_round INTEGER NOT NULL,
 offer_id TEXT NOT NULL UNIQUE, trade_id TEXT NOT NULL UNIQUE,
 UNIQUE(league_id,buyer_uid,request_id));
CREATE INDEX IF NOT EXISTS fantasy_clause_purchases_league ON fantasy_clause_purchases(league_id,created_at);
-- The server must determine acquired_round and current_round from the official schedule;
-- client-provided round values are not authoritative.
CREATE TRIGGER IF NOT EXISTS fantasy_clause_purchase_guard BEFORE INSERT ON fantasy_clause_purchases BEGIN
 SELECT CASE WHEN COALESCE(json_extract((SELECT settings_json FROM fantasy_leagues WHERE id=NEW.league_id),'$.clausesEnabled'),0)!=1 THEN RAISE(ABORT,'FANTASY_CLAUSES_DISABLED') END;
 SELECT CASE WHEN NEW.buyer_uid=NEW.seller_uid THEN RAISE(ABORT,'FANTASY_CLAUSE_OWN') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster r WHERE r.id=NEW.ownership_id AND r.league_id=NEW.league_id AND r.player_id=NEW.player_id AND r.uid=NEW.seller_uid AND NEW.acquired_round>=0 AND NEW.current_round>=NEW.acquired_round+2) THEN RAISE(ABORT,'FANTASY_CLAUSE_PROTECTED') END;
 SELECT CASE WHEN NEW.amount_cents!=NEW.minimum_cents+COALESCE((SELECT extra_cents FROM fantasy_clause_boosts WHERE ownership_id=NEW.ownership_id AND league_id=NEW.league_id AND start_round+2>NEW.current_round),0) THEN RAISE(ABORT,'FANTASY_CLAUSE_CHANGED') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.seller_uid)<=12 THEN RAISE(ABORT,'FANTASY_ROSTER_MIN') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid)>=16 THEN RAISE(ABORT,'FANTASY_ROSTER_MAX') END;
END;

-- A forced clause offer is a server-only internal receipt. The public /offers
-- API accepts alphanumerics, '-' and '_' only; '!' cannot be supplied there.
DROP TRIGGER IF EXISTS fantasy_offer_limit;
CREATE TRIGGER fantasy_offer_limit BEFORE INSERT ON fantasy_offers
WHEN SUBSTR(NEW.request_id,1,8)!='!clause-' AND NOT EXISTS(
 SELECT 1 FROM fantasy_offers WHERE league_id=NEW.league_id
 AND buyer_uid=NEW.buyer_uid AND request_id=NEW.request_id)
BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_offers WHERE league_id=NEW.league_id
 AND buyer_uid=NEW.buyer_uid AND status='pending' AND expires_at>NEW.created_at)>=20
 THEN RAISE(ABORT,'FANTASY_OFFERS_LIMIT') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_clause_offer_proof BEFORE INSERT ON fantasy_offers
WHEN SUBSTR(NEW.request_id,1,8)='!clause-' BEGIN
 SELECT CASE WHEN NOT EXISTS(
 SELECT 1 FROM fantasy_clause_purchases c
 WHERE c.offer_id=NEW.id AND c.league_id=NEW.league_id AND c.buyer_uid=NEW.buyer_uid
 AND c.seller_uid=NEW.seller_uid AND c.ownership_id=NEW.ownership_id
 AND c.player_id=NEW.player_id AND c.amount_cents=ROUND(NEW.amount_units*50)
 AND c.created_at=NEW.created_at AND c.trade_id IS NOT NULL)
 THEN RAISE(ABORT,'FANTASY_CLAUSE_PROOF') END;
END;
