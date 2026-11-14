-- Una política duradera: conserva las aportaciones anteriores al 16/11/2026.
CREATE TABLE IF NOT EXISTS fantasy_economy_policy(id INTEGER PRIMARY KEY CHECK(id=1),settings_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO fantasy_economy_policy VALUES(1,'{"weeklyIncomeCents":0,"fromWeek":2968,"prizesFromWeek":2967,"prizesCents":[1000,800,600,500]}',0);
CREATE TABLE IF NOT EXISTS fantasy_weekly_prizes(league_id TEXT NOT NULL,week INTEGER NOT NULL,uid TEXT NOT NULL,position INTEGER NOT NULL,points INTEGER NOT NULL,amount_cents INTEGER NOT NULL CHECK(amount_cents IN(1000,800,600,500)),provisional INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL,PRIMARY KEY(league_id,week,uid),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
CREATE TABLE IF NOT EXISTS fantasy_prize_events(id INTEGER PRIMARY KEY AUTOINCREMENT,league_id TEXT NOT NULL,uid TEXT NOT NULL,week INTEGER NOT NULL,position INTEGER NOT NULL,amount_cents INTEGER NOT NULL,kind TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS fantasy_prize_user ON fantasy_prize_events(league_id,uid,created_at);
CREATE TRIGGER IF NOT EXISTS fantasy_prize_first AFTER INSERT ON fantasy_weekly_prizes BEGIN
 INSERT INTO fantasy_prize_events(league_id,uid,week,position,amount_cents,kind,created_at) VALUES(NEW.league_id,NEW.uid,NEW.week,NEW.position,NEW.amount_cents,'prize',NEW.updated_at);
END;
CREATE TRIGGER IF NOT EXISTS fantasy_prize_adjust AFTER UPDATE ON fantasy_weekly_prizes WHEN NEW.amount_cents!=OLD.amount_cents BEGIN
 INSERT INTO fantasy_prize_events(league_id,uid,week,position,amount_cents,kind,created_at) VALUES(NEW.league_id,NEW.uid,NEW.week,NEW.position,NEW.amount_cents-OLD.amount_cents,'adjustment',NEW.updated_at);
END;
CREATE TRIGGER IF NOT EXISTS fantasy_prize_credit AFTER INSERT ON fantasy_prize_events BEGIN
 UPDATE fantasy_wallet_cents SET delta_cents=delta_cents+NEW.amount_cents WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallet_values SET delta_tenths=(SELECT delta_cents/10.0 FROM fantasy_wallet_cents v WHERE v.league_id=NEW.league_id AND v.uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallets SET delta_units=(SELECT delta_cents/50.0 FROM fantasy_wallet_cents v WHERE v.league_id=NEW.league_id AND v.uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
END;
CREATE TABLE IF NOT EXISTS fantasy_prize_state(league_id TEXT PRIMARY KEY,lease_until INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,fingerprint TEXT,status_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS fantasy_reward_migrations(id TEXT PRIMARY KEY);
UPDATE fantasy_salary_policy SET settings_json='{"mode":"ranking-v2","baseCents":25,"rangeCents":130,"voteWeight":60,"extraTeamCents":15,"extraTeamCapCents":45,"maxCents":200}',revision=revision+1 WHERE id=1 AND NOT EXISTS(SELECT 1 FROM fantasy_reward_migrations WHERE id='salary-v2-and-weekly-prizes');
-- El límite nuevo no altera sueldos que ya se hayan cobrado.
UPDATE fantasy_coach_contracts SET salary_cents=200 WHERE ends_at IS NULL AND salary_cents>200 AND NOT EXISTS(SELECT 1 FROM fantasy_reward_migrations WHERE id='salary-v2-and-weekly-prizes');
INSERT OR IGNORE INTO fantasy_reward_migrations VALUES('salary-v2-and-weekly-prizes');
CREATE TABLE IF NOT EXISTS fantasy_background_state(league_id TEXT PRIMARY KEY,checked_at INTEGER NOT NULL DEFAULT 0);
