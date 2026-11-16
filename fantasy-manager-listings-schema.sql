-- Apply after fantasy-clause-schema.sql.
-- Owners keep the player until a successful manager-auction settlement.
CREATE TABLE IF NOT EXISTS fantasy_manager_listings(
 listing_id TEXT PRIMARY KEY, league_id TEXT NOT NULL, uid TEXT NOT NULL,
 ownership_id TEXT NOT NULL, player_id TEXT NOT NULL,
 min_cents INTEGER NOT NULL CHECK(min_cents BETWEEN 100 AND 100000),
 expires_at INTEGER NOT NULL, request_id TEXT NOT NULL,
 UNIQUE(league_id,uid,request_id),
 FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid),
 FOREIGN KEY(listing_id) REFERENCES fantasy_market_listings(id));
CREATE INDEX IF NOT EXISTS fantasy_manager_listings_owner ON fantasy_manager_listings(league_id,uid,ownership_id);
CREATE TRIGGER IF NOT EXISTS fantasy_manager_listing_guard BEFORE INSERT ON fantasy_manager_listings BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster r WHERE r.id=NEW.ownership_id AND r.league_id=NEW.league_id AND r.uid=NEW.uid AND r.player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_LISTING_OWNER') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.uid)<=12 THEN RAISE(ABORT,'FANTASY_ROSTER_MIN') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_market_listings l WHERE l.id=NEW.listing_id AND l.league_id=NEW.league_id AND l.player_id=NEW.player_id AND l.retired_day IS NULL) THEN RAISE(ABORT,'FANTASY_LISTING_CHANGED') END;
END;
-- Bypass the 20 pending voluntary offer limit for internal settled auction receipts.
DROP TRIGGER IF EXISTS fantasy_offer_limit;
CREATE TRIGGER fantasy_offer_limit BEFORE INSERT ON fantasy_offers
WHEN SUBSTR(NEW.request_id,1,8)!='!clause-'
 AND SUBSTR(NEW.request_id,1,9)!='!manager-'
 AND NOT EXISTS(SELECT 1 FROM fantasy_offers WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND request_id=NEW.request_id)
BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_offers WHERE league_id=NEW.league_id AND buyer_uid=NEW.buyer_uid AND status='pending' AND expires_at>NEW.created_at)>=20
 THEN RAISE(ABORT,'FANTASY_OFFERS_LIMIT') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_manager_offer_proof BEFORE INSERT ON fantasy_offers
WHEN SUBSTR(NEW.request_id,1,9)='!manager-' BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM fantasy_manager_listings m
  JOIN fantasy_auction_wins w ON w.listing_id=m.listing_id AND w.league_id=m.league_id
  WHERE w.trade_id=SUBSTR(NEW.request_id,10)
    AND w.uid=NEW.buyer_uid AND w.amount_cents=ROUND(NEW.amount_units*50)
    AND m.league_id=NEW.league_id AND m.uid=NEW.seller_uid
    AND m.ownership_id=NEW.ownership_id AND m.player_id=NEW.player_id
    AND NEW.buyer_uid!=NEW.seller_uid
 ) THEN RAISE(ABORT,'FANTASY_MANAGER_AUCTION_PROOF') END;
END;
