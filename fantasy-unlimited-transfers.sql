-- Migration: no weekly transfer limit. All other financial, roster and trade guards remain unchanged.
-- Apply to Cloudflare D1 before deploying the updated API.
DROP TRIGGER IF EXISTS fantasy_trade_guard;
CREATE TRIGGER fantasy_trade_guard BEFORE INSERT ON fantasy_trades BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM fantasy_roster WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND (NEW.offer_id IS NULL OR uid=NEW.buyer_uid)) THEN RAISE(ABORT,'FANTASY_OWNED') END;
 SELECT CASE WHEN COALESCE((SELECT delta_cents FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid),-999999999)+ROUND(NEW.budget_units*50)-COALESCE((SELECT SUM(b.amount_cents) FROM fantasy_auction_bids b JOIN fantasy_auction_rounds r ON r.league_id=b.league_id AND r.listing_id=b.listing_id AND r.day=b.day WHERE b.league_id=NEW.league_id AND b.uid=NEW.buyer_uid AND r.status='open' AND b.status='active'),0)<ROUND(NEW.amount_units*50) THEN RAISE(ABORT,'FANTASY_FUNDS') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.buyer_uid)>=16 THEN RAISE(ABORT,'FANTASY_ROSTER_MAX') END;
 SELECT CASE WHEN NEW.offer_id IS NULL AND NOT EXISTS(SELECT 1 FROM fantasy_auction_wins w WHERE w.trade_id=NEW.id AND w.league_id=NEW.league_id AND w.listing_id=NEW.listing_id AND w.uid=NEW.buyer_uid AND w.amount_cents=ROUND(NEW.amount_units*50)) THEN RAISE(ABORT,'FANTASY_AUCTION_REQUIRED') END;
 SELECT CASE WHEN NEW.offer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM fantasy_offers o JOIN fantasy_roster r ON r.id=o.ownership_id WHERE o.id=NEW.offer_id AND o.league_id=NEW.league_id AND o.buyer_uid=NEW.buyer_uid AND o.seller_uid=NEW.seller_uid AND o.ownership_id=NEW.ownership_id AND o.player_id=NEW.player_id AND o.amount_units=NEW.amount_units AND o.status='pending' AND o.expires_at>NEW.created_at AND r.league_id=NEW.league_id AND r.uid=NEW.seller_uid AND r.player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_OFFER_CHANGED') END;
END;
