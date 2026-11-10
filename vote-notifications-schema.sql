CREATE TABLE IF NOT EXISTS vote_notice_events(id TEXT PRIMARY KEY,category TEXT NOT NULL,points INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vote_notice_jobs(event_id TEXT NOT NULL,token_id TEXT NOT NULL,admin_uid TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,claimed_at INTEGER,ticket TEXT,PRIMARY KEY(event_id,token_id,admin_uid));
CREATE INDEX IF NOT EXISTS vote_notice_pending ON vote_notice_jobs(status,next_at);
CREATE TRIGGER IF NOT EXISTS vote_notice_insert AFTER INSERT ON social_ballots BEGIN
 INSERT INTO vote_notice_events VALUES(lower(hex(randomblob(16))),NEW.category,NEW.points,unixepoch()*1000);
END;
CREATE TRIGGER IF NOT EXISTS vote_notice_change AFTER UPDATE OF candidate_id ON social_ballots WHEN NEW.candidate_id<>OLD.candidate_id BEGIN
 INSERT INTO vote_notice_events VALUES(lower(hex(randomblob(16))),NEW.category,NEW.points,unixepoch()*1000);
END;
