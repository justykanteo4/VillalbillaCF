-- Administrative player acquisition ban scoped to each league (no deletion of owned players).
CREATE TABLE IF NOT EXISTS fantasy_player_blocks(
 league_id TEXT NOT NULL REFERENCES fantasy_leagues(id),
 player_id TEXT NOT NULL,
 blocked_by TEXT NOT NULL,
 blocked_at INTEGER NOT NULL,
 PRIMARY KEY(league_id,player_id)
);
CREATE INDEX IF NOT EXISTS fantasy_player_blocks_league ON fantasy_player_blocks(league_id,blocked_at DESC);
CREATE TRIGGER IF NOT EXISTS fantasy_player_block_trade BEFORE INSERT ON fantasy_trades
WHEN EXISTS(SELECT 1 FROM fantasy_player_blocks WHERE league_id=NEW.league_id AND player_id=NEW.player_id)
BEGIN SELECT RAISE(ABORT,'FANTASY_PLAYER_BLOCKED'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_player_block_offer BEFORE INSERT ON fantasy_offers
WHEN EXISTS(SELECT 1 FROM fantasy_player_blocks WHERE league_id=NEW.league_id AND player_id=NEW.player_id)
BEGIN SELECT RAISE(ABORT,'FANTASY_PLAYER_BLOCKED'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_player_block_bid BEFORE INSERT ON fantasy_auction_bids
WHEN EXISTS(SELECT 1 FROM fantasy_player_blocks b JOIN fantasy_market_listings l ON l.league_id=b.league_id AND l.player_id=b.player_id WHERE b.league_id=NEW.league_id AND l.id=NEW.listing_id)
BEGIN SELECT RAISE(ABORT,'FANTASY_PLAYER_BLOCKED'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_player_block_bid_change BEFORE UPDATE OF amount_cents ON fantasy_auction_bids
WHEN NEW.amount_cents<>OLD.amount_cents AND EXISTS(SELECT 1 FROM fantasy_player_blocks b JOIN fantasy_market_listings l ON l.league_id=b.league_id AND l.player_id=b.player_id WHERE b.league_id=NEW.league_id AND l.id=NEW.listing_id)
BEGIN SELECT RAISE(ABORT,'FANTASY_PLAYER_BLOCKED'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_player_block_clause BEFORE INSERT ON fantasy_clause_purchases
WHEN EXISTS(SELECT 1 FROM fantasy_player_blocks WHERE league_id=NEW.league_id AND player_id=NEW.player_id)
BEGIN SELECT RAISE(ABORT,'FANTASY_PLAYER_BLOCKED'); END;
