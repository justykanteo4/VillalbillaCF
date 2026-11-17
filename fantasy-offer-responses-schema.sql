-- Solo decisiones nuevas; no notificar resoluciones históricas al instalar.
CREATE TABLE IF NOT EXISTS fantasy_offer_responses(offer_id TEXT PRIMARY KEY,status TEXT NOT NULL CHECK(status IN('accepted','rejected')),created_at INTEGER NOT NULL,queued_at INTEGER);
CREATE INDEX IF NOT EXISTS fantasy_offer_response_queue ON fantasy_offer_responses(queued_at,created_at);
CREATE INDEX IF NOT EXISTS fantasy_offer_response_date ON fantasy_offer_responses(created_at);
CREATE TABLE IF NOT EXISTS fantasy_offer_response_jobs(offer_id TEXT NOT NULL,token_id TEXT NOT NULL,uid TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,claimed_at INTEGER,ticket TEXT,PRIMARY KEY(offer_id,token_id));
CREATE INDEX IF NOT EXISTS fantasy_offer_response_pending ON fantasy_offer_response_jobs(status,next_at);
CREATE TRIGGER IF NOT EXISTS fantasy_offer_response AFTER UPDATE OF status ON fantasy_offers WHEN OLD.status='pending' AND NEW.status IN('accepted','rejected') BEGIN
 INSERT INTO fantasy_offer_responses(offer_id,status,created_at) VALUES(NEW.id,NEW.status,unixepoch()*1000) ON CONFLICT(offer_id) DO NOTHING;
 INSERT INTO fantasy_messages(source,league_id,recipient,kind,player_id,actor,amount_cents,offer_id,created_at) VALUES('offer-response:'||NEW.id,NEW.league_id,NEW.buyer_uid,'offer-'||NEW.status,NEW.player_id,NEW.seller_uid,CAST(ROUND(NEW.amount_units*50) AS INTEGER),NEW.id,unixepoch()*1000) ON CONFLICT(source) DO NOTHING;
END;
