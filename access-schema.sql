CREATE TABLE IF NOT EXISTS access_push_tokens(id TEXT PRIMARY KEY,uid TEXT NOT NULL,token TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS access_token_uid ON access_push_tokens(uid);
CREATE TABLE IF NOT EXISTS access_notice_events(id TEXT PRIMARY KEY,uid TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS access_push_jobs(notice_id TEXT NOT NULL,subscription_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,claimed_at INTEGER,ticket TEXT,PRIMARY KEY(notice_id,subscription_id));
