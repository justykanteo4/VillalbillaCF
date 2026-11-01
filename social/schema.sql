-- Additive migration: run against existing NOTIFICATIONS_DB. No new database or paid plan.
CREATE TABLE IF NOT EXISTS social_posts (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,body TEXT NOT NULL,author_uid TEXT NOT NULL,
 author_name TEXT NOT NULL,created_at INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS social_posts_visible ON social_posts(deleted,seq);
CREATE TABLE IF NOT EXISTS social_comments (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,topic TEXT NOT NULL,
 body TEXT NOT NULL,author_uid TEXT NOT NULL,author_name TEXT NOT NULL,
 created_at INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS social_comments_topic ON social_comments(topic,seq);
CREATE INDEX IF NOT EXISTS social_comments_visible ON social_comments(topic,deleted,seq);
CREATE TABLE IF NOT EXISTS social_likes (
 topic TEXT NOT NULL,uid TEXT NOT NULL,created_at INTEGER NOT NULL,
 PRIMARY KEY(topic,uid)
);
CREATE TABLE IF NOT EXISTS social_reports (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,target_type TEXT NOT NULL,target_id TEXT NOT NULL,
 reporter_uid TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,
 resolved INTEGER NOT NULL DEFAULT 0,UNIQUE(target_type,target_id,reporter_uid)
);
CREATE INDEX IF NOT EXISTS social_reports_open ON social_reports(resolved,seq);
CREATE TABLE IF NOT EXISTS social_limits (
 bucket TEXT NOT NULL,day TEXT NOT NULL,n INTEGER NOT NULL,
 PRIMARY KEY(bucket,day)
);
