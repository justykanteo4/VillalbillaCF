-- Solo acuses de lectura; nunca modifica premios ni saldos.
CREATE TABLE IF NOT EXISTS fantasy_prize_seen(uid TEXT NOT NULL,event_id INTEGER NOT NULL,seen_at INTEGER NOT NULL,PRIMARY KEY(uid,event_id));
CREATE INDEX IF NOT EXISTS fantasy_prize_receipt_user ON fantasy_prize_events(uid,league_id,week,id);
