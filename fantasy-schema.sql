CREATE TABLE IF NOT EXISTS fantasy_leagues(id TEXT PRIMARY KEY,owner_uid TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,name TEXT NOT NULL,mode TEXT NOT NULL,pool_json TEXT NOT NULL,settings_json TEXT NOT NULL,code TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,UNIQUE(owner_uid,request_id));
CREATE INDEX IF NOT EXISTS fantasy_league_owner ON fantasy_leagues(owner_uid);
CREATE TABLE IF NOT EXISTS fantasy_members(league_id TEXT NOT NULL,uid TEXT NOT NULL,nickname TEXT NOT NULL,joined_at INTEGER NOT NULL,PRIMARY KEY(league_id,uid),FOREIGN KEY(league_id) REFERENCES fantasy_leagues(id));
CREATE INDEX IF NOT EXISTS fantasy_member_user ON fantasy_members(uid,league_id);
CREATE TRIGGER IF NOT EXISTS fantasy_members_capacity BEFORE INSERT ON fantasy_members WHEN NOT EXISTS(SELECT 1 FROM fantasy_members WHERE league_id=NEW.league_id AND uid=NEW.uid) BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_members WHERE league_id=NEW.league_id)>=CAST(json_extract((SELECT settings_json FROM fantasy_leagues WHERE id=NEW.league_id),'$.maxMembers') AS INTEGER) THEN RAISE(ABORT,'FANTASY_FULL') END;
END;
CREATE TABLE IF NOT EXISTS fantasy_player_prices(player_id TEXT PRIMARY KEY,price REAL,revision INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL,changed_by TEXT NOT NULL,CHECK(price IS NULL OR (price>=1 AND price<=100 AND price*2=CAST(price*2 AS INTEGER))));
