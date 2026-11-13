CREATE TABLE IF NOT EXISTS fantasy_salary_policy(id INTEGER PRIMARY KEY CHECK(id=1),settings_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO fantasy_salary_policy VALUES(1,'{"baseCents":null,"voteCents":0,"winCents":0,"drawCents":0,"extraTeamCents":0}',0);
CREATE TABLE IF NOT EXISTS fantasy_managers(league_id TEXT NOT NULL,uid TEXT NOT NULL,coach_id TEXT NOT NULL,selected_at INTEGER NOT NULL,change_at INTEGER NOT NULL,initialized_at INTEGER NOT NULL,presentation_seen INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(league_id,uid),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
CREATE TABLE IF NOT EXISTS fantasy_coach_contracts(id TEXT PRIMARY KEY,league_id TEXT NOT NULL,uid TEXT NOT NULL,coach_id TEXT NOT NULL,salary_cents INTEGER NOT NULL CHECK(salary_cents>=0),starts_at INTEGER NOT NULL,ends_at INTEGER,FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
CREATE TABLE IF NOT EXISTS fantasy_salary_charges(contract_id TEXT NOT NULL,week INTEGER NOT NULL,league_id TEXT NOT NULL,uid TEXT NOT NULL,amount_cents INTEGER NOT NULL,PRIMARY KEY(contract_id,week));
CREATE TRIGGER IF NOT EXISTS fantasy_salary_debit AFTER INSERT ON fantasy_salary_charges BEGIN
 UPDATE fantasy_wallet_cents SET delta_cents=delta_cents-NEW.amount_cents WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallet_values SET delta_tenths=(SELECT delta_cents/10.0 FROM fantasy_wallet_cents v WHERE v.league_id=NEW.league_id AND v.uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallets SET delta_units=(SELECT delta_cents/50.0 FROM fantasy_wallet_cents v WHERE v.league_id=NEW.league_id AND v.uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_roster_max BEFORE INSERT ON fantasy_roster WHEN EXISTS(SELECT 1 FROM fantasy_managers WHERE league_id=NEW.league_id AND uid=NEW.uid) BEGIN SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.uid)>=16 THEN RAISE(ABORT,'FANTASY_ROSTER_MAX') END; END;
CREATE TRIGGER IF NOT EXISTS fantasy_roster_min BEFORE DELETE ON fantasy_roster WHEN EXISTS(SELECT 1 FROM fantasy_managers WHERE league_id=OLD.league_id AND uid=OLD.uid) BEGIN SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=OLD.league_id AND uid=OLD.uid)<=12 THEN RAISE(ABORT,'FANTASY_ROSTER_MIN') END; END;
CREATE TABLE IF NOT EXISTS fantasy_lineups(league_id TEXT NOT NULL,uid TEXT NOT NULL,week INTEGER NOT NULL,players_json TEXT NOT NULL,captain_id TEXT NOT NULL,coach_id TEXT NOT NULL,deadline_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(league_id,uid,week),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
CREATE TABLE IF NOT EXISTS fantasy_favourites(league_id TEXT NOT NULL,uid TEXT NOT NULL,player_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(league_id,uid,player_id),FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid));
CREATE TABLE IF NOT EXISTS fantasy_market_notices(id TEXT PRIMARY KEY,league_id TEXT NOT NULL,uid TEXT NOT NULL,player_id TEXT NOT NULL,listing_id TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,seen INTEGER NOT NULL DEFAULT 0,push_queued INTEGER NOT NULL DEFAULT 0,UNIQUE(league_id,uid,player_id,listing_id));
CREATE TABLE IF NOT EXISTS fantasy_market_push_jobs(notice_id TEXT NOT NULL,token_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,claimed_at INTEGER,ticket TEXT,PRIMARY KEY(notice_id,token_id));
CREATE TABLE IF NOT EXISTS fantasy_awards(match_id TEXT NOT NULL,team_id TEXT NOT NULL,week INTEGER NOT NULL,player_id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN('mvp','idealXI')),PRIMARY KEY(match_id,team_id,player_id,kind));
CREATE UNIQUE INDEX IF NOT EXISTS fantasy_ideal_once ON fantasy_awards(week,player_id) WHERE kind='idealXI';
CREATE TABLE IF NOT EXISTS fantasy_offer_days(league_id TEXT NOT NULL,uid TEXT NOT NULL,day INTEGER NOT NULL,offer_id TEXT NOT NULL UNIQUE,PRIMARY KEY(league_id,uid,day));
CREATE TABLE IF NOT EXISTS fantasy_live_matches(team_id TEXT NOT NULL,match_id TEXT NOT NULL,payload TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(team_id,match_id));
CREATE TABLE IF NOT EXISTS fantasy_sync_state(id INTEGER PRIMARY KEY CHECK(id=1),next_at INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO fantasy_sync_state(id) VALUES(1);

CREATE TRIGGER IF NOT EXISTS fantasy_trade_update_lineup AFTER INSERT ON fantasy_trades WHEN NEW.seller_uid IS NOT NULL BEGIN
 UPDATE fantasy_lineups SET players_json=COALESCE((SELECT json_group_array(value) FROM json_each(players_json) WHERE value!=NEW.player_id),'[]'),captain_id=CASE WHEN captain_id=NEW.player_id THEN '' ELSE captain_id END,revision=revision+1 WHERE league_id=NEW.league_id AND uid=NEW.seller_uid AND deadline_at>NEW.created_at;
END;
CREATE TABLE IF NOT EXISTS fantasy_coach_changes(league_id TEXT NOT NULL,uid TEXT NOT NULL,previous_selected_at INTEGER NOT NULL,changed_at INTEGER NOT NULL,PRIMARY KEY(league_id,uid,previous_selected_at));
CREATE TABLE IF NOT EXISTS fantasy_live_schedule(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fantasy_award_changes(previous_revision INTEGER PRIMARY KEY,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS fantasy_source_checks(team_id TEXT NOT NULL,match_id TEXT NOT NULL,next_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(team_id,match_id));
CREATE TABLE IF NOT EXISTS fantasy_original_schedule(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fantasy_salary_state(league_id TEXT PRIMARY KEY,last_week INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS fantasy_salary_league ON fantasy_salary_charges(league_id,contract_id,week);
CREATE TABLE IF NOT EXISTS fantasy_market_policy(league_id TEXT PRIMARY KEY,version INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS fantasy_favourite_player ON fantasy_favourites(league_id,player_id);
CREATE INDEX IF NOT EXISTS fantasy_notice_user ON fantasy_market_notices(league_id,uid,created_at);
CREATE INDEX IF NOT EXISTS fantasy_push_queue ON fantasy_market_push_jobs(status,next_at);
