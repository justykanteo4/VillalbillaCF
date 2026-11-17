CREATE TABLE IF NOT EXISTS vote_notification_preferences(uid TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)),updated_at INTEGER NOT NULL);
