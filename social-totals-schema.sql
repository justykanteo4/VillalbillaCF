CREATE TABLE IF NOT EXISTS social_candidate_totals(season TEXT NOT NULL,category TEXT NOT NULL,candidate_id TEXT NOT NULL,points_total INTEGER NOT NULL,votes_total INTEGER NOT NULL,PRIMARY KEY(season,category,candidate_id));
INSERT INTO social_candidate_totals SELECT season,category,candidate_id,SUM(points),COUNT(*) FROM social_ballots GROUP BY season,category,candidate_id HAVING 1 ON CONFLICT(season,category,candidate_id) DO UPDATE SET points_total=excluded.points_total,votes_total=excluded.votes_total;
DELETE FROM social_candidate_totals WHERE NOT EXISTS(SELECT 1 FROM social_ballots b WHERE b.season=social_candidate_totals.season AND b.category=social_candidate_totals.category AND b.candidate_id=social_candidate_totals.candidate_id);
CREATE INDEX IF NOT EXISTS social_total_ranking ON social_candidate_totals(season,category,points_total DESC,candidate_id);
CREATE TRIGGER IF NOT EXISTS social_total_insert AFTER INSERT ON social_ballots BEGIN
 INSERT INTO social_candidate_totals VALUES(NEW.season,NEW.category,NEW.candidate_id,NEW.points,1) ON CONFLICT(season,category,candidate_id) DO UPDATE SET points_total=points_total+NEW.points,votes_total=votes_total+1;
END;
CREATE TRIGGER IF NOT EXISTS social_total_delete AFTER DELETE ON social_ballots BEGIN
 UPDATE social_candidate_totals SET points_total=points_total-OLD.points,votes_total=votes_total-1 WHERE season=OLD.season AND category=OLD.category AND candidate_id=OLD.candidate_id;
 DELETE FROM social_candidate_totals WHERE season=OLD.season AND category=OLD.category AND candidate_id=OLD.candidate_id AND votes_total=0;
END;
CREATE TRIGGER IF NOT EXISTS social_total_change AFTER UPDATE ON social_ballots WHEN OLD.season!=NEW.season OR OLD.category!=NEW.category OR OLD.candidate_id!=NEW.candidate_id OR OLD.points!=NEW.points BEGIN
 UPDATE social_candidate_totals SET points_total=points_total-OLD.points,votes_total=votes_total-1 WHERE season=OLD.season AND category=OLD.category AND candidate_id=OLD.candidate_id;
 DELETE FROM social_candidate_totals WHERE season=OLD.season AND category=OLD.category AND candidate_id=OLD.candidate_id AND votes_total=0;
 INSERT INTO social_candidate_totals VALUES(NEW.season,NEW.category,NEW.candidate_id,NEW.points,1) ON CONFLICT(season,category,candidate_id) DO UPDATE SET points_total=points_total+NEW.points,votes_total=votes_total+1;
END;
