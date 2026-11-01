CREATE TABLE IF NOT EXISTS social_likes(match_id TEXT NOT NULL,uid TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(match_id,uid));
CREATE TABLE IF NOT EXISTS social_comments(id TEXT PRIMARY KEY,match_id TEXT NOT NULL,uid TEXT NOT NULL,author TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS social_comments_match ON social_comments(match_id,created_at);
CREATE INDEX IF NOT EXISTS social_comments_rate ON social_comments(uid,created_at);
CREATE TABLE IF NOT EXISTS social_votes(season TEXT NOT NULL,category TEXT NOT NULL,uid TEXT NOT NULL,candidate_id TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(season,category,uid));
CREATE INDEX IF NOT EXISTS social_votes_top ON social_votes(season,category,candidate_id);
