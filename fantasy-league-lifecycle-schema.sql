-- Non-destructive lifecycle state for Fantasy leagues. Archiving never deletes data.
CREATE TABLE IF NOT EXISTS fantasy_league_lifecycle(
 league_id TEXT PRIMARY KEY NOT NULL REFERENCES fantasy_leagues(id),
 state TEXT NOT NULL DEFAULT 'active' CHECK(state IN('active','paused','archived')),
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL DEFAULT 0,
 updated_by TEXT NOT NULL DEFAULT 'system'
);
CREATE TRIGGER IF NOT EXISTS fantasy_lifecycle_members_guard BEFORE INSERT ON fantasy_members
WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active'
BEGIN SELECT RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_lifecycle_trade_guard BEFORE INSERT ON fantasy_trades
WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active'
BEGIN SELECT RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_lifecycle_offer_guard BEFORE INSERT ON fantasy_offers
WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active'
BEGIN SELECT RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_lifecycle_bid_guard BEFORE INSERT ON fantasy_auction_bids
WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active'
BEGIN SELECT RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_lifecycle_bid_update_guard BEFORE UPDATE OF amount_cents ON fantasy_auction_bids
WHEN NEW.amount_cents<>OLD.amount_cents AND COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active'
BEGIN SELECT RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_lifecycle_lineup_insert_guard BEFORE INSERT ON fantasy_lineups
WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active'
BEGIN SELECT RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_lifecycle_lineup_update_guard BEFORE UPDATE ON fantasy_lineups
WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active'
BEGIN SELECT RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE'); END;
