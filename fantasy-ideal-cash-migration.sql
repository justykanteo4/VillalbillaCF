CREATE TABLE IF NOT EXISTS fantasy_ideal_rewards(league_id TEXT NOT NULL,uid TEXT NOT NULL,week INTEGER NOT NULL,player_id TEXT NOT NULL,amount_cents INTEGER NOT NULL CHECK(amount_cents IN(0,100,200)),captain INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(league_id,uid,week,player_id));
CREATE TABLE IF NOT EXISTS fantasy_ideal_reward_events(id INTEGER PRIMARY KEY AUTOINCREMENT,league_id TEXT NOT NULL,uid TEXT NOT NULL,week INTEGER NOT NULL,player_id TEXT NOT NULL,amount_cents INTEGER NOT NULL,captain INTEGER NOT NULL,kind TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS fantasy_ideal_reward_user ON fantasy_ideal_reward_events(league_id,uid,created_at);
CREATE TABLE IF NOT EXISTS fantasy_ideal_reward_state(league_id TEXT PRIMARY KEY,lease_until INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,fingerprint TEXT);
CREATE TABLE IF NOT EXISTS fantasy_round_closures(league_id TEXT NOT NULL,week INTEGER NOT NULL,closed_at INTEGER NOT NULL,PRIMARY KEY(league_id,week));
CREATE TRIGGER IF NOT EXISTS fantasy_ideal_first AFTER INSERT ON fantasy_ideal_rewards WHEN NEW.amount_cents>0 BEGIN
 INSERT INTO fantasy_ideal_reward_events(league_id,uid,week,player_id,amount_cents,captain,kind,created_at) VALUES(NEW.league_id,NEW.uid,NEW.week,NEW.player_id,NEW.amount_cents,NEW.captain,'reward',NEW.updated_at);
END;
CREATE TRIGGER IF NOT EXISTS fantasy_ideal_adjust AFTER UPDATE ON fantasy_ideal_rewards WHEN NEW.amount_cents!=OLD.amount_cents BEGIN
 INSERT INTO fantasy_ideal_reward_events(league_id,uid,week,player_id,amount_cents,captain,kind,created_at) VALUES(NEW.league_id,NEW.uid,NEW.week,NEW.player_id,NEW.amount_cents-OLD.amount_cents,NEW.captain,'adjustment',NEW.updated_at);
END;
CREATE TRIGGER IF NOT EXISTS fantasy_ideal_credit AFTER INSERT ON fantasy_ideal_reward_events BEGIN
 UPDATE fantasy_wallet_cents SET delta_cents=delta_cents+NEW.amount_cents WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallet_values SET delta_tenths=(SELECT delta_cents/10.0 FROM fantasy_wallet_cents v WHERE v.league_id=NEW.league_id AND v.uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallets SET delta_units=(SELECT delta_cents/50.0 FROM fantasy_wallet_cents v WHERE v.league_id=NEW.league_id AND v.uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
END;
-- Cambio de regla desde la jornada de la semana del 09/11/2026; no modifica actas ni onces.
UPDATE fantasy_leagues SET settings_json=json_set(settings_json,'$.points.idealXI',0) WHERE NOT EXISTS(SELECT 1 FROM fantasy_reward_migrations WHERE id='ideal-cash-and-mvp-close-2026-11-15');
UPDATE fantasy_prize_state SET fingerprint=NULL,next_at=0 WHERE NOT EXISTS(SELECT 1 FROM fantasy_reward_migrations WHERE id='ideal-cash-and-mvp-close-2026-11-15');
INSERT OR IGNORE INTO fantasy_reward_migrations VALUES('ideal-cash-and-mvp-close-2026-11-15');
CREATE TABLE IF NOT EXISTS fantasy_club_round_closures(week INTEGER PRIMARY KEY,closed_at INTEGER NOT NULL);
