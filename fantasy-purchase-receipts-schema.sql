CREATE TABLE IF NOT EXISTS fantasy_purchase_seen(uid TEXT NOT NULL,trade_id TEXT NOT NULL,seen_at INTEGER NOT NULL,PRIMARY KEY(uid,trade_id),FOREIGN KEY(trade_id) REFERENCES fantasy_trades(id));
CREATE INDEX IF NOT EXISTS fantasy_trades_buyer_date ON fantasy_trades(buyer_uid,created_at DESC,id DESC);
