CREATE TABLE IF NOT EXISTS fantasy_resale_listings(sale_id TEXT PRIMARY KEY,listing_id TEXT NOT NULL UNIQUE,listed_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,FOREIGN KEY(sale_id) REFERENCES fantasy_player_sales(id),FOREIGN KEY(listing_id) REFERENCES fantasy_market_listings(id));
CREATE INDEX IF NOT EXISTS fantasy_resale_expiry ON fantasy_resale_listings(expires_at);
CREATE TRIGGER IF NOT EXISTS fantasy_resale_register AFTER INSERT ON fantasy_market_listings WHEN NEW.id LIKE 'resale-%' AND EXISTS(SELECT 1 FROM fantasy_player_sales WHERE id=substr(NEW.id,8)) BEGIN
 INSERT INTO fantasy_resale_listings(sale_id,listing_id,listed_at,expires_at) SELECT id,NEW.id,created_at,created_at+604800000 FROM fantasy_player_sales WHERE id=substr(NEW.id,8);
END;
CREATE TRIGGER IF NOT EXISTS fantasy_sale_relist AFTER INSERT ON fantasy_player_sales BEGIN
 INSERT INTO fantasy_market_listings(id,league_id,player_id,listed_day,slot) VALUES('resale-'||NEW.id,NEW.league_id,NEW.player_id,CAST(NEW.created_at/86400000 AS INTEGER),COALESCE((SELECT MIN(slot) FROM fantasy_market_listings WHERE league_id=NEW.league_id AND listed_day=CAST(NEW.created_at/86400000 AS INTEGER)),0)-1);
END;

CREATE TABLE IF NOT EXISTS fantasy_market_top_weeks(league_id TEXT NOT NULL,week INTEGER NOT NULL,listing_id TEXT NOT NULL,PRIMARY KEY(league_id,week),FOREIGN KEY(league_id) REFERENCES fantasy_leagues(id));
