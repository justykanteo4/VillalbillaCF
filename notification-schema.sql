CREATE TABLE IF NOT EXISTS push_subscriptions (
 id TEXT PRIMARY KEY, destination TEXT NOT NULL, provider TEXT NOT NULL,
 payload TEXT NOT NULL, team_ids TEXT NOT NULL, player_ids TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS push_destination ON push_subscriptions(destination);
CREATE TABLE IF NOT EXISTS club_notices (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
 all_club INTEGER NOT NULL, team_ids TEXT NOT NULL, player_ids TEXT NOT NULL,
 created_by TEXT NOT NULL, created_at INTEGER NOT NULL, queued INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS notice_date ON club_notices(created_at);
CREATE TABLE IF NOT EXISTS push_outbox (
 notice_id TEXT NOT NULL, subscription_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 next_at INTEGER NOT NULL DEFAULT 0, ticket TEXT, last_error TEXT,
 PRIMARY KEY(notice_id,subscription_id)
);
CREATE INDEX IF NOT EXISTS outbox_pending ON push_outbox(status,next_at);
