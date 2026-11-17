-- Un solo evento por operación; lectura privada por participante y liga.
CREATE TABLE IF NOT EXISTS fantasy_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,source TEXT NOT NULL UNIQUE,league_id TEXT NOT NULL,recipient TEXT,kind TEXT NOT NULL,player_id TEXT,actor TEXT,other_actor TEXT,amount_cents INTEGER,week INTEGER,position INTEGER,offer_id TEXT,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS fantasy_message_timeline ON fantasy_messages(league_id,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS fantasy_message_reads(uid TEXT NOT NULL,message_id INTEGER NOT NULL,seen_at INTEGER,postponed_until INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(uid,message_id));
CREATE TRIGGER IF NOT EXISTS fantasy_message_offer AFTER INSERT ON fantasy_offers BEGIN
 INSERT INTO fantasy_messages(source,league_id,recipient,kind,player_id,actor,amount_cents,offer_id,created_at) VALUES('offer:'||NEW.id,NEW.league_id,NEW.seller_uid,'offer',NEW.player_id,NEW.buyer_uid,CAST(ROUND(NEW.amount_units*50) AS INTEGER),NEW.id,NEW.created_at) ON CONFLICT(source) DO NOTHING;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_message_trade AFTER INSERT ON fantasy_trades BEGIN
 INSERT INTO fantasy_messages(source,league_id,kind,player_id,actor,other_actor,amount_cents,created_at) VALUES('trade:'||NEW.id,NEW.league_id,'transfer',NEW.player_id,NEW.buyer_uid,NEW.seller_uid,CAST(ROUND(NEW.amount_units*50) AS INTEGER),NEW.created_at) ON CONFLICT(source) DO NOTHING;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_message_sale AFTER INSERT ON fantasy_player_sales BEGIN
 INSERT INTO fantasy_messages(source,league_id,kind,player_id,actor,amount_cents,created_at) VALUES('sale:'||NEW.id,NEW.league_id,'sale',NEW.player_id,NEW.uid,NEW.amount_cents,NEW.created_at) ON CONFLICT(source) DO NOTHING;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_message_prize AFTER INSERT ON fantasy_prize_events BEGIN
 INSERT INTO fantasy_messages(source,league_id,recipient,kind,actor,amount_cents,week,position,created_at) VALUES('prize:'||NEW.id,NEW.league_id,NEW.uid,'prize',NEW.uid,NEW.amount_cents,NEW.week,NEW.position,NEW.created_at) ON CONFLICT(source) DO NOTHING;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_message_winner AFTER INSERT ON fantasy_weekly_prizes WHEN NEW.position=1 BEGIN
 INSERT INTO fantasy_messages(source,league_id,kind,actor,week,position,created_at) VALUES('winner:'||NEW.league_id||':'||NEW.week||':'||NEW.uid,NEW.league_id,'winner',NEW.uid,NEW.week,NEW.position,NEW.updated_at) ON CONFLICT(source) DO NOTHING;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_message_winner_adjust AFTER UPDATE ON fantasy_weekly_prizes BEGIN
 DELETE FROM fantasy_messages WHERE source='winner:'||NEW.league_id||':'||NEW.week||':'||NEW.uid AND NEW.position!=1;
 INSERT INTO fantasy_messages(source,league_id,kind,actor,week,position,created_at) SELECT 'winner:'||NEW.league_id||':'||NEW.week||':'||NEW.uid,NEW.league_id,'winner',NEW.uid,NEW.week,NEW.position,NEW.updated_at WHERE NEW.position=1 ON CONFLICT(source) DO NOTHING;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_message_ideal AFTER INSERT ON fantasy_ideal_reward_events BEGIN
 INSERT INTO fantasy_messages(source,league_id,recipient,kind,player_id,actor,amount_cents,week,created_at) VALUES('ideal:'||NEW.id,NEW.league_id,NEW.uid,'ideal',NEW.player_id,NEW.uid,NEW.amount_cents,NEW.week,NEW.created_at) ON CONFLICT(source) DO NOTHING;
END;
-- Historial inicial idempotente; consultas separadas para respetar los límites SQL de D1.
INSERT INTO fantasy_messages(source,league_id,recipient,kind,player_id,actor,amount_cents,offer_id,created_at) SELECT 'offer:'||id,league_id,seller_uid,'offer',player_id,buyer_uid,CAST(ROUND(amount_units*50) AS INTEGER),id,created_at FROM fantasy_offers WHERE 1 ON CONFLICT(source) DO NOTHING;
INSERT INTO fantasy_messages(source,league_id,kind,player_id,actor,other_actor,amount_cents,created_at) SELECT 'trade:'||id,league_id,'transfer',player_id,buyer_uid,seller_uid,CAST(ROUND(amount_units*50) AS INTEGER),created_at FROM fantasy_trades WHERE 1 ON CONFLICT(source) DO NOTHING;
INSERT INTO fantasy_messages(source,league_id,kind,player_id,actor,amount_cents,created_at) SELECT 'sale:'||id,league_id,'sale',player_id,uid,amount_cents,created_at FROM fantasy_player_sales WHERE 1 ON CONFLICT(source) DO NOTHING;
INSERT INTO fantasy_messages(source,league_id,recipient,kind,actor,amount_cents,week,position,created_at) SELECT 'prize:'||id,league_id,uid,'prize',uid,amount_cents,week,position,created_at FROM fantasy_prize_events WHERE 1 ON CONFLICT(source) DO NOTHING;
INSERT INTO fantasy_messages(source,league_id,kind,actor,week,position,created_at) SELECT 'winner:'||league_id||':'||week||':'||uid,league_id,'winner',uid,week,position,updated_at FROM fantasy_weekly_prizes WHERE position=1 ON CONFLICT(source) DO NOTHING;
INSERT INTO fantasy_messages(source,league_id,recipient,kind,player_id,actor,amount_cents,week,created_at) SELECT 'ideal:'||id,league_id,uid,'ideal',player_id,uid,amount_cents,week,created_at FROM fantasy_ideal_reward_events WHERE 1 ON CONFLICT(source) DO NOTHING;
