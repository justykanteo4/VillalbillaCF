CREATE TABLE IF NOT EXISTS fantasy_offer_notice_events(offer_id TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS fantasy_offer_push_jobs(offer_id TEXT NOT NULL,token_id TEXT NOT NULL,uid TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,claimed_at INTEGER,ticket TEXT,PRIMARY KEY(offer_id,token_id));
CREATE INDEX IF NOT EXISTS fantasy_offer_push_pending ON fantasy_offer_push_jobs(status,next_at);
CREATE TRIGGER IF NOT EXISTS fantasy_offer_notice_insert AFTER INSERT ON fantasy_offers BEGIN
 INSERT OR IGNORE INTO fantasy_offer_notice_events VALUES(NEW.id,NEW.created_at);
END;
CREATE INDEX IF NOT EXISTS fantasy_offer_notice_date ON fantasy_offer_notice_events(created_at);
