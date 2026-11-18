-- Optional number of league-wide automatic market slots, legacy leagues default to 16.
-- Only the Club can change settings through the authorized API.
CREATE TABLE IF NOT EXISTS fantasy_market_slot_settings(
 league_id TEXT PRIMARY KEY NOT NULL REFERENCES fantasy_leagues(id),
 slots INTEGER NOT NULL DEFAULT 16 CHECK(slots BETWEEN 16 AND 24),
 revision INTEGER NOT NULL DEFAULT 0,
 changed_by TEXT NOT NULL,
 changed_at INTEGER NOT NULL
);

-- Concurrent bids cannot be invalidated by a late downsizing write.
CREATE TRIGGER IF NOT EXISTS fantasy_market_slots_bid_guard BEFORE UPDATE OF slots ON fantasy_market_slot_settings
WHEN NEW.slots < OLD.slots AND EXISTS(
 SELECT 1 FROM fantasy_auction_bids b
 JOIN fantasy_auction_rounds r ON r.league_id=b.league_id AND r.listing_id=b.listing_id AND r.day=b.day
 WHERE b.league_id=NEW.league_id AND b.status='active' AND r.status='open'
)
BEGIN SELECT RAISE(ABORT,'FANTASY_MARKET_BIDS_ACTIVE'); END;
