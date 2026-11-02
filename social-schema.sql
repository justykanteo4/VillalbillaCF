CREATE TABLE IF NOT EXISTS social_likes(match_id TEXT NOT NULL,uid TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(match_id,uid));
CREATE TABLE IF NOT EXISTS social_comments(id TEXT PRIMARY KEY,match_id TEXT NOT NULL,uid TEXT NOT NULL,author TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS social_comments_match ON social_comments(match_id,created_at);
CREATE INDEX IF NOT EXISTS social_comments_rate ON social_comments(uid,created_at);
CREATE TABLE IF NOT EXISTS social_votes(season TEXT NOT NULL,category TEXT NOT NULL,uid TEXT NOT NULL,candidate_id TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(season,category,uid));
CREATE INDEX IF NOT EXISTS social_votes_top ON social_votes(season,category,candidate_id);
CREATE TABLE IF NOT EXISTS social_ballots(season TEXT NOT NULL,category TEXT NOT NULL,uid TEXT NOT NULL,points INTEGER NOT NULL CHECK(points IN (1,2,3)),candidate_id TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(season,category,uid,points),UNIQUE(season,category,uid,candidate_id));
CREATE INDEX IF NOT EXISTS social_ballots_top ON social_ballots(season,category,candidate_id);
CREATE TABLE IF NOT EXISTS social_migrations(id TEXT PRIMARY KEY);
INSERT OR IGNORE INTO social_ballots(season,category,uid,points,candidate_id,updated_at) SELECT season,category,uid,1,candidate_id,updated_at FROM social_votes WHERE NOT EXISTS(SELECT 1 FROM social_migrations WHERE id='points-321');
INSERT OR IGNORE INTO social_migrations VALUES('points-321');
CREATE TABLE IF NOT EXISTS social_ballot_limits(season TEXT NOT NULL,category TEXT NOT NULL,uid TEXT NOT NULL,changes INTEGER NOT NULL DEFAULT 0 CHECK(changes BETWEEN 0 AND 4),seen_mask INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(season,category,uid));
INSERT OR IGNORE INTO social_ballot_limits(season,category,uid,changes,seen_mask) SELECT season,category,uid,0,SUM(1 << points) FROM social_ballots GROUP BY season,category,uid;
CREATE TRIGGER IF NOT EXISTS social_ballot_insert_limit BEFORE INSERT ON social_ballots BEGIN
 INSERT OR IGNORE INTO social_ballot_limits VALUES(NEW.season,NEW.category,NEW.uid,0,0);
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM social_ballots WHERE season=NEW.season AND category=NEW.category AND uid=NEW.uid AND points=NEW.points) AND EXISTS(SELECT 1 FROM social_ballot_limits WHERE season=NEW.season AND category=NEW.category AND uid=NEW.uid AND changes>=4 AND (seen_mask & (1 << NEW.points))<>0) THEN RAISE(ABORT,'VOTE_CHANGE_LIMIT') END;
END;
CREATE TRIGGER IF NOT EXISTS social_ballot_insert_count AFTER INSERT ON social_ballots BEGIN
 UPDATE social_ballot_limits SET changes=changes+CASE WHEN (seen_mask & (1 << NEW.points))<>0 THEN 1 ELSE 0 END,seen_mask=seen_mask | (1 << NEW.points) WHERE season=NEW.season AND category=NEW.category AND uid=NEW.uid;
END;
CREATE TRIGGER IF NOT EXISTS social_ballot_update_limit BEFORE UPDATE OF candidate_id ON social_ballots WHEN NEW.candidate_id<>OLD.candidate_id BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM social_ballot_limits WHERE season=OLD.season AND category=OLD.category AND uid=OLD.uid AND changes>=4) THEN RAISE(ABORT,'VOTE_CHANGE_LIMIT') END;
END;
CREATE TRIGGER IF NOT EXISTS social_ballot_update_count AFTER UPDATE OF candidate_id ON social_ballots WHEN NEW.candidate_id<>OLD.candidate_id BEGIN
 UPDATE social_ballot_limits SET changes=changes+1 WHERE season=OLD.season AND category=OLD.category AND uid=OLD.uid;
END;
CREATE TRIGGER IF NOT EXISTS social_ballot_delete_limit BEFORE DELETE ON social_ballots BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM social_ballot_limits WHERE season=OLD.season AND category=OLD.category AND uid=OLD.uid AND changes>=4) THEN RAISE(ABORT,'VOTE_CHANGE_LIMIT') END;
END;
CREATE TRIGGER IF NOT EXISTS social_ballot_delete_count AFTER DELETE ON social_ballots BEGIN
 UPDATE social_ballot_limits SET changes=changes+1 WHERE season=OLD.season AND category=OLD.category AND uid=OLD.uid;
END;
